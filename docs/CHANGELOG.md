# MEP-light™ — Changelog

All notable changes to the MEP-light™ system are documented in this file.

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
