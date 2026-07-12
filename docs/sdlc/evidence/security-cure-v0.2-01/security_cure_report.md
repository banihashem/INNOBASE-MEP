# MEP-light™ Demo Scenario v0.2 — Security Cure Evidence Report
# DEVELOPER-CURE-EVIDENCE — NOT INDEPENDENT QA

## Candidate Identity

| Field | Value |
|-------|-------|
| Branch | `feature/demo-scenario-v0.2-security-cure-01` |
| Parent Source Commit | `4b446be34480d1558c11984363356b7599472124` |
| Date | 2026-07-12 |
| Executor | Security Cure technical executor (not independent QA) |

## Defects Cured (This Activity)

### SEC-01: Public Migration Endpoint Removal
- **Before**: `/api/v2/db/run-migration/:name` executed SQL migrations directly when accessed via public internet. The Staging deployment failed because Cloud Run does not support URL-path-based identity verification without deploying an intermediate API Gateway.
- **After**: The endpoint functionality has been removed. It now serves a static `403 Forbidden` response: `{"error":"Migration execution via public web route is disabled. Use the deployment pipeline."}`.
- **Verification**: `test:security-cure` verifies that both GET and POST return HTTP 403 or 404, failing safely closed.

### SEC-02: Cryptographically Verified JWT Enforcement
- **Before**: API endpoints used `extractJwtUser` which decoded the token payloads using standard base64 decoding but failed to verify cryptographic signatures. The JWT fallback handler implicitly permitted arbitrary identities. 
- **After**: `extractJwtUser` has been completely deleted. All 13+ protected API routes now strictly call `extractAndVerifyJwtUser`, which validates the token against Google's JWKS. The fallback allowing decode-only JWTs was purged from `verifyGoogleJwt`.
- **Verification**: `test:security-cure` explicitly validates that missing, malformed, expired, unsigned, mis-issued, and wrong-audience tokens all result in an HTTP 401 Unauthorized status.

## Gate Matrix Verification

The mandated code-quality, test, and typing gates have been executed successfully on the local candidate.

- `npm run build`: PASS
- `npx tsc --noEmit`: PASS
- `npm run test:all`: PASS (Including all integration, unit, and auth regression tests)
- `python -m pytest`: PASS (133 parity tests passed)
- `git diff --check`: PASS (No trailing whitespace issues)
- `npm run test:security-cure`: PASS (8/8 specialized security tests passed)

## Final Output

The security vulnerabilities are closed. The code has been secured locally and is strictly verified by native tests to prevent unauthenticated access. 
