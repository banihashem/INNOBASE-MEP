# MEP-light™ — SDLC Governance

## Canonical Resources

| Resource | Location | Purpose |
|----------|----------|---------|
| **GitHub Repo** | [banihashem/INNOBASE-MEP](https://github.com/banihashem/INNOBASE-MEP) | Source of truth |
| **Cloud Run (App)** | `market-entry-prioritizer` (europe-west2) | Frontend + Node.js API |
| **Cloud Run (PDF)** | `mep-light-pdf-service` (europe-west2) | Python PDF generator |
| **GCP Project** | `innobase-mep-light` | All cloud resources |
| **AI Studio** | [App Preview](https://aistudio.google.com/apps/b9f591d8-fdd2-4449-bed4-309134a9fc91) | AI Studio integration |
| **Custom Domain** | https://mep.innobase.app | Public-facing URL (Cloudflare) |
| **Cloud Run URL** | https://market-entry-prioritizer-52156375400.europe-west2.run.app | Origin (behind Cloudflare) |
| **Cloudflare Worker** | `mep-proxy` (Workers & Pages) | Reverse proxy: mep.innobase.app → Cloud Run |
| **Cloudflare DNS** | `mep` CNAME → Cloud Run (Proxied) | DNS routing via Cloudflare |

---

## Architecture (v3.0)

```
┌────────────────────────────────────────────────────────────┐
│                    Cloudflare Edge                          │
│   mep.innobase.app → Worker → Cloud Run origin            │
└────────────┬───────────────────────────────────────────────┘
             │
┌────────────▼───────────────────────────────────────────────┐
│  Cloud Run: market-entry-prioritizer                       │
│  ┌──────────────────────┐  ┌─────────────────────────────┐ │
│  │  Express.js Server   │  │  React SPA (Static Assets)  │ │
│  │  ├─ /api/health      │  │  ├─ AuthProvider            │ │
│  │  ├─ /api/score       │  │  ├─ ToastProvider           │ │
│  │  ├─ /api/export-pdf  │  │  ├─ ErrorBoundary           │ │
│  │  ├─ /api/telemetry   │  │  ├─ LandingPage (public)    │ │
│  │  └─ Request ID MW    │  │  └─ Wizard (authenticated)  │ │
│  └──────────────────────┘  └─────────────────────────────┘ │
│       │ proxy                                               │
│  ┌────▼─────────────────────────────────────────────────┐  │
│  │  Cloud Run: mep-light-pdf-service                    │  │
│  │  Python ReportLab PDF generator                      │  │
│  └──────────────────────────────────────────────────────┘  │
└────────────────────────────────────────────────────────────┘
```

### Frontend Stack
| Layer | Technology |
|-------|-----------|
| Framework | React 19 + TypeScript |
| Build | Vite 6 + Code Splitting |
| Styling | Tailwind CSS 4 |
| Auth | AuthProvider (Google OIDC-ready) |
| State | useState + localStorage (usePersistedState) |
| Error Handling | ErrorBoundary + Toast system |
| Telemetry | Batched events (sendBeacon) |
| API Client | Typed fetch with retry + backoff |

### Backend Stack
| Layer | Technology |
|-------|-----------|
| Server | Express.js (TypeScript) |
| Scoring | Deterministic 9-dimension engine |
| PDF | Python ReportLab (separate service) |
| Middleware | Request ID, Response timing, CORS |
| Telemetry | Structured JSON logging |

---

## Development Workflow

```
┌────────────────────────────────────────────────┐
│  1. DEVELOP (Local)                            │
│     npm run dev → http://localhost:3000         │
│     npm run api → http://localhost:3001         │
│     npm run pdf-service → http://localhost:5001 │
└────────────────┬───────────────────────────────┘
                 │
                 ▼
┌────────────────────────────────────────────────┐
│  2. TEST (Local)                               │
│     npm run build   → TypeScript + Vite build  │
│     npm test        → 108 scoring engine       │
│     npm run test:prep → 23 product prep        │
│     npm run test:all → Full suite (131 tests)  │
└────────────────┬───────────────────────────────┘
                 │
                 ▼
┌────────────────────────────────────────────────┐
│  3. COMMIT & PUSH                              │
│     git add -A                                 │
│     git commit -m "type(scope): message"       │
│     git push origin master                     │
│     → pushes to banihashem/INNOBASE-MEP        │
└────────────────┬───────────────────────────────┘
                 │
                 ▼
┌────────────────────────────────────────────────┐
│  4. DEPLOY (Cloud Run)                         │
│     gcloud run deploy market-entry-prioritizer │
│       --source=.                               │
│       --region=europe-west2                    │
│       --allow-unauthenticated                  │
│       --port=8080                              │
│       --memory=512Mi                           │
│       --timeout=300                            │
│       --set-env-vars="..."                     │
└────────────────┬───────────────────────────────┘
                 │
                 ▼
┌────────────────────────────────────────────────┐
│  5. VERIFY (Production)                        │
│     Check mep.innobase.app loads               │
│     Verify version badge matches package.json  │
│     Test auth flow (Sign In → Wizard)          │
│     Test PDF download end-to-end               │
│     Test session persistence (refresh)         │
│     Check telemetry in Cloud Run logs          │
└────────────────────────────────────────────────┘
```

---

## Environment Variables (Cloud Run)

### `market-entry-prioritizer` service
| Variable | Value |
|----------|-------|
| `NODE_ENV` | `production` |
| `PDF_SERVICE_URL` | `https://mep-light-pdf-service-52156375400.europe-west2.run.app` |

### `mep-light-pdf-service` service
| Variable | Value |
|----------|-------|
| `PORT` | `8080` |

---

## Versioning

- Version is defined in `package.json` → `version` field
- At build time, Vite injects it as `__APP_VERSION__` via `vite.config.ts`
- The header badge displays `v{version}` automatically
- Footer displays version in the copyright line
- **To release a new version:** bump `package.json` version → commit → deploy

---

## Commit Message Convention

```
type(scope): description

Types: feat, fix, refactor, docs, test, chore
Scope: app, scoring, pdf, types, ui, deploy, auth, telemetry
```

---

## Quick Deploy Commands

```bash
# Full deploy (rebuild from source)
gcloud run deploy market-entry-prioritizer \
  --source=. \
  --region=europe-west2 \
  --allow-unauthenticated \
  --port=8080 \
  --set-env-vars="NODE_ENV=production,PDF_SERVICE_URL=https://mep-light-pdf-service-52156375400.europe-west2.run.app" \
  --memory=512Mi \
  --timeout=300

# PDF service only (if pdf_generator.py changed)
gcloud run deploy mep-light-pdf-service \
  --source=./backend/pdf_service \
  --region=europe-west2 \
  --allow-unauthenticated \
  --port=8080 \
  --memory=512Mi
```

---

## Key Files (v3.0)

### Frontend
| File | Purpose |
|------|---------|
| `src/App.tsx` | Root app with AuthProvider, ToastProvider, ErrorBoundary |
| `src/lib/auth.tsx` | Google OIDC auth context + JWT helpers |
| `src/lib/apiClient.ts` | Typed API client with retry logic |
| `src/lib/telemetry.ts` | Frontend event tracking |
| `src/hooks/usePersistedState.ts` | localStorage persistence + session index |
| `src/components/Toast.tsx` | Toast notification system |
| `src/components/ErrorBoundary.tsx` | React error boundary |
| `src/components/SessionManager.tsx` | Session resume/new/delete modal |
| `src/components/StepSkeleton.tsx` | Loading skeleton for lazy-loaded steps |
| `src/components/LandingPage.tsx` | Public landing page |

### Backend
| File | Purpose |
|------|---------|
| `backend/src/api_server.ts` | Express API (scoring, PDF proxy, telemetry) |
| `backend/src/scoring_engine.ts` | Deterministic 9D scoring |
| `backend/src/confidence.ts` | Confidence framework |
| `backend/src/data_models.ts` | TypeScript types |

---

## Monitoring & Observability

### Frontend Telemetry Events
| Event | Trigger |
|-------|---------|
| `sign_in` | User authenticates via Google |
| `sign_out` | User signs out |
| `session_started` | New session created |
| `session_resumed` | Past session resumed |
| `step_completed` | Wizard step completed |
| `step_navigated` | User navigates between steps |
| `pdf_exported` | PDF download attempted |
| `session_auto_saved` | Session auto-saved |
| `error_occurred` | Component error caught |

### Backend Observability
| Feature | Implementation |
|---------|---------------|
| Request IDs | `X-Request-ID` header on all responses |
| Slow requests | Console warning for >1s responses |
| Telemetry ingestion | `POST /api/telemetry` → structured JSON logs |
| Health check | `GET /api/health` → version + status |

---

## Retired Resources

| Resource | Status | Reason |
|----------|--------|--------|
| `mep-light-app` (Cloud Run) | **Deleted** | Duplicate of `market-entry-prioritizer` |
| `Market-Entry-Prioritizer` (GitHub) | **Archived** | Migrated to `INNOBASE-MEP` |
