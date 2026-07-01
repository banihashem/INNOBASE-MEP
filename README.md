<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />
</div>

# MEP-light™ — Market Entry Prioritizer

**Strategic Diagnostics Engine for International Market Expansion**

MEP-light™ is a sector-agnostic, multi-market diagnostic tool that helps organizations evaluate, compare, and prioritize international market entry opportunities. It provides a structured 8-step workflow from strategic framing through entry-readiness assessment.

---

## Features

- **8-Step Diagnostic Workflow** — Decision Setup → Company Snapshot → Product Strategy → Potential Markets → Score & Evidence → Comparative Dashboard → Roadmap → Entry Readiness
- **9-Dimension Scoring Engine** — Market Attractiveness, Offering Fit, Channel Access, Operational Feasibility, Strategic Value, Financial Logic, Brand Transferability, Competitive Intensity, Regulatory Complexity
- **Evidence Confidence Framework** — Per-dimension evidence tagging (Direct Evidence / Market Reports / Expert Judgment) with computed confidence scoring and discrepancy alerts
- **Tier Classification** — Automatic Tier A (Priority) / Tier B (Promising) / Tier C (Postpone) with confidence-based capping
- **Entry Readiness Workspace** — 5-tab operational workspace: Regulatory & Compliance, Offering & Localization, Packaging / Delivery / Operations, Commercial & Pricing, Channel & Partner Readiness
- **PDF Export** — Downloadable Strategic Prioritisation Report via ReportLab backend
- **Demo / Consultant Modes** — Pre-loaded demo data vs. blank consultant workspace

---

## Architecture

```
├── src/
│   ├── types.ts                    # Core types, constants, scoring maps
│   ├── App.tsx                     # Central state machine & step navigation
│   └── components/
│       ├── DecisionSetupScreen.tsx  # Step 1: Decision framing
│       ├── CompanySnapshotScreen.tsx# Step 2: Company context
│       ├── ProductStrategyScreen.tsx# Step 3: Strategy selection
│       ├── MarketShortlistScreen.tsx# Step 4: Market selection
│       ├── ScoringEvidenceScreen.tsx# Step 5: Scoring matrix
│       ├── ComparativeDashboardScreen.tsx # Step 6: Dashboard
│       ├── RoadmapScreen.tsx       # Step 7: Entry roadmap
│       ├── EntryReadinessWorkspace.tsx    # Step 8: 5-tab workspace
│       ├── StepProgress.tsx        # Step progress indicator
│       ├── ConsultantNotes.tsx     # Strategic notes panel
│       ├── ExportBriefModal.tsx    # Export brief overlay
│       └── prep/                   # Entry Readiness tab components
│           ├── RegulatoryComplianceTab.tsx
│           ├── OfferingLocalizationTab.tsx
│           ├── PackagingLogisticsTab.tsx
│           ├── CommercialPricingTab.tsx
│           └── ChannelPartnerTab.tsx
├── backend/
│   ├── src/
│   │   ├── scoring_engine.ts       # Pure deterministic scoring functions
│   │   └── confidence.ts           # Evidence confidence decoupling logic
│   └── pdf_service/
│       ├── app.py                  # Flask PDF API server
│       └── pdf_generator.py        # ReportLab PDF generation
├── tests/
│   ├── golden_dataset.json         # Immutable mathematical verification fixture
│   ├── scoring_engine.test.ts      # 108 scoring engine tests
│   ├── product_prep.test.ts        # 23 product prep calculator tests
│   └── pdf_export.test.ts          # PDF service integration test
└── docs/
    └── CHANGELOG.md                # Version history
```

---

## Run Locally

**Prerequisites:** Node.js ≥ 18, Python 3.10+ (for PDF service)

```bash
# 1. Install dependencies
npm install

# 2. Start the development server
npm run dev
# → http://localhost:3000

# 3. (Optional) Start the PDF export service
pip install flask reportlab
npm run pdf-service
# → http://localhost:5001
```

---

## Testing

```bash
# Run scoring engine tests (108 tests)
npm test

# Run product prep calculator tests (23 tests)
npm run test:prep

# Run all tests
npm run test:all

# Run PDF service integration test (requires pdf-service running)
npm run test:pdf

# TypeScript type checking
npm run lint
```

---

## Strategy Profiles

| ID | Name | Description |
|----|------|-------------|
| `replication` | Core Offering Replication | Test existing offering with minimal adaptation |
| `adaptation` | Localized Offering Adaptation | Adapt offering to local market needs |
| `development` | Market-Specific Offering Development | Build new offering for the target market |

---

## Default Demo Markets

| Market | Type | Description |
|--------|------|-------------|
| UAE | Country | Regional trade hub, premium retail, high competitor density |
| EU | Market Bloc | Large single market with harmonized regulations |
| North America | Region | High purchasing power, mature distribution infrastructure |

---

## Evidence Framework

| Source | Quality Score | Description |
|--------|-------------|-------------|
| Direct Evidence | 95 | Internal data, sales history, pilot results |
| Market Reports | 75 | Published research, trade databases |
| Expert Judgment | 55 | Advisory expertise, informed interpretation |

---

## License

Proprietary. © 2026 MEP-light™ — All rights reserved.