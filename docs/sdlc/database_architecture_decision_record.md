# MEP-light™ — Database Architecture Decision Record (ADR)

**ADR ID**: ADR-004  
**Status**: Accepted  
**Date**: 2026-07-03  
**Decision Makers**: Principal Product Architect, INNOBASE Engineering  
**Supersedes**: Implicit SQLite-on-Cloud-Run architecture  

---

## 1. Context & Problem Statement

MEP-light™ currently uses two non-durable persistence mechanisms in production:

1. **In-memory `Map<string, UserRecord>`** in the Express/TypeScript API server — all user records are lost on every Cloud Run cold start, restart, or deployment.
2. **SQLite via `better-sqlite3`** stored at `/tmp/mep-data/mep.db` on Cloud Run — sessions, audit events, and related data are written to the instance-local ephemeral filesystem, which is not shared across instances and is wiped on cold starts.

Neither mechanism provides the durability, consistency, or availability guarantees required for a production market-entry decision-support platform.

The platform requires a durable, production-grade Google Cloud-native database to persist:
- User identities and RBAC roles
- Client company profiles
- Assessment sessions with FSM state
- 9-dimension scoring results and tier classifications
- Evidence items with confidence classifications
- Assumption and risk cards
- Validation roadmap actions
- Report metadata and export records
- Immutable audit trail
- ADK agent execution runs and artifacts

---

## 2. Decision Drivers

| Driver | Weight | Description |
|--------|--------|-------------|
| **Durability** | Critical | Data must survive restarts, deployments, and instance cycling |
| **Relational Integrity** | Critical | Scoring, evidence, sessions require foreign key relationships |
| **Google Cloud Native** | High | Must integrate with Cloud Run, IAM, Secret Manager |
| **Cost Efficiency** | High | Early-stage product; budget must be controlled |
| **Operational Simplicity** | High | Small team; minimize operational overhead |
| **SQL Compatibility** | High | SQLAlchemy ORM already in use; PostgreSQL dialect preferred |
| **Future AI/Vector Search** | Medium | pgvector for RAG/evidence search is a future requirement |
| **Scalability** | Medium | Current workload is light; must not preclude future growth |
| **Multi-region** | Low | Single-region (europe-west2) sufficient for now |

---

## 3. Options Evaluated

### Option A — Cloud SQL for PostgreSQL

**Description**: Fully managed PostgreSQL on Google Cloud with automated backups, replication, patching, and high availability options.

| Criterion | Assessment |
|-----------|------------|
| Durability | ✅ Persistent SSD storage, automated backups, PITR |
| Relational Integrity | ✅ Full PostgreSQL with FK, CHECK, UNIQUE constraints |
| Cloud Run Integration | ✅ Cloud SQL Python Connector, Cloud SQL Auth Proxy, Unix socket |
| Cost | ✅ ~$7–25/month for db-f1-micro to db-custom-1-3840 |
| Operational Overhead | ✅ Low — fully managed, automated patching |
| SQLAlchemy Compatibility | ✅ Direct — psycopg2/pg8000 drivers, existing models work |
| pgvector Support | ✅ Available as extension since PostgreSQL 15 |
| Team Familiarity | ✅ Standard PostgreSQL — no proprietary APIs |
| HA Options | ✅ Regional HA available (adds cost) |

**Strengths**: Battle-tested, cost-effective, excellent Cloud Run integration, pgvector-ready.  
**Weaknesses**: Manual HA configuration; not as performant as AlloyDB for complex analytical queries.

### Option B — AlloyDB for PostgreSQL

**Description**: Google's high-performance, PostgreSQL-compatible database engine with integrated AI capabilities.

| Criterion | Assessment |
|-----------|------------|
| Durability | ✅ Enterprise-grade with 99.99% SLA |
| Relational Integrity | ✅ Full PostgreSQL wire protocol |
| Cloud Run Integration | ✅ AlloyDB Connector available |
| Cost | ⚠️ ~$100–300+/month minimum (significantly higher than Cloud SQL) |
| Operational Overhead | ✅ Fully managed |
| SQLAlchemy Compatibility | ✅ PostgreSQL compatible |
| pgvector Support | ✅ Integrated pgvector with ScaNN indexing (superior performance) |
| AI Integration | ✅ Built-in embedding generation, ML model serving |
| Performance | ✅ 4x faster than standard PostgreSQL for transactional workloads |

**Strengths**: Superior performance, best-in-class vector search, built-in AI features.  
**Weaknesses**: Significantly higher cost; overkill for current MEP-light™ workload.

### Option C — Firestore

**Description**: Serverless, NoSQL document database with real-time synchronization.

| Criterion | Assessment |
|-----------|------------|
| Durability | ✅ Multi-region replication, 99.999% SLA |
| Relational Integrity | ❌ No relational model; no JOINs, FK constraints |
| Cloud Run Integration | ✅ Native client libraries |
| Cost | ✅ Pay-per-use, very low at current scale |
| SQLAlchemy Compatibility | ❌ Incompatible — requires complete rewrite |
| pgvector Support | ❌ Not available |
| Data Model Fit | ❌ Poor — scoring with 9 dimensions, cross-entity relationships are relational |

**Strengths**: Zero-ops, real-time sync.  
**Weaknesses**: Not suitable for relational scoring/reporting data; requires complete ORM rewrite.

### Option D — Hybrid Architecture

**Description**: Cloud SQL for relational data + Firestore for transient state + Cloud Storage for artifacts.

**Assessment**: Appropriate for later phases, but introduces unnecessary complexity now.

---

## 4. Decision

### Selected: **Option A — Cloud SQL for PostgreSQL**

**Rationale**:

1. **Right-sized for current workload**: Cloud SQL provides enterprise durability at SME cost (~$10–25/month).
2. **Immediate compatibility**: Existing SQLAlchemy models require minimal changes.
3. **Cloud Run integration is production-proven**: Cloud SQL Python Connector handles IAM auth and TLS automatically.
4. **pgvector readiness**: Future RAG/evidence vector search without database migration.
5. **Cost control**: Starting at ~$10/month vs AlloyDB's $100+/month minimum.
6. **Operational simplicity**: Single database, single connection pattern.

### Future Upgrade Path

| Trigger | Action |
|---------|--------|
| Vector search exceeds Cloud SQL pgvector capacity | Evaluate AlloyDB |
| Real-time UI state sync required | Add Firestore for transient state |
| PDF/report artifacts need storage | Add Cloud Storage bucket |
| Analytics workload emerges | Add BigQuery export |

---

## 5. Implementation Specification

| Parameter | Value |
|-----------|-------|
| **Instance Name** | `mep-light-db` |
| **PostgreSQL Version** | 16 |
| **Region** | `europe-west2` (London) |
| **Machine Type** | `db-custom-1-3840` (1 vCPU, 3.75 GB RAM) |
| **Storage** | 10 GB SSD (auto-resize) |
| **Backups** | Daily, 7-day retention, PITR enabled |
| **Database Name** | `mep_production` |
| **Database User** | `mep_app` (least privilege) |
| **Connectivity** | Cloud SQL Python Connector + pg via Unix socket |
| **Credentials** | Secret Manager: `mep-db-password`, `mep-db-user` |
| **IAM** | Cloud Run SA gets `roles/cloudsql.client` |

---

## 6. Consequences

### Positive
- All production data survives restarts and deployments
- Relational integrity enforced at database level
- Standard PostgreSQL tooling for debugging
- Future vector search without migration
- Automated backups and PITR

### Negative
- Monthly cost (~$10–25) vs current $0
- Connection pooling must handle Cloud Run scale-to-zero

### Risks
- Cloud SQL provisioning may require IAM permissions
- Migration must preserve authentication flow
