import { computeEvidenceConfidence } from "../src/lib/scoring";
import { EVIDENCE_BASIS_OPTIONS, DimensionScores, EvidenceBasis } from "../src/types";

let total = 0, passed = 0, failed = 0;
const failures: string[] = [];
function assert(cond: boolean, name: string, extra?: string) {
  total++;
  if (cond) { passed++; console.log(`  \u2713 ${name}`); }
  else { failed++; failures.push(name + (extra ? ` \u2014 ${extra}` : "")); console.log(`  \u2717 FAILED: ${name}${extra ? ` \u2014 ${extra}` : ""}`); }
}

console.log("\n--- MEP-light™ Step 5 Confidence Core Logic Tests ---");

const mkEv = (): Record<keyof DimensionScores, EvidenceBasis> => ({
  marketAttractiveness: "Expert Judgment",
  offeringFit: "Expert Judgment",
  channelAccess: "Expert Judgment",
  operationalFeasibility: "Expert Judgment",
  strategicValue: "Expert Judgment",
  financialLogic: "Expert Judgment",
  brandTrustTransferability: "Expert Judgment",
  competitiveIntensity: "Expert Judgment",
  regulatoryComplexity: "Expert Judgment",
});

// 1. Immediate consistency
const ev1 = mkEv();
assert(computeEvidenceConfidence(ev1) === "Medium", "Base Expert Judgment is Medium");

ev1.marketAttractiveness = "Direct Evidence";
ev1.offeringFit = "Direct Evidence";
ev1.channelAccess = "Direct Evidence";
ev1.operationalFeasibility = "Direct Evidence";
ev1.strategicValue = "Direct Evidence";
assert(computeEvidenceConfidence(ev1) === "Medium", "Mix of Direct and Expert is Medium (avg < 85)");

ev1.financialLogic = "Direct Evidence";
ev1.brandTrustTransferability = "Direct Evidence";
ev1.competitiveIntensity = "Direct Evidence";
ev1.regulatoryComplexity = "Direct Evidence";
assert(computeEvidenceConfidence(ev1) === "High", "All Direct Evidence is High");

// 2. Vocabulary & "Primary Research" check
assert(EVIDENCE_BASIS_OPTIONS.length === 3, "Exactly 3 evidence basis options exist");
assert(EVIDENCE_BASIS_OPTIONS.includes("Direct Evidence"), "Contains Direct Evidence");
assert(EVIDENCE_BASIS_OPTIONS.includes("Market Reports"), "Contains Market Reports");
assert(EVIDENCE_BASIS_OPTIONS.includes("Expert Judgment"), "Contains Expert Judgment");
assert(!EVIDENCE_BASIS_OPTIONS.includes("Primary Research" as any), "Does not contain Primary Research");
assert(!EVIDENCE_BASIS_OPTIONS.includes("Secondary Research" as any), "Does not contain Secondary Research");

console.log("\nResults:");
console.log(`  Total:  ${total}`);
console.log(`  Passed: ${passed}`);
console.log(`  Failed: ${failed}`);

if (failed > 0) {
  console.error("\nFailures:");
  failures.forEach(f => console.error(`  - ${f}`));
  process.exit(1);
}
