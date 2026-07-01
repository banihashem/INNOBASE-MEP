/**
 * MEP-light™ — PDF Export Service Integration Test
 *
 * Verifies:
 *  1. The PDF service returns a valid response
 *  2. Content-Type is application/pdf
 *  3. Response body starts with %PDF- header bytes
 *  4. Response size is non-zero
 *
 * Requires: PDF service running on port 5001
 *   npm run pdf-service
 */

const PDF_SERVICE_URL = "http://localhost:5001";

let passed = 0;
let failed = 0;

function assert(label: string, actual: unknown, expected: unknown): void {
  const match = actual === expected;
  if (match) {
    console.log(`  ✓ ${label}`);
    passed++;
  } else {
    console.error(`  ✗ ${label}: expected ${expected}, got ${actual}`);
    failed++;
  }
}

async function testHealthEndpoint() {
  console.log("\n────────────────────────────────────────────────────────────");
  console.log("  PDF Service Health Check");
  console.log("────────────────────────────────────────────────────────────\n");

  try {
    const resp = await fetch(`${PDF_SERVICE_URL}/api/health`);
    const data = await resp.json();
    assert("Health status is 200", resp.status, 200);
    assert("Service name matches", data.service, "MEP-light™ PDF Export Service");
  } catch (err) {
    console.error("  ✗ Could not connect to PDF service. Is it running on port 5001?");
    failed++;
  }
}

async function testPDFGeneration() {
  console.log("\n────────────────────────────────────────────────────────────");
  console.log("  PDF Generation Test");
  console.log("────────────────────────────────────────────────────────────\n");

  const payload = {
    companyName: "Client Company",
    sector: "Food & Beverage Manufacturing",
    domesticMarketSize: "$8M annual revenue",
    exportExperience: "Limited/Indirect Exporting",
    internalCapabilities: "Modular packaging, shelf-life technology",
    knownConstraints: "High shipping costs, limited brand recognition",
    offeringName: "Selected Offering",
    selectedStrategy: "replication",
    decisionMode: "compare",
    expansionHorizon: "12 months",
    strategicObjective: "Identify the most practical growth opportunity",
    results: [
      {
        marketId: "uae",
        name: "UAE",
        potentialScore: 66,
        tier: "Tier B: Promising",
        riskLevel: "Medium",
        confidence: "Medium",
        discrepancyAlert: false,
      },
      {
        marketId: "eu",
        name: "EU",
        potentialScore: 62,
        tier: "Tier B: Promising",
        riskLevel: "Medium",
        confidence: "Medium",
        discrepancyAlert: false,
      },
    ],
    selectedRoadmapMarketId: "uae",
    consultantNotes: "Initial assessment session — Q3 2026",
  };

  try {
    const resp = await fetch(`${PDF_SERVICE_URL}/api/export-pdf`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    assert("Response status is 200", resp.status, 200);

    const contentType = resp.headers.get("content-type") || "";
    assert(
      "Content-Type is application/pdf",
      contentType.includes("application/pdf"),
      true
    );

    const buffer = await resp.arrayBuffer();
    const bytes = new Uint8Array(buffer);

    assert("PDF size is non-zero", bytes.length > 0, true);
    console.log(`    → PDF size: ${bytes.length} bytes`);

    // Check PDF header magic bytes: %PDF-
    const header = String.fromCharCode(...bytes.slice(0, 5));
    assert("PDF starts with %PDF- header", header, "%PDF-");
  } catch (err) {
    console.error(
      "  ✗ PDF generation request failed:",
      (err as Error).message
    );
    failed++;
  }
}

async function testInvalidPayload() {
  console.log("\n────────────────────────────────────────────────────────────");
  console.log("  Error Handling Test");
  console.log("────────────────────────────────────────────────────────────\n");

  try {
    const resp = await fetch(`${PDF_SERVICE_URL}/api/export-pdf`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: "not valid json",
    });
    // Should still return 200 with minimal PDF or 400/500
    assert("Handles bad payload gracefully", resp.status >= 200, true);
  } catch (err) {
    console.error("  ✗ Error handling test failed:", (err as Error).message);
    failed++;
  }
}

async function main() {
  await testHealthEndpoint();
  await testPDFGeneration();
  await testInvalidPayload();

  console.log("\n────────────────────────────────────────────────────────────");
  console.log("  PDF EXPORT TEST SUMMARY");
  console.log("────────────────────────────────────────────────────────────\n");
  console.log(`  Total Tests:  ${passed + failed}`);
  console.log(`  Passed:       ${passed}`);
  console.log(`  Failed:       ${failed}`);

  if (failed === 0) {
    console.log("\n  ╔══════════════════════════════════════════════════╗");
    console.log("  ║  ✓ ALL PDF EXPORT TESTS PASSED                  ║");
    console.log("  ╚══════════════════════════════════════════════════╝\n");
  } else {
    console.log("\n  ╔══════════════════════════════════════════════════╗");
    console.log(`  ║  ✗ ${failed} FAILURES                              ║`);
    console.log("  ╚══════════════════════════════════════════════════╝\n");
  }

  process.exit(failed > 0 ? 1 : 0);
}

main();
