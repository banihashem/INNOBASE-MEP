import * as assert from "node:assert";
import "../backend/src/api_server.js";
const TEST_ISSUER = "accounts.google.com";
const TEST_AUDIENCE = process.env.GOOGLE_CLIENT_ID || "test_audience";
const DEMO_EMAIL = "innobaseae@gmail.com";

function createUnsignedToken(payload: object) {
  const header = { alg: "RS256", typ: "JWT", kid: "fake-key-id" };
  const encode = (obj: object) => Buffer.from(JSON.stringify(obj)).toString("base64url");
  return `${encode(header)}.${encode(payload)}.unsigned_signature`;
}

function createExpiredToken() {
  const payload = {
    iss: TEST_ISSUER,
    aud: TEST_AUDIENCE,
    email: DEMO_EMAIL,
    exp: Math.floor(Date.now() / 1000) - 3600, // Expired 1 hour ago
  };
  return createUnsignedToken(payload);
}

async function runTests() {
  // Give the server a moment to bind to the port
  await new Promise((resolve) => setTimeout(resolve, 2000));
  
  const port = 3001;
  const baseUrl = `http://127.0.0.1:${port}`;

  console.log(`Running tests against ${baseUrl}`);

  let passed = 0;
  let failed = 0;

  async function test(name: string, fn: () => Promise<void>) {
    try {
      await fn();
      console.log(`✅ [PASS] ${name}`);
      passed++;
    } catch (e: any) {
      console.error(`❌ [FAIL] ${name}\n   ${e.message}`);
      failed++;
    }
  }

  // --- SEC-01 Tests ---
  await test("SEC-01: GET /api/v2/db/run-migration/:name returns 403", async () => {
    const res = await fetch(`${baseUrl}/api/v2/db/run-migration/test.sql`);
    assert.strictEqual(res.status, 403);
    const body = await res.json();
    assert.strictEqual(body.error, "Migration execution via public web route is disabled. Use the deployment pipeline.");
  });

  await test("SEC-01: POST /api/v2/db/run-migration/:name fails closed", async () => {
    const res = await fetch(`${baseUrl}/api/v2/db/run-migration/test.sql`, { method: "POST" });
    assert.notStrictEqual(res.status, 200);
    assert.notStrictEqual(res.status, 201);
  });

  // --- SEC-02 Tests ---
  await test("SEC-02: Missing token returns 401", async () => {
    const res = await fetch(`${baseUrl}/api/v2/users/me`);
    assert.strictEqual(res.status, 401);
  });

  await test("SEC-02: Malformed token returns 401", async () => {
    const res = await fetch(`${baseUrl}/api/v2/users/me`, {
      headers: { Authorization: "Bearer not.a.valid.token" },
    });
    assert.strictEqual(res.status, 401);
  });

  await test("SEC-02: Unsigned JWT (fallback removal) returns 401", async () => {
    const payload = {
      iss: TEST_ISSUER,
      aud: TEST_AUDIENCE,
      email: DEMO_EMAIL,
      exp: Math.floor(Date.now() / 1000) + 3600,
    };
    const token = createUnsignedToken(payload);
    const res = await fetch(`${baseUrl}/api/v2/users/me`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    assert.strictEqual(res.status, 401);
  });

  await test("SEC-02: Expired token returns 401", async () => {
    const token = createExpiredToken();
    const res = await fetch(`${baseUrl}/api/v2/users/me`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    assert.strictEqual(res.status, 401);
  });

  await test("SEC-02: Token with wrong issuer returns 401", async () => {
    const payload = {
      iss: "https://hacker.com",
      aud: TEST_AUDIENCE,
      email: DEMO_EMAIL,
      exp: Math.floor(Date.now() / 1000) + 3600,
    };
    const token = createUnsignedToken(payload);
    const res = await fetch(`${baseUrl}/api/v2/users/me`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    assert.strictEqual(res.status, 401);
  });

  await test("SEC-02: Token with wrong audience returns 401", async () => {
    const payload = {
      iss: TEST_ISSUER,
      aud: "wrong_audience_id",
      email: DEMO_EMAIL,
      exp: Math.floor(Date.now() / 1000) + 3600,
    };
    const token = createUnsignedToken(payload);
    const res = await fetch(`${baseUrl}/api/v2/users/me`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    assert.strictEqual(res.status, 401);
  });

  if (failed > 0) {
    console.error(`\nFAILED: ${failed} tests failed. Passed: ${passed}`);
    process.exit(1);
  } else {
    console.log(`\nSUCCESS: All ${passed} tests passed.`);
    process.exit(0);
  }
}

runTests().catch((e) => {
  console.error("Test execution failed:", e);
  process.exit(1);
});
