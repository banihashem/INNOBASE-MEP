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

## Development Workflow

```
┌────────────────────────────────────────────────┐
│  1. DEVELOP (Local)                            │
│     npm run dev → http://localhost:3000         │
│     npm run pdf-service → http://localhost:5001 │
└────────────────┬───────────────────────────────┘
                 │
                 ▼
┌────────────────────────────────────────────────┐
│  2. TEST (Local)                               │
│     npm run lint     → TypeScript type check   │
│     npm test         → 108 scoring engine      │
│     npm run test:prep → 23 product prep        │
│     npm run test:all → Full suite              │
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
│     Check production URL loads                 │
│     Verify version badge matches package.json  │
│     Test PDF download end-to-end               │
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
- **To release a new version:** bump `package.json` version → commit → deploy

---

## Commit Message Convention

```
type(scope): description

Types: feat, fix, refactor, docs, test, chore
Scope: app, scoring, pdf, types, ui, deploy
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

## Retired Resources

| Resource | Status | Reason |
|----------|--------|--------|
| `mep-light-app` (Cloud Run) | **Deleted** | Duplicate of `market-entry-prioritizer` |
| `Market-Entry-Prioritizer` (GitHub) | **Archived** | Migrated to `INNOBASE-MEP` |
