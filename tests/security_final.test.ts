import * as assert from "node:assert";
import { spawn } from "node:child_process";

const TEST_ISSUER = "accounts.google.com";
const TEST_AUDIENCE = process.env.GOOGLE_CLIENT_ID || "test_audience";
const DEMO_EMAIL = "innobaseae@gmail.com";

// Helper to create tokens that fail signature check (test coverage for fallback removal)
function createTestToken(payload: object, alg = "RS256", parts = 3) {
  const header = { alg, typ: "JWT", kid: "fake-key-id" };
  const encode = (obj: object) => Buffer.from(JSON.stringify(obj)).toString("base64url");
  const base = `${encode(header)}.${encode(payload)}`;
  if (parts === 1) return encode(header);
  if (parts === 2) return base;
  return `${base}.fake_signature`;
}

function validPayload(email: string = DEMO_EMAIL) {
  return {
    iss: TEST_ISSUER,
    aud: TEST_AUDIENCE,
    email,
    email_verified: true,
    exp: Math.floor(Date.now() / 1000) + 3600,
    iat: Math.floor(Date.now() / 1000) - 100,
    nbf: Math.floor(Date.now() / 1000) - 100,
    sub: `sub-${email}`
  };
}

async function runTests() {
  console.log("Starting API server for tests...");
  const serverProcess = spawn("node", ["--import", "tsx", "backend/src/api_server.ts"], { stdio: 'inherit' });
  
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
  const methods = ["GET", "POST", "PUT", "PATCH", "DELETE"];
  const paths = [
    "/api/v2/db/run-migration/test.sql",
    "/api/v2/db/run-migration/../tables",
    "/api/v2/db/run-migration/%2e%2e%2ftables",
    "/api/v2/db/run-migration\\test.sql",
    "/api/v2/db//run-migration/test.sql",
    "/api/v2/db/run-migration/test.sql/",
    "/api/v2/db/run-migration/test.sql?bypass=1"
  ];

  for (const method of methods) {
    for (const p of paths) {
      await test(`SEC-01: ${method} ${p} is denied`, async () => {
        const res = await fetch(`${baseUrl}${p}`, { method });
        assert.notStrictEqual(res.status, 200);
        assert.notStrictEqual(res.status, 201);
      });
    }
  }

  // --- SEC-02 Tests ---
  await test("SEC-02: Missing Authorization returns 401", async () => {
    const res = await fetch(`${baseUrl}/api/v2/users/me`);
    assert.strictEqual(res.status, 401);
  });

  await test("SEC-02: Invalid scheme returns 401", async () => {
    const res = await fetch(`${baseUrl}/api/v2/users/me`, { headers: { Authorization: "Basic token" } });
    assert.strictEqual(res.status, 401);
  });

  await test("SEC-02: Empty Bearer returns 401", async () => {
    const res = await fetch(`${baseUrl}/api/v2/users/me`, { headers: { Authorization: "Bearer " } });
    assert.strictEqual(res.status, 401);
  });

  await test("SEC-02: Malformed/One-part token returns 401", async () => {
    const res = await fetch(`${baseUrl}/api/v2/users/me`, { headers: { Authorization: `Bearer ${createTestToken(validPayload(), "RS256", 1)}` } });
    assert.strictEqual(res.status, 401);
  });

  await test("SEC-02: Two-part token returns 401", async () => {
    const res = await fetch(`${baseUrl}/api/v2/users/me`, { headers: { Authorization: `Bearer ${createTestToken(validPayload(), "RS256", 2)}` } });
    assert.strictEqual(res.status, 401);
  });

  await test("SEC-02: alg:none returns 401", async () => {
    const res = await fetch(`${baseUrl}/api/v2/users/me`, { headers: { Authorization: `Bearer ${createTestToken(validPayload(), "none")}` } });
    assert.strictEqual(res.status, 401);
  });

  await test("SEC-02: Tampered payload returns 401", async () => {
    const res = await fetch(`${baseUrl}/api/v2/users/me`, { headers: { Authorization: `Bearer ${createTestToken(validPayload())}xyz` } });
    assert.strictEqual(res.status, 401);
  });

  await test("SEC-02: Tampered signature returns 401", async () => {
    const res = await fetch(`${baseUrl}/api/v2/users/me`, { headers: { Authorization: `Bearer ${createTestToken(validPayload())}` } });
    assert.strictEqual(res.status, 401);
  });

  await test("SEC-02: Expired token returns 401", async () => {
    const p = validPayload(); p.exp = Math.floor(Date.now() / 1000) - 3600;
    const res = await fetch(`${baseUrl}/api/v2/users/me`, { headers: { Authorization: `Bearer ${createTestToken(p)}` } });
    assert.strictEqual(res.status, 401);
  });

  await test("SEC-02: Future nbf returns 401", async () => {
    const p = validPayload(); p.nbf = Math.floor(Date.now() / 1000) + 3600;
    const res = await fetch(`${baseUrl}/api/v2/users/me`, { headers: { Authorization: `Bearer ${createTestToken(p)}` } });
    assert.strictEqual(res.status, 401);
  });

  await test("SEC-02: Future iat returns 401", async () => {
    const p = validPayload(); p.iat = Math.floor(Date.now() / 1000) + 3600;
    const res = await fetch(`${baseUrl}/api/v2/users/me`, { headers: { Authorization: `Bearer ${createTestToken(p)}` } });
    assert.strictEqual(res.status, 401);
  });

  await test("SEC-02: Wrong audience returns 401", async () => {
    const p = validPayload(); p.aud = "wrong-aud";
    const res = await fetch(`${baseUrl}/api/v2/users/me`, { headers: { Authorization: `Bearer ${createTestToken(p)}` } });
    assert.strictEqual(res.status, 401);
  });

  await test("SEC-02: Wrong issuer returns 401", async () => {
    const p = validPayload(); p.iss = "wrong-iss";
    const res = await fetch(`${baseUrl}/api/v2/users/me`, { headers: { Authorization: `Bearer ${createTestToken(p)}` } });
    assert.strictEqual(res.status, 401);
  });

  await test("SEC-02: Missing email returns 401", async () => {
    const p: any = validPayload(); delete p.email;
    const res = await fetch(`${baseUrl}/api/v2/users/me`, { headers: { Authorization: `Bearer ${createTestToken(p)}` } });
    assert.strictEqual(res.status, 401);
  });

  await test("SEC-02: email_verified=false returns 401", async () => {
    const p = validPayload(); p.email_verified = false;
    const res = await fetch(`${baseUrl}/api/v2/users/me`, { headers: { Authorization: `Bearer ${createTestToken(p)}` } });
    assert.strictEqual(res.status, 401);
  });

  // --- SEC-03 Tests ---
  await test("SEC-03: DB tables missing token -> 401", async () => {
    const res = await fetch(`${baseUrl}/api/v2/db/tables`);
    assert.strictEqual(res.status, 401);
  });

  await test("SEC-03: DB tables invalid token -> 401", async () => {
    const res = await fetch(`${baseUrl}/api/v2/db/tables`, { headers: { Authorization: `Bearer ${createTestToken(validPayload())}` } });
    assert.strictEqual(res.status, 401);
  });
  
  await test("SEC-03: public health exposes no schema/table metadata", async () => {
    const res = await fetch(`${baseUrl}/api/health`);
    assert.strictEqual(res.status, 200);
    const body = await res.json();
    assert.strictEqual(body.schema, undefined);
    assert.strictEqual(body.tables, undefined);
  });

  if (failed > 0) {
    console.error(`\nFAILED: ${failed} tests failed. Passed: ${passed}`);
    serverProcess.kill();
    process.exit(1);
  } else {
    console.log(`\nSUCCESS: All ${passed} tests passed.`);
    serverProcess.kill();
    process.exit(0);
  }
}

runTests().catch((e) => {
  console.error("Test execution failed:", e);
  process.exit(1);
});
