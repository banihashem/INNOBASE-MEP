param (
    [string]$Project = "innobase-mep-light"
)

Write-Host "Starting safe deployment..."
# Extract GOOGLE_CLIENT_ID from .env
$envContent = Get-Content -Path "..\.env" -ErrorAction SilentlyContinue
if (-not $envContent) {
    $envContent = Get-Content -Path ".env" -ErrorAction SilentlyContinue
}

$googleClientIdLine = $envContent | Where-Object { $_ -match "^GOOGLE_CLIENT_ID=" }
if (-not $googleClientIdLine) {
    Write-Error "GOOGLE_CLIENT_ID not found in .env"
    exit 1
}

$googleClientId = $googleClientIdLine.Split('=')[1].Trim('"').Trim("'")

if ($googleClientId -match "\s") {
    Write-Error "GOOGLE_CLIENT_ID in .env contains whitespace."
    exit 1
}

$substitutions = "_GOOGLE_CLIENT_ID=$googleClientId,_CLOUD_SQL_CONN=innobase-mep-light:europe-west2:mep-light-db,_ADK_ENABLED=controlled"

Write-Host "Running gcloud builds submit..."
# Using --substitutions with a single fully-quoted string is safe from PS array unrolling
gcloud builds submit --config=cloudbuild.yaml --substitutions=$substitutions --project=$Project
