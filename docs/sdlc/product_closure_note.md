# MEP-light™ — Product Closure Note (v4.3.7)

**Date**: 2026-07-13
**Version**: 4.3.7
**Status**: PRODUCTION-CLOSED-PASS
**Independent Smoke**: PRODUCTION-SMOKE-PASS
**Tag**: v4.3.7-demo-refinement
**Canonical Current State**: See [CURRENT_STATE.md](CURRENT_STATE.md)

---

## Release Summary

MEP-light™ v4.3.7 is the Demo Refinement Sprint production release. It introduces the Demo Participant role and free-demo product mode, enabling external users to experience a 7-step market entry assessment workflow without access to consultant-grade features.

## Final Release Identity

- **Authoritative Source Commit**: `efd61c6eaad22cfdc075a1044c3975b762bb9330`
- **Source Branch**: `feature/demo-scenario-v0.2-step5-generated-state-cure`
- **v4.3.7 Initial Release Commit**: `320fcc1e3a6f8ff3aecafa69d8207b04feb85d53`
- **Exact Tag Target SHA**: `320fcc1e3a6f8ff3aecafa69d8207b04feb85d53`
- **Cloud Run Service**: `market-entry-prioritizer`
- **Region**: `europe-west2`
- **Current Production Revision**: `market-entry-prioritizer-00042-s4m`
- **Immediate Rollback Revision**: `market-entry-prioritizer-00041-dqw`
- **Secondary Fallback Revision**: `market-entry-prioritizer-00040-x7z`
- **Production URL**: `https://mep.innobase.app`
- **Staging Service**: `mep-light-demo-refinement-staging`
- **Staging Revision**: `mep-light-demo-refinement-staging-00011-c4d`

## What's New

### Demo Participant Role
- New RBAC role: `demo_participant` — auto-provisioned on first Google OAuth login
- Product mode: `free-demo` — isolated from consultant/admin workflows
- Client-facing label: **MEP-light Beta Demo v1.6**

### 7-Step Demo Experience
- Steps 1–7 fully functional for Demo Participant
- Step 8 (Entry Readiness Workspace) locked with upgrade prompt
- Full PDF/Report export locked with upgrade prompt
- Human Review approval/flagging unavailable
- Consultant Workspace / Annotation Pad hidden

### Scoring & Evidence
- Generate Draft Scores: deterministic pre-loaded scores for UAE/Iraq/Germany
- User Adjusted badge: visible when manual score changes are made
- Evidence confidence: deterministic recomputation from per-dimension evidence sources
- Custom markets supported (no pre-loaded scores)

### Admin Governance (Security)
- Self-demotion prevention: Administrator cannot change own role
- Last-admin preservation: last Administrator cannot be demoted or deleted
- Audit logging for blocked governance actions

### Session Persistence
- Autosave via PATCH /api/v2/sessions/:id (2s debounce)
- Refresh persistence via stateSnapshot
- Session resume from SessionManager modal
- Loading state prevents "No previous sessions" flicker

### Infrastructure & Migration
- Migration 005 (`005_add_demo_participant_role`): Applied successfully via Cloud Run Job during production deploy. Verification was through the governed deployment pipeline evidence.
- *Note: No migration was executed during this closure activity. Migration execution must remain pipeline/Job-controlled rather than exposed through a public API.*

## Production Smoke Summary
Independent production smoke verification (PRODUCTION-SMOKE-PASS) confirmed:
- Application loads successfully at `https://mep.innobase.app`.
- `innobaseae@gmail.com` correctly operates as Demo Participant (`demo_participant`) in `free-demo` mode.
- Administrator account (`ehsan.banihashem@gmail.com`) remains protected and was not demoted.
- Session POST/PATCH operations are stable, and the prior PATCH HTTP 503 defect has not returned.
- Demo restrictions are fully active (Step 8 locked, Full Report locked, Human Review unavailable, Consultant/Admin UI unavailable).
- Client-facing labels are correct (Step 5 heading is "Strategic Metric Scoring", Export Brief label is "MEP-light Beta Demo v1.6", missing the obsolete Version 1.4.0).
- No rollback is required.
- This final closure activity was strictly docs-only.

## Known Non-Blocking Follow-ups

1. **Cloud Build `VITE_BUILD_SHA` pass-through**: The standard Production `cloudbuild.yaml` does not yet pass the full `VITE_BUILD_SHA` into the Docker build. The successful Production deployment used a temporary uncommitted deployment configuration, which was removed afterward. This requires correction and Staging validation before the next Production release.
2. **Demo Step 5 to Step 6 behavior**: Document the observed behavior for demo accounts when the confidence cap prevents or limits "Continue" from Step 5 to Step 6. Clarify whether this limitation is intentional, required UX or product documentation, and whether an explanatory message should be added in a future change.
3. **Migration endpoint security review**: Review and either secure, disable, remove, or formally close the potential public endpoint: `/api/v2/db/run-migration/:name`. Database migrations should be performed only through the governed deployment pipeline or an authorized Cloud Run Job. Migration execution should not be exposed as an unrestricted public API. This requires a separate security/code activity and separate authorization.

## Formal Closure Statement
MEP-light™ v4.3.7 with Demo Scenario v0.2 is formally closed as PRODUCTION-CLOSED-PASS with independent production verification status PRODUCTION-SMOKE-PASS. No rollback is required. Remaining items are non-blocking follow-ups and do not affect production acceptance.
