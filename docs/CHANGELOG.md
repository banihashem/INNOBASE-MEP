# MEP-light™ — Changelog

All notable changes to the MEP-light™ system are documented in this file.

---

## [3.0.0] — 2026-07-01

### 🚀 Production-Ready Upgrade

Major upgrade transitioning MEP-light™ from MVP to production-grade software.

#### Architecture
- **AuthProvider**: Centralized authentication context (`AuthProvider` + `useAuth` hook) replacing ad-hoc `sessionStorage` checks
- **ToastProvider**: Global toast notification system (`success`, `warning`, `error`, `info` variants) replacing `alert()` calls
- **ErrorBoundary**: React error boundary wrapping the entire app with recovery UI
- **Code Splitting**: All 9 step components lazy-loaded via `React.lazy()` + `Suspense`

#### Performance
- Bundle split into 15 chunks (was single 369 KB file):
  - Main: 237 KB → 73 KB gzipped
  - Vendor (React): 3.9 KB
  - Icons (Lucide): 35.5 KB
  - Step components: 4-35 KB each (loaded on demand)
- Vite `manualChunks` configuration for optimal vendor separation

#### Session Persistence
- `usePersistedState` hook: debounced localStorage sync with schema versioning
- Session index: tracks up to 20 sessions with company name, step, completion %
- `SessionManager` modal: resume, create new, delete past sessions
- Auto-save every 3 seconds (debounced, non-blocking)

#### Observability
- Frontend telemetry: batched event tracking (`sendBeacon`), Do Not Track compliant
- Backend request ID middleware for log correlation
- Response time monitoring (>1s flagged as slow)
- Telemetry endpoint: `POST /api/telemetry`
- Structured JSON logging for all telemetry events

#### API Hardening
- `apiClient.ts`: typed HTTP client with 3-retry exponential backoff
- Request timeout handling (15s default, 30s for PDF)
- `ApiClientError` class with HTTP status codes
- Health check endpoint updated to v3.0.0

#### UX
- Session Manager button in header toolbar
- Animated step skeleton loader during lazy-load
- Toast notifications for save confirmations, errors, session actions

#### Verification
- 108 scoring engine tests: **PASS**
- 23 product prep tests: **PASS**
- Build: **zero errors**, 15 chunks produced
- Mathematical scoring integrity: **preserved**

---

## [2.0.0] — 2026-07-01

### 🚀 Landing Page & Auth Gate

- Premium dark-mode landing page with glassmorphism design
- Hero section with animated gradient orbs and floating score cards
- 6-card bento feature grid with micro-animations
- 3-step methodology flow: Define → Score → Decide
- Authentication gate: unauthenticated → landing page, authenticated → wizard
- Google Sign-In CTA with real OAuth flow preparation
- Deployed to `mep.innobase.app` via Cloudflare Worker reverse proxy

---

## [1.5.1] — 2026-07-01

### 🔧 Refactored — Sector-Agnostic Neutralization

Full-stack refactoring to remove all food-tech-specific content and establish sector-agnostic, professional, neutral strategic placeholders across every screen, backend, and test suite.

#### Global Replacements
- **"Alpha Food Tech"** → **"Client Company"** across all screens, state variables, and generated text
- **"Kashkam" / "Offering X"** → **"Selected Offering"** across all defaults and inputs
- **"Desk research / assumptions only"** → **"Expert Judgment"** as default evidence category
- **"Top Priority Target Market"** → **"Leading Validation Candidate"** with validation disclaimer
- **"Market Shortlist"** → **"Potential Markets"** (Step 4 heading)

#### Types & Constants (`types.ts`)
- Added `Market.type` field (`Country | Market Bloc | Region`)
- Replaced `EvidenceBasis` with 3 clean categories: `Direct Evidence`, `Market Reports`, `Expert Judgment`
- Replaced 5 food-specific strategy profiles with 3 universal models: `Core Offering Replication`, `Localized Offering Adaptation`, `Market-Specific Offering Development`
- Replaced 5 default markets (UAE/Iraq/Germany/Canada/Azerbaijan) with 3 neutral defaults: UAE (Country), EU (Market Bloc), North America (Region)
- Updated `DEMO_MARKET_SCORES`, `EVIDENCE_BASIS_SCORE_MAP`, and `DEFAULT_DIMENSION_EVIDENCE`

#### Screen-by-Screen Changes
- **Step 01 (Decision Setup):** Dynamic placeholder when fields incomplete, renamed heading to "Decision Statement", added helper caption
- **Step 02 (Company Snapshot):** Converted capabilities/constraints to textareas, rewritten context summary template
- **Step 03 (Product Strategy):** Removed Kashkam references, added complexity note below strategy cards, renamed labels
- **Step 04 (Potential Markets):** Market type badge display on cards
- **Step 05 (Score & Evidence):** Overall Confidence locked as read-only computed display with "(System-Computed)" label
- **Step 06 (Dashboard):** "Leading Validation Candidate" label with validation disclaimer text
- **Step 07 (Roadmap):** Strategy-aware entry pathways (3 branches), renamed PDF button and workspace CTA

#### New Components
- **`EntryReadinessWorkspace.tsx`** — 5-tab workspace replacing the old 3-tab `ProductPrepSpace`
- **`OfferingLocalizationTab.tsx`** — Product adaptation checklist + localization considerations
- **`ChannelPartnerTab.tsx`** — Partner identification + channel strategy assessment

#### Entry Readiness Workspace Tabs
1. Regulatory & Compliance (existing, retained)
2. Offering & Localization (**new**)
3. Packaging / Delivery / Operations (existing, retained)
4. Commercial & Pricing (existing, retained)
5. Channel & Partner Readiness (**new**)

#### Backend & Export
- `pdf_generator.py` — Updated defaults, "Leading Validation Candidate" label, disclaimer text
- `ExportBriefModal.tsx` — Default fallback updated to "Client Company"
- `pdf_export.test.ts` — Test payload updated with neutral names and new market IDs

#### Verification
- TypeScript build: **zero errors**
- Scoring engine tests: **108/108 passed** (100% mathematical accuracy)
- Product prep tests: **23/23 passed**
- Golden dataset: **untouched** — mathematical integrity preserved
- Scoring engine (`scoring_engine.ts`): **untouched**
- Confidence decoupling (`confidence.ts`): **untouched**

---

## [1.5.0] — 2026-06-30

### 🚀 Initial Release — MEP-light™ Enterprise v1.4

- Full 7-step diagnostic workflow
- 9-dimension scoring engine with golden dataset verification
- Evidence confidence framework with discrepancy alerts
- Product Preparation Space (3 tabs)
- PDF export service via ReportLab
- Demo mode with pre-loaded scenario
- Consultant mode with blank workspace
- Cloud deployment configuration (Docker, Vite)
