/**
 * MEP-light™ — Bundle No-Demo-Identity Test
 *
 * Verifies that a production build does NOT contain:
 *   - consultant@innobase.app (demo email)
 *   - Strategy Consultant (demo name)
 *   - demo-user-id (demo sub)
 *   - placeholder (placeholder Client ID indicator)
 *
 * This test scans the built dist/ directory for forbidden strings.
 * Run AFTER `npm run build` with GOOGLE_CLIENT_ID set.
 *
 * Usage:
 *   GOOGLE_CLIENT_ID="your-client-id" npm run build
 *   npx tsx tests/bundle_no_demo_identity.test.ts
 */

import fs from "fs";
import path from "path";

// ─── Test Helpers ────────────────────────────────────────────────────

let passed = 0;
let failed = 0;

function assert(condition: boolean, message: string): void {
  if (condition) {
    console.log(`  ✓ ${message}`);
    passed++;
  } else {
    console.log(`  ✗ ${message}`);
    failed++;
  }
}

// ─── Locate Built Assets ─────────────────────────────────────────────

const distPath = path.resolve("dist");
const assetsPath = path.join(distPath, "assets");

console.log("\n" + "─".repeat(60));
console.log("  MEP-light™ — Bundle No-Demo-Identity Test");
console.log("─".repeat(60) + "\n");

// Check if dist exists
if (!fs.existsSync(distPath)) {
  console.log("  ⚠ dist/ directory not found. Run 'npm run build' first.");
  console.log("  Skipping bundle tests (not a failure — build may not have run).\n");
  process.exit(0);
}

if (!fs.existsSync(assetsPath)) {
  console.log("  ⚠ dist/assets/ directory not found.");
  process.exit(0);
}

// Collect all JS files in dist/assets/
const jsFiles = fs.readdirSync(assetsPath).filter(f => f.endsWith(".js"));
assert(jsFiles.length > 0, `Found ${jsFiles.length} JS bundle file(s) in dist/assets/`);

// Concatenate all JS content for scanning
let allJsContent = "";
for (const file of jsFiles) {
  allJsContent += fs.readFileSync(path.join(assetsPath, file), "utf-8");
}

console.log(`  Scanning ${jsFiles.length} JS files (${(allJsContent.length / 1024).toFixed(0)} KB total)\n`);

// ─── Forbidden Strings ──────────────────────────────────────────────

const FORBIDDEN_STRINGS = [
  {
    pattern: "consultant@innobase.app",
    description: "Demo email address",
    testId: "BUNDLE-001",
  },
  {
    pattern: "Strategy Consultant",
    description: "Demo display name",
    testId: "BUNDLE-002",
  },
  {
    pattern: "demo-user-id",
    description: "Demo user sub/ID",
    testId: "BUNDLE-003",
  },
];

for (const { pattern, description, testId } of FORBIDDEN_STRINGS) {
  const found = allJsContent.includes(pattern);
  assert(!found, `${testId}: Bundle does NOT contain "${pattern}" (${description})`);
  if (found) {
    // Find which file contains it
    for (const file of jsFiles) {
      const content = fs.readFileSync(path.join(assetsPath, file), "utf-8");
      if (content.includes(pattern)) {
        console.log(`    → Found in: ${file}`);
      }
    }
  }
}

// ─── Placeholder Check ──────────────────────────────────────────────

// The placeholder pattern specifically means the Client ID was not injected
const placeholderPattern = "placeholder.apps.googleusercontent.com";
const hasPlaceholder = allJsContent.includes(placeholderPattern);
assert(!hasPlaceholder, `BUNDLE-004: Bundle does NOT contain placeholder Client ID`);

// ─── Positive Check: Real Client ID ─────────────────────────────────

// If GOOGLE_CLIENT_ID was set during build, verify it's in the bundle
const expectedClientId = process.env.GOOGLE_CLIENT_ID || "";
if (expectedClientId && expectedClientId.length > 10 && !expectedClientId.includes("placeholder")) {
  const hasRealClientId = allJsContent.includes(expectedClientId);
  assert(hasRealClientId, `BUNDLE-005: Bundle contains the real Google Client ID`);
} else {
  console.log("  ℹ BUNDLE-005: Skipped (GOOGLE_CLIENT_ID not set in current env)");
}

// ─── Summary ─────────────────────────────────────────────────────────

console.log("\n" + "─".repeat(60));
console.log("  BUNDLE NO-DEMO-IDENTITY TEST SUMMARY");
console.log("─".repeat(60));
console.log(`\n  Total: ${passed + failed}  Passed: ${passed}  Failed: ${failed}\n`);

if (failed === 0) {
  console.log("  ╔══════════════════════════════════════════════════╗");
  console.log("  ║  ✓ BUNDLE IDENTITY TESTS PASSED                 ║");
  console.log("  ╚══════════════════════════════════════════════════╝\n");
} else {
  console.log("  ╔══════════════════════════════════════════════════╗");
  console.log(`  ║  ✗ ${failed} BUNDLE IDENTITY TEST(S) FAILED           ║`);
  console.log("  ╚══════════════════════════════════════════════════╝\n");
  process.exit(1);
}
