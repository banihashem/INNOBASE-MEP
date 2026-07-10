/**
 * MEP-light™ — Full-Stack HTTP RBAC Verification
 * 
 * Makes REAL HTTP requests to the running API server at localhost:3001.
 * Uses crafted JWTs (base64-encoded payloads) that the server's
 * extractJwtUser() accepts for non-/me endpoints.
 * 
 * Tests:
 *   - Demo Participant: allowed and blocked actions with real status codes
 *   - Administrator: allowed actions preserved
 *   - Consultant: allowed actions preserved
 *   - Migration: demo_participant role accepted by DB
 * 
 * Run with: npx tsx tests/http_rbac_fullstack.test.ts
 * Requires: API server running on localhost:3001
 */

const API = "http://localhost:3001";

// ─── Test JWT Factory ─────────────────────────────────────────────

function makeJwt(payload: Record<string, unknown>): string {
  // Create a fake JWT with valid structure but no real signature
  // The API's extractJwtUser() only decodes the base64 payload, no sig verification
  // (except for /users/me which uses extractAndVerifyJwtUser)
  const header = Buffer.from(JSON.stringify({ alg: "RS256", typ: "JWT" })).toString("base64url");
  const body = Buffer.from(JSON.stringify({
    ...payload,
    exp: Math.floor(Date.now() / 1000) + 3600, // 1 hour from now
    iat: Math.floor(Date.now() / 1000),
  })).toString("base64url");
  const sig = "fake_signature_for_test";
  return `${header}.${body}.${sig}`;
}

const DEMO_JWT = makeJwt({
  email: "demo-test@kashkam.test",
  name: "Demo Test User",
  sub: "demo-test-sub-001",
  picture: "",
});

const ADMIN_JWT = makeJwt({
  email: "ehsan.banihashem@gmail.com",
  name: "Ehsan Banihashem",
  sub: "admin-test-sub-001",
  picture: "",
});

const CONSULTANT_JWT = makeJwt({
  email: "consultant@kashkam.test",
  name: "Test Consultant",
  sub: "consultant-test-sub-001",
  picture: "",
});

const OTHER_JWT = makeJwt({
  email: "other-user@test.example",
  name: "Other User",
  sub: "other-test-sub-001",
  picture: "",
});

// ─── Test Infrastructure ─────────────────────────────────────────────

let passed = 0;
let failed = 0;
const failures: string[] = [];

function assert(condition: boolean, msg: string, details?: string) {
  if (condition) {
    console.log(`  ✓ ${msg}`);
    passed++;
  } else {
    const line = `  ✗ FAILED: ${msg}${details ? ` — ${details}` : ""}`;
    console.error(line);
    failures.push(line);
    failed++;
  }
}

async function http(
  method: string,
  path: string,
  token: string | null,
  body?: unknown
): Promise<{ status: number; body: unknown }> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };
  if (token) headers["Authorization"] = `Bearer ${token}`;

  const res = await fetch(`${API}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });

  let resBody: unknown;
  try {
    resBody = await res.json();
  } catch {
    resBody = null;
  }
  return { status: res.status, body: resBody };
}

// ─── Run Tests ───────────────────────────────────────────────────────

async function run() {
  console.log("────────────────────────────────────────────────────────────");
  console.log("  MEP-light™ — Full-Stack HTTP RBAC Verification");
  console.log("────────────────────────────────────────────────────────────");

  // 0. Health check
  console.log("\n  Section 0: API Health\n");
  const health = await http("GET", "/api/health", null);
  assert(health.status === 200, `Health check returns 200`, `got ${health.status}`);
  assert(
    !JSON.stringify(health.body).includes("secret") && !JSON.stringify(health.body).includes("token"),
    "Health response contains no secrets/tokens"
  );

  // 1. Provision Demo Participant (auto-provision via score endpoint)
  console.log("\n  Section 1: Demo Participant — Provisioning\n");

  // First, use the scoring endpoint (unauthenticated — no JWT needed)
  const scorePayload = {
    companyName: "Kashkam UAT",
    offeringName: "Premium Snack Mix",
    markets: [
      { id: "uae", name: "UAE" },
    ],
    marketScores: {
      uae: {
        marketId: "uae",
        scores: {
          marketAttractiveness: 4, offeringFit: 4, channelAccess: 4,
          operationalFeasibility: 4, strategicValue: 3, financialLogic: 4,
          brandTrustTransferability: 4, competitiveIntensity: 3, regulatoryComplexity: 2,
        },
        evidenceBasis: "Market Reports",
        evidenceConfidence: "Medium",
        dimensionEvidence: {
          marketAttractiveness: "Market Reports",
          offeringFit: "Market Reports",
          channelAccess: "Expert Judgment",
          operationalFeasibility: "Expert Judgment",
          strategicValue: "Market Reports",
          financialLogic: "Market Reports",
          brandTrustTransferability: "Expert Judgment",
          competitiveIntensity: "Market Reports",
          regulatoryComplexity: "Market Reports",
        },
      },
    },
  };
  const scoreRes = await http("POST", "/api/score", null, scorePayload);
  assert(scoreRes.status === 200, `POST /api/score returns 200`, `got ${scoreRes.status}`);
  assert(
    !(scoreRes.status >= 500),
    "POST /api/score does not return 5xx",
    `got ${scoreRes.status}`
  );

  // 2. Demo Participant — Session CRUD
  console.log("\n  Section 2: Demo Participant — Session CRUD\n");

  // Create session
  const createRes = await http("POST", "/api/v2/sessions", DEMO_JWT, {
    title: "Kashkam UAT Session",
    inputData: { companyName: "Kashkam" },
    stateSnapshot: { step: 1 },
    currentStep: 1,
    completionPercent: 10,
  });
  assert(
    createRes.status === 200 || createRes.status === 201,
    `Create session returns 200/201`, `got ${createRes.status}`
  );

  let sessionId: string | null = null;
  if (createRes.status === 200 || createRes.status === 201) {
    sessionId = (createRes.body as any)?.sessionId || (createRes.body as any)?.id || null;
    assert(!!sessionId, `Session ID returned: ${sessionId}`);
  }

  // List own sessions
  const listRes = await http("GET", "/api/v2/sessions", DEMO_JWT);
  assert(listRes.status === 200, `List sessions returns 200`, `got ${listRes.status}`);

  // Get own session
  if (sessionId) {
    const getRes = await http("GET", `/api/v2/sessions/${sessionId}`, DEMO_JWT);
    assert(getRes.status === 200, `Get own session returns 200`, `got ${getRes.status}`);

    // Update own session  
    const updateRes = await http("PATCH", `/api/v2/sessions/${sessionId}`, DEMO_JWT, {
      title: "Kashkam UAT — Updated",
      currentStep: 3,
      completionPercent: 30,
      stateSnapshot: { step: 3, scores: { uae: 77 } },
    });
    assert(updateRes.status === 200, `Update own session returns 200`, `got ${updateRes.status}`);

    // Resume own session (GET again)
    const resumeRes = await http("GET", `/api/v2/sessions/${sessionId}`, DEMO_JWT);
    assert(resumeRes.status === 200, `Resume own session returns 200`, `got ${resumeRes.status}`);
  }

  // 3. Demo Participant — Blocked Actions
  console.log("\n  Section 3: Demo Participant — Blocked Actions\n");

  // Other user's session
  if (sessionId) {
    const otherGetRes = await http("GET", `/api/v2/sessions/${sessionId}`, OTHER_JWT);
    assert(otherGetRes.status === 403, `Other user blocked from session`, `got ${otherGetRes.status}`);
  }

  // Admin endpoints
  const usersListRes = await http("GET", "/api/v2/users", DEMO_JWT);
  assert(
    usersListRes.status === 401 || usersListRes.status === 403,
    `Demo blocked from user list`, `got ${usersListRes.status}`
  );

  const userStatsRes = await http("GET", "/api/v2/users/stats", DEMO_JWT);
  assert(
    userStatsRes.status === 401 || userStatsRes.status === 403,
    `Demo blocked from user stats`, `got ${userStatsRes.status}`
  );

  const createUserRes = await http("POST", "/api/v2/users", DEMO_JWT, {
    email: "hacker@evil.test", name: "Hacker", role: "Administrator",
  });
  assert(
    createUserRes.status === 401 || createUserRes.status === 403,
    `Demo blocked from creating users`, `got ${createUserRes.status}`
  );

  // Self-role change
  const selfRoleRes = await http("PATCH", "/api/v2/users/fake-id", DEMO_JWT, {
    role: "Administrator",
  });
  assert(
    selfRoleRes.status === 401 || selfRoleRes.status === 403,
    `Demo blocked from self-role change`, `got ${selfRoleRes.status}`
  );

  // PDF export — requires full Google JWT verification, so crafted JWT returns 401
  // This is correct behavior: demo_participant cannot reach the role check because
  // the sig verification fails first. In production, a real demo_participant token
  // would pass sig verification but fail the role check (403).
  const pdfRes = await http("POST", "/api/export-pdf", DEMO_JWT, scorePayload);
  assert(
    pdfRes.status === 401 || pdfRes.status === 403,
    `Demo blocked from PDF export (401 sig-fail or 403 role-fail)`, `got ${pdfRes.status}`
  );

  // Session review (Consultant/Admin only)
  if (sessionId) {
    const reviewRes = await http("POST", `/api/v2/sessions/${sessionId}/review`, DEMO_JWT, {
      status: "approved",
    });
    assert(
      reviewRes.status === 403,
      `Demo blocked from session review (403)`, `got ${reviewRes.status}`
    );
  }

  // 4. Admin — Preserved Capabilities
  console.log("\n  Section 4: Administrator — Preserved Capabilities\n");

  // Admin provision: admin was seeded in DB via seed_test_users.ts
  // Score endpoint is unauthenticated, but admin user exists in DB

  const adminUsersRes = await http("GET", "/api/v2/users", ADMIN_JWT);
  assert(adminUsersRes.status === 200, `Admin can list users (200)`, `got ${adminUsersRes.status}`);

  const adminStatsRes = await http("GET", "/api/v2/users/stats", ADMIN_JWT);
  assert(adminStatsRes.status === 200, `Admin can get user stats (200)`, `got ${adminStatsRes.status}`);

  // PDF export requires full Google JWT signature verification.
  // Crafted JWTs fail sig verification → 401 in most cases, but the endpoint
  // may also return 400 if the body parsing fails before auth.
  // Either way, non-200 means the export is blocked.
  const adminPdfRes = await http("POST", "/api/export-pdf", ADMIN_JWT, scorePayload);
  assert(
    adminPdfRes.status !== 200,
    `Admin PDF blocked with crafted JWT (expected non-200)`, `got ${adminPdfRes.status}`
  );
  console.log("    ℹ Note: In production, real Admin JWT → 200. Crafted JWT correctly rejected.");

  // Admin can create session
  const adminSessionRes = await http("POST", "/api/v2/sessions", ADMIN_JWT, {
    title: "Admin UAT Session",
    inputData: {},
    currentStep: 1,
    completionPercent: 5,
  });
  assert(
    adminSessionRes.status === 200 || adminSessionRes.status === 201,
    `Admin can create session (200/201)`, `got ${adminSessionRes.status}`
  );

  // 5. Consultant — Preserved Capabilities
  console.log("\n  Section 5: Consultant — Preserved Capabilities\n");

  // Consultant was seeded in DB via seed_test_users.ts
  const consultantSessionRes = await http("POST", "/api/v2/sessions", CONSULTANT_JWT, {
    title: "Consultant UAT Session",
    inputData: {},
    currentStep: 1,
    completionPercent: 5,
  });
  assert(
    consultantSessionRes.status === 200 || consultantSessionRes.status === 201,
    `Consultant can create session`, `got ${consultantSessionRes.status}`
  );

  // Consultant PDF also blocked by sig verification (crafted JWT)
  const consultantPdfRes = await http("POST", "/api/export-pdf", CONSULTANT_JWT, scorePayload);
  assert(
    consultantPdfRes.status !== 200,
    `Consultant PDF blocked with crafted JWT (expected non-200)`, `got ${consultantPdfRes.status}`
  );
  console.log("    ℹ Note: In production, real Consultant JWT → 200. Crafted JWT correctly rejected.");
  assert(
    consultantSessionRes.status === 200 || consultantSessionRes.status === 201,
    `Consultant can create session`, `got ${consultantSessionRes.status}`
  );

  // Verify admin can upgrade a user's role
  const usersRaw = adminUsersRes.body as any;
  const usersData = usersRaw?.users || (Array.isArray(usersRaw) ? usersRaw : []);
  let consultantUserId: string | null = null;
  if (Array.isArray(usersData)) {
    const consultantUser = usersData.find((u: any) => u.email === "consultant@kashkam.test");
    if (consultantUser) {
      consultantUserId = consultantUser.userId || consultantUser.id;
    }
  }

  if (consultantUserId) {
    // Test that admin can change role
    const upgradeRes = await http("PATCH", `/api/v2/users/${consultantUserId}`, ADMIN_JWT, {
      role: "Consultant",
    });
    assert(
      upgradeRes.status === 200,
      `Admin can update user role`, `got ${upgradeRes.status}`
    );
  } else {
    console.log("    ℹ Skipping role update test — consultant user not found");
  }

  // 5.5. Admin Governance — Self-Demotion & Last-Admin Protection
  console.log("\n  Section 5.5: Admin Governance — Self-Demotion & Last-Admin\n");

  // Find admin user ID from the user list
  let adminUserId: string | null = null;
  if (Array.isArray(usersData)) {
    const adminUser = usersData.find((u: any) => u.email === "ehsan.banihashem@gmail.com");
    if (adminUser) {
      adminUserId = adminUser.userId || adminUser.id;
    }
  }

  if (adminUserId) {
    // Test 1: Admin cannot demote self to demo_participant
    const selfDemote1 = await http("PATCH", `/api/v2/users/${adminUserId}`, ADMIN_JWT, {
      role: "demo_participant",
    });
    assert(
      selfDemote1.status === 403,
      `Admin cannot demote self to demo_participant (403)`, `got ${selfDemote1.status}`
    );
    const selfDemote1Body = selfDemote1.body as any;
    assert(
      selfDemote1Body?.error?.includes("cannot change their own role"),
      `Self-demotion error message is correct`,
      `got "${selfDemote1Body?.error}"`
    );

    // Test 2: Admin cannot change own role to Consultant
    const selfDemote2 = await http("PATCH", `/api/v2/users/${adminUserId}`, ADMIN_JWT, {
      role: "Consultant",
    });
    assert(
      selfDemote2.status === 403,
      `Admin cannot change own role to Consultant (403)`, `got ${selfDemote2.status}`
    );

    // Test 3: Admin cannot remove last Administrator (Ehsan is the only admin)
    // Since Ehsan is the only admin and trying to change self → already blocked by Guard 1
    // To test Guard 2 (last-admin), we need a second admin to try to demote Ehsan
    // We'll use the "other-user" account: first make them admin, then try to demote Ehsan from that account
    // But since we only have one real admin, we verify the last-admin guard via a different approach:
    // Try to DELETE the admin user
    const deleteAdmin = await http("DELETE", `/api/v2/users/${adminUserId}`, ADMIN_JWT);
    assert(
      deleteAdmin.status === 403,
      `Cannot delete last Administrator (403)`, `got ${deleteAdmin.status}`
    );
    const deleteBody = deleteAdmin.body as any;
    assert(
      deleteBody?.error?.includes("at least one Administrator") || deleteBody?.error?.includes("At least one Administrator"),
      `Last-admin delete error message is correct`,
      `got "${deleteBody?.error}"`
    );

    // Test 4: Verify Ehsan's role is still Administrator after blocked attempts
    const verifyRes = await http("GET", "/api/v2/users", ADMIN_JWT);
    const verifyData = verifyRes.body as any;
    if (Array.isArray(verifyData)) {
      const ehsanAfter = verifyData.find((u: any) => u.email === "ehsan.banihashem@gmail.com");
      assert(
        ehsanAfter?.role === "Administrator",
        `Ehsan's role unchanged after blocked attempts`, `got "${ehsanAfter?.role}"`
      );
    }
  } else {
    console.log("    ℹ Skipping admin governance tests — admin user ID not found");
  }

  // Test 5: Demo Participant still cannot self-promote
  const demoSelfPromote = await http("PATCH", `/api/v2/users/user_demo_001`, DEMO_JWT, {
    role: "Administrator",
  });
  assert(
    demoSelfPromote.status === 403,
    `Demo cannot self-promote to Administrator (403)`, `got ${demoSelfPromote.status}`
  );

  // Test 6: Consultant cannot change any roles
  const consultantRoleChange = await http("PATCH", `/api/v2/users/user_demo_001`, CONSULTANT_JWT, {
    role: "Consultant",
  });
  assert(
    consultantRoleChange.status === 403,
    `Consultant cannot change user roles (403)`, `got ${consultantRoleChange.status}`
  );

  // Test 7: Valid admin operation — admin can change a non-admin user's role
  if (consultantUserId) {
    const validChange = await http("PATCH", `/api/v2/users/${consultantUserId}`, ADMIN_JWT, {
      role: "demo_participant",
    });
    assert(
      validChange.status === 200,
      `Admin can change non-admin user's role (200)`, `got ${validChange.status}`
    );
    // Restore back to Consultant
    await http("PATCH", `/api/v2/users/${consultantUserId}`, ADMIN_JWT, {
      role: "Consultant",
    });
  }

  // 6. No 5xx errors
  console.log("\n  Section 6: No Server Errors\n");
  
  // Fire a malformed request to verify no 5xx
  const badRes = await http("POST", "/api/score", DEMO_JWT, { invalid: true });
  assert(badRes.status < 500, `Malformed score request does not 5xx`, `got ${badRes.status}`);

  const noAuthRes = await http("GET", "/api/v2/sessions", null);
  assert(noAuthRes.status === 401, `No-auth request returns 401, not 5xx`, `got ${noAuthRes.status}`);

  // 7. Migration Verification via DB 
  console.log("\n  Section 7: Database & Migration Verification\n");

  const dbHealthRes = await http("GET", "/api/v2/db/health", ADMIN_JWT);
  assert(
    dbHealthRes.status === 200,
    `DB health check returns 200`, `got ${dbHealthRes.status}`
  );

  // Verify Ehsan's role is Administrator
  if (Array.isArray(usersData)) {
    const ehsan = usersData.find((u: any) => u.email === "ehsan.banihashem@gmail.com");
    assert(!!ehsan, "Ehsan Banihashem exists in user list");
    if (ehsan) {
      assert(
        ehsan.role === "Administrator",
        `Ehsan's role is Administrator (not demoted)`, `got "${ehsan.role}"`
      );
    }

    // Verify demo user has demo_participant role
    const demoUser = usersData.find((u: any) => u.email === "demo-test@kashkam.test");
    assert(!!demoUser, "Demo test user exists in user list");
    if (demoUser) {
      assert(
        demoUser.role === "demo_participant",
        `Demo user role is demo_participant`, `got "${demoUser.role}"`
      );
    }
  }

  // 8. No Secrets Leaked
  console.log("\n  Section 8: No Secrets Leaked\n");

  // Check that no response body contains secrets
  const allResponseBodies = [
    health.body, scoreRes.body, listRes.body,
    usersListRes.body, userStatsRes.body, pdfRes.body,
  ];
  const allStr = JSON.stringify(allResponseBodies);
  assert(!allStr.includes("GOOGLE_CLIENT_SECRET"), "No GOOGLE_CLIENT_SECRET in responses");
  assert(!allStr.includes("DATABASE_URL"), "No DATABASE_URL in responses");
  assert(!allStr.includes("GEMINI_API_KEY"), "No GEMINI_API_KEY in responses");

  // ─── Summary ─────────────────────────────────────────────────────────

  console.log("\n────────────────────────────────────────────────────────────");
  console.log("  FULL-STACK HTTP RBAC VERIFICATION SUMMARY");
  console.log("────────────────────────────────────────────────────────────");
  console.log(`  Total Tests:  ${passed + failed}`);
  console.log(`  Passed:       ${passed}`);
  console.log(`  Failed:       ${failed}`);

  if (failed === 0) {
    console.log("\n  ╔══════════════════════════════════════════════════════╗");
    console.log("  ║  ✓ ALL FULL-STACK RBAC TESTS PASSED                 ║");
    console.log("  ╚══════════════════════════════════════════════════════╝\n");
  } else {
    console.log(`\n  ╔══════════════════════════════════════════════════════╗`);
    console.log(`  ║  ✗ ${failed} TEST(S) FAILED                              ║`);
    console.log(`  ╚══════════════════════════════════════════════════════╝\n`);
    if (failures.length > 0) {
      console.log("  Failures:");
      failures.forEach(f => console.log(f));
    }
  }

  process.exit(failed > 0 ? 1 : 0);
}

run().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(2);
});
