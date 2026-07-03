# MEP-light™ — Technical Design Document

**Version**: 4.0 | **Date**: 2026-07-03

---

## System Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                     Cloudflare (CDN/WAF)                     │
│                   mep.innobase.app → Cloud Run              │
└──────────────────────────┬──────────────────────────────────┘
                           │
┌──────────────────────────▼──────────────────────────────────┐
│                    Cloud Run Container                        │
│  ┌────────────────────┐    ┌─────────────────────────┐      │
│  │  Express/TypeScript │    │   FastAPI/Python         │      │
│  │  Port 8080 (Primary)│    │   Port 8000 (ADK)       │      │
│  │                    │    │                         │      │
│  │  • Static assets   │    │  • Scoring engine       │      │
│  │  • Auth (JWT/OIDC) │    │  • ADK agent service    │      │
│  │  • User CRUD       │    │  • Governance guard     │      │
│  │  • Session CRUD    │    │  • PDF generation       │      │
│  │  • Health checks   │    │  • RAG pipeline         │      │
│  │  • Audit logging   │    │                         │      │
│  └────────┬───────────┘    └──────────┬──────────────┘      │
│           │                           │                      │
│           └──────────┬────────────────┘                      │
│                      │                                       │
│              supervisord (process manager)                    │
└──────────────────────┬──────────────────────────────────────┘
                       │ Unix Socket
┌──────────────────────▼──────────────────────────────────────┐
│              Cloud SQL for PostgreSQL 16                      │
│              europe-west2 / Private IP                        │
│              13-entity schema                                │
└─────────────────────────────────────────────────────────────┘
```

## Key Design Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Database | Cloud SQL PostgreSQL | Managed, scalable, pgvector support |
| Dual runtime | Node.js + Python | TS for HTTP gateway, Python for ADK/ML |
| Process management | supervisord | Simple, reliable in single container |
| Auth | Google OIDC + JWKS | No custom token issuance |
| Feature flags | Environment variables | Simple, Cloud Run native |
| Audit trail | Database table | Queryable, durable, structured |

## Data Flow

1. **User → Browser**: React SPA served from `/dist`
2. **Browser → Express**: API calls with Google JWT in `Authorization: Bearer` header
3. **Express → db_client**: PostgreSQL queries via `pg` connection pool
4. **Express → FastAPI**: Internal proxy for `/api/v2/adk/*` routes (when ADK_ENABLED)
5. **FastAPI → Gemini API**: ADK agent LLM calls (when triggered)
6. **FastAPI → db_client (Python)**: SQLAlchemy ORM queries

## Security Layers

1. **Cloudflare**: DDoS, WAF, TLS termination
2. **Cloud Run**: No SSH, no persistent disk, auto-scaling
3. **Express**: CORS, JWKS verification, role checks
4. **Database**: Unix socket (no public IP), parameterized queries
5. **ADK**: Governance guard, human review gates, PII scanning
