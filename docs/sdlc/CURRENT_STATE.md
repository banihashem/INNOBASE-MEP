# MEP-light™ — Canonical Current State

> **Single source of truth for the current production and staging state.**
> Other documents reference this file rather than duplicating current-state metadata.
> Last updated: 2026-07-13

---

## Product Identity

| Field | Value |
|-------|-------|
| **Product** | MEP-light™ |
| **Application version** | 4.3.7 |
| **Demo scenario** | MEP-light Demo Scenario v0.2 |
| **Client-facing label** | MEP-light Beta Demo v1.6 |
| **Product mode** | `free-demo` |
| **Default user role** | Demo Participant (`demo_participant`) |
| **Administrator** | `ehsan.banihashem@gmail.com` |

---

## Authoritative Source

| Field | Value |
|-------|-------|
| **Source branch** | `feature/demo-scenario-v0.2-step5-generated-state-cure` |
| **Authoritative source commit** | `efd61c6eaad22cfdc075a1044c3975b762bb9330` |

---

## Production

| Field | Value |
|-------|-------|
| **Closure verdict** | PRODUCTION-CLOSED-PASS |
| **Hygiene verdict** | PRODUCTION-CLOSURE-HYGIENE-PASS |
| **Production URL** | https://mep.innobase.app |
| **Cloud Run service** | `market-entry-prioritizer` |
| **Cloud Run region** | `europe-west2` |
| **Current Production revision** | `market-entry-prioritizer-00042-s4m` |
| **Traffic** | 100% → `market-entry-prioritizer-00042-s4m` |
| **Immediate rollback revision** | `market-entry-prioritizer-00041-dqw` |
| **Secondary fallback revision** | `market-entry-prioritizer-00040-x7z` |

---

## Staging

| Field | Value |
|-------|-------|
| **Staging service** | `mep-light-demo-refinement-staging` |
| **Current Staging revision** | `mep-light-demo-refinement-staging-00011-c4d` |
| **Staging source commit** | `efd61c6eaad22cfdc075a1044c3975b762bb9330` |

---

## Validated Capabilities

The following were validated at Production closure:

- Technical Production deployment
- Production health and authentication configuration
- Google login
- Demo Participant role
- Administrator retention
- PostgreSQL persistence and resume
- New Market Entry flow
- Existing Market Expansion flow
- Step 3 no-default strategy state
- Step 5 generated scores without manual adjustment
- Generated-score persistence across market switching, autosave, refresh, and resume
- Confidence synchronization
- Coming Soon sector gating
- Market edit and rename
- Step 6 dashboard
- Step 7 roadmap
- Export Brief
- Full Report and Step 8 gating
- POST session 201
- PATCH session 200
- No PATCH 503 regression
- Production Demo Participant smoke
- Production Administrator regression
- Final local workspace hygiene

---

## Key Cured Defects (This Release Cycle)

| Defect | Status |
|--------|--------|
| Step 5 generated-score state not persisting | Cured (`efd61c6`) |
| PATCH HTTP 503 regression | Cured (v4.3.7) |
| Placeholder Client ID in production bundle | Cured (v4.1.1) |
| PDF export 401 authorization | Cured (v4.3.6) |
| Demo identity reachable in production | Cured (v4.1.1) |

---

## Extension QA Model

Browser Extension QA results are produced and reviewed in the chat session.
They are **not** committed to the product repository.
Automated tests (TypeScript, Python, governance) are the repository test evidence.

---

## Rollback Guidance

### Immediate rollback (< 1 minute)

```bash
gcloud run services update-traffic market-entry-prioritizer \
  --region=europe-west2 \
  --to-revisions=market-entry-prioritizer-00041-dqw=100
```

### Secondary fallback

```bash
gcloud run services update-traffic market-entry-prioritizer \
  --region=europe-west2 \
  --to-revisions=market-entry-prioritizer-00040-x7z=100
```

### Post-rollback verification

1. `GET /api/health` returns `status: "healthy"`
2. `GET /api/v2/db/health` returns `ok: true`
3. Google login at `https://mep.innobase.app`
4. Session persistence works (POST 201, PATCH 200)
5. Runtime SHA matches expected revision source

---

## Non-Blocking Backlog

1. **Cloud Build `VITE_BUILD_SHA` pass-through**: The standard Production `cloudbuild.yaml` does not yet pass the full `VITE_BUILD_SHA` into the Docker build. The successful Production deployment used a temporary uncommitted deployment configuration, which was removed afterward. This requires correction and Staging validation before the next Production release.

2. **Migration endpoint security review**: Review and either secure, disable, remove, or formally close the potential public endpoint `/api/v2/db/run-migration/:name`. Migration execution should not be exposed as an unrestricted public API.

3. **Demo Step 5 to Step 6 behavior**: Document the observed behavior for demo accounts when the confidence cap limits navigation from Step 5 to Step 6.

---

## Next-Release Considerations

- Fix `cloudbuild.yaml` to pass `VITE_BUILD_SHA=$COMMIT_SHA` into the Docker build arg
- Validate the Cloud Build pipeline fix on Staging before next Production deploy
- Address migration endpoint security
- Consider Step 5→6 confidence-cap UX documentation

---

## Project Memory for Agent Continuity

A future agent continuing this project should know:

1. The **authoritative source commit** is `efd61c6eaad22cfdc075a1044c3975b762bb9330` on branch `feature/demo-scenario-v0.2-step5-generated-state-cure`.
2. Production and Staging are both deployed from this commit.
3. The **no-evidence-repository rule** applies: browser Extension QA results stay in chat, not in `docs/sdlc/evidence/`.
4. The `docs/sdlc/evidence/` directory contains historical evidence from prior development activities and must not be modified or extended during documentation-only activities.
5. The `vite.config.ts` `__BUILD_LABEL__` value is a non-functional metadata tag used for runtime identification. It does not affect behavior but should be updated when the build label changes.
6. The Production `cloudbuild.yaml` backlog item (missing `VITE_BUILD_SHA`) must be fixed before the next Production Cloud Build deploy; the staging pipeline (`cloudbuild-staging.yaml`) already includes it correctly.
7. All v0.2 Demo Scenario work (gap matrix, implementation report, test report) is now deployed and no longer "Unreleased".
