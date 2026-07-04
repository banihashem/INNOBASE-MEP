import fs from 'fs';
import path from 'path';

let passed = 0;
let failed = 0;

function assert(condition: boolean, message: string): void {
  if (condition) {
    console.log(`  ✓ ${message}`);
    passed++;
  } else {
    console.log(`  ✗ ${message}`);
    failed++;
  }
}

console.log("\n" + "─".repeat(60));
console.log("  MEP-light™ — Bundle Build Guard Regression Test Suite");
console.log("─".repeat(60) + "\n");

try {
  // 1. Verify Dockerfile contains strict guards
  const dockerfilePath = path.join(process.cwd(), 'Dockerfile');
  const dockerfile = fs.readFileSync(dockerfilePath, 'utf-8');

  assert(dockerfile.includes('grep -q " "'), "Dockerfile fails build if GOOGLE_CLIENT_ID contains whitespace");
  assert(dockerfile.includes('grep -q "_CLOUD_SQL"'), "Dockerfile fails build if GOOGLE_CLIENT_ID contains _CLOUD_SQL");
  assert(dockerfile.includes('grep -q "_ADK"'), "Dockerfile fails build if GOOGLE_CLIENT_ID contains _ADK");
  assert(dockerfile.includes('grep -q "\\.apps\\.googleusercontent\\.com$"'), "Dockerfile fails build if GOOGLE_CLIENT_ID lacks proper suffix");
  assert(dockerfile.includes('grep -rq "$GOOGLE_CLIENT_ID" dist/assets/*.js'), "Dockerfile post-build checks bundle for EXACT Client ID");
  assert(dockerfile.includes('grep -r "consultant@innobase.app"'), "Dockerfile post-build checks bundle for demo identity leak");

  // 2. Verify cloudbuild.yaml contains strict guards
  const cloudbuildPath = path.join(process.cwd(), 'cloudbuild.yaml');
  const cloudbuild = fs.readFileSync(cloudbuildPath, 'utf-8');
  assert(cloudbuild.includes('grep -q " "'), "cloudbuild.yaml fails if _GOOGLE_CLIENT_ID contains whitespace");
  assert(cloudbuild.includes('grep -q "\\.apps\\.googleusercontent\\.com$"'), "cloudbuild.yaml fails if _GOOGLE_CLIENT_ID lacks suffix");

} catch (err) {
  console.error("Test execution failed:", err);
  process.exit(1);
}

console.log("\n" + "─".repeat(60));
console.log("  BUNDLE REGRESSION TEST SUMMARY");
console.log("─".repeat(60) + "\n");
console.log(`  Total: ${passed + failed}  Passed: ${passed}  Failed: ${failed}\n`);

if (failed > 0) {
  process.exit(1);
} else {
  console.log("  ╔══════════════════════════════════════════════════╗");
  console.log("  ║  ✓ ALL BUNDLE REGRESSION TESTS PASSED            ║");
  console.log("  ╚══════════════════════════════════════════════════╝\n");
}
