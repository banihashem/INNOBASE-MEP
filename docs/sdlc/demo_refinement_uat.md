# MEP-light™ Demo Refinement UAT & RBAC Test Checklist

## 1. Role Provisioning & Auth
- [ ] Users assigned `demo_participant` default upon login.
- [ ] Admin panel lists `demo_participant` count.
- [ ] Admin can change a user's role to `Consultant`, `Administrator`, or `Viewer`.
- [ ] User Profile menu displays "Demo" for `demo_participant`.

## 2. Global State & Context 
- [ ] App mode correctly switches to `free-demo` for `demo_participant` roles.
- [ ] `DEMO_MODE` is strictly `false` (bypassing old static mock data).

## 3. UI/UX Refinements (Demo Constraints)
### Landing Page
- [ ] Uses label "MEP-light Beta Demo v1.6".
- [ ] Uses evidence-informed language (no "deterministic", "guaranteed success", "predictive certainty").

### Decision Setup (Step 1)
- [ ] Decision Objective is forced to "Compare Entry Feasibility".
- [ ] Decision Modes besides "compare" are disabled.
- [ ] Strategic Objective input is read-only.

### Company Snapshot (Step 2)
- [ ] Organization Synthesis field says "Client company is an SME with modular capabilities exploring expansion."

### Product Strategy (Step 3)
- [ ] "Core Offering Replication" is the only selectable strategy.
- [ ] Other strategies are disabled.

### Market Selection (Step 4)
- [ ] Market shortlisting is limited to 2-3 maximum.
- [ ] "Market Context Notes" are read-only with a message "Custom market context requires the Consultant tier."

### Scoring Evidence (Step 5)
- [ ] Replaced "Continue" button with "Generate Draft Scores".
- [ ] Consultant pad is hidden.

### Dashboard (Step 6)
- [ ] "Diagnostic Weight Framework" shows conditional label depending on candidate selection.
- [ ] Risk/Potential/Opportunity labels rendered properly.

### Roadmap (Step 7)
- [ ] PDF Download button is disabled and says "PDF Export Locked".
- [ ] Proceed to Next Phase button says "Workspace Locked" and is disabled.
- [ ] Consultant Pad is hidden.

## 4. API Endpoints
- [ ] Requests to PDF generation blocked for `demo_participant`.
- [ ] `demo_participant` roles can only save state up to Step 7.
