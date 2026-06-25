/**
 * MEP-light™ — Product Preparation Calculator Tests
 *
 * Verifies:
 *  1. Net Shelf Life formula
 *  2. MoQ margin impact formula
 *  3. Landed Cost waterfall calculations
 */

// Import the pure calculation functions
// These are exported from the React components for testability
import { calculateNetShelfLife } from "../src/components/prep/PackagingLogisticsTab.js";
import {
  calculateMoqImpact,
  calculateLandedCost,
} from "../src/components/prep/CommercialPricingTab.js";

let passed = 0;
let failed = 0;

function assert(label: string, actual: unknown, expected: unknown): void {
  const match =
    typeof actual === "number" && typeof expected === "number"
      ? Math.abs(actual - expected) < 0.01
      : actual === expected;
  if (match) {
    console.log(`  ✓ ${label}`);
    passed++;
  } else {
    console.error(`  ✗ ${label}: expected ${expected}, got ${actual}`);
    failed++;
  }
}

// ─── Net Shelf Life Tests ───────────────────────────────
console.log("\n────────────────────────────────────────────────────────────");
console.log("  Net Shelf Life Calculator");
console.log("────────────────────────────────────────────────────────────\n");

// Standard scenario: 360 - (21 + 7 + 14) = 318
const sl1 = calculateNetShelfLife(360, 21, 7, 14);
assert("Standard: Net = 318", sl1.netUsableShelfLife, 318);
assert("Standard: Percentage = 88.33%", Math.round(sl1.percentageRemaining * 100) / 100, 88.33);
assert("Standard: Indicator = GREEN", sl1.indicator, "GREEN");

// Tight scenario: 90 - (21 + 7 + 14) = 48 → 53.3% → AMBER
const sl2 = calculateNetShelfLife(90, 21, 7, 14);
assert("Tight: Net = 48", sl2.netUsableShelfLife, 48);
assert("Tight: Indicator = AMBER", sl2.indicator, "AMBER");

// Critical scenario: 60 - (21 + 7 + 14) = 18 → 30% → AMBER (boundary)
const sl3 = calculateNetShelfLife(60, 21, 7, 14);
assert("Critical boundary: Net = 18", sl3.netUsableShelfLife, 18);
// 18/60 = 30%, which is >= 30 so still AMBER
assert("Critical boundary: Indicator = AMBER", sl3.indicator, "AMBER");

// Red scenario: 50 - (21 + 7 + 14) = 8 → 16% → RED
const sl4 = calculateNetShelfLife(50, 21, 7, 14);
assert("Red: Net = 8", sl4.netUsableShelfLife, 8);
assert("Red: Indicator = RED", sl4.indicator, "RED");

// Zero scenario: 30 - (21 + 7 + 14) = -12 → clamped to 0
const sl5 = calculateNetShelfLife(30, 21, 7, 14);
assert("Zero: Net = 0 (clamped)", sl5.netUsableShelfLife, 0);
assert("Zero: Indicator = RED", sl5.indicator, "RED");

// ─── MoQ Margin Impact Tests ────────────────────────────
console.log("\n────────────────────────────────────────────────────────────");
console.log("  MoQ Margin Impact Calculator");
console.log("────────────────────────────────────────────────────────────\n");

// Standard: ((5000 - 1000) / 5000) * 0.15 * 100 = 12%
const moq1 = calculateMoqImpact(5000, 1000, 0.15);
assert("Standard: Margin Impact = 12%", moq1.marginImpactPercent, 12);
assert("Standard: Short Run Units = 4000", moq1.shortRunUnits, 4000);

// Trial meets MOQ: ((5000 - 5000) / 5000) * 0.15 * 100 = 0%
const moq2 = calculateMoqImpact(5000, 5000, 0.15);
assert("Meets MOQ: Margin Impact = 0%", moq2.marginImpactPercent, 0);
assert("Meets MOQ: Short Run = 0", moq2.shortRunUnits, 0);

// Trial exceeds MOQ: ((5000 - 7000) / 5000) * 0.15 * 100 = negative → clamped to 0
const moq3 = calculateMoqImpact(5000, 7000, 0.15);
assert("Exceeds MOQ: Margin Impact = 0 (clamped)", moq3.marginImpactPercent, 0);

// High premium: ((10000 - 2000) / 10000) * 0.25 * 100 = 20%
const moq4 = calculateMoqImpact(10000, 2000, 0.25);
assert("High premium: Margin Impact = 20%", moq4.marginImpactPercent, 20);

// ─── Landed Cost Waterfall Tests ────────────────────────
console.log("\n────────────────────────────────────────────────────────────");
console.log("  Landed Cost Waterfall");
console.log("────────────────────────────────────────────────────────────\n");

// EXW=$2.50, Freight=$0.35, Insurance=1.5%, Duty=5%, Clearance=$0.10,
// Dist=35%, Retail=40%
const lc = calculateLandedCost(2.50, 0.35, 1.5, 5.0, 0.10, 35.0, 40.0);

// CIF = 2.50 + 0.35 + (2.50 * 0.015) = 2.50 + 0.35 + 0.0375 = 2.8875
assert("CIF Price", lc.cifPrice, 2.8875);

// Duty = 2.8875 * 0.05 = 0.144375
assert("Duty Amount", lc.dutyAmount, 0.144375);

// Landed = 2.8875 + 0.144375 + 0.10 = 3.131875
assert("Landed Cost", lc.landedCost, 3.131875);

// Distributor = 3.131875 * 1.35 = 4.2280…
assert("Distributor Price", Math.round(lc.distributorPrice * 100) / 100, 4.23);

// Retail = 4.228… * 1.40 = 5.919…
assert("Retail Shelf Price", Math.round(lc.retailShelfPrice * 100) / 100, 5.92);

// Multiplier = retailShelfPrice / exwUnitPrice
const multiplier = lc.retailShelfPrice / lc.exwUnitPrice;
assert("Price Multiplier > 2x", multiplier > 2, true);

// ─── Summary ────────────────────────────────────────────
console.log("\n────────────────────────────────────────────────────────────");
console.log("  PRODUCT PREP TEST SUMMARY");
console.log("────────────────────────────────────────────────────────────\n");
console.log(`  Total Tests:  ${passed + failed}`);
console.log(`  Passed:       ${passed}`);
console.log(`  Failed:       ${failed}`);

if (failed === 0) {
  console.log("\n  ╔══════════════════════════════════════════════════╗");
  console.log("  ║  ✓ ALL PRODUCT PREP TESTS PASSED                ║");
  console.log("  ╚══════════════════════════════════════════════════╝\n");
  process.exit(0);
} else {
  console.log("\n  ╔══════════════════════════════════════════════════╗");
  console.log(`  ║  ✗ ${failed} FAILURES                              ║`);
  console.log("  ╚══════════════════════════════════════════════════╝\n");
  process.exit(1);
}
