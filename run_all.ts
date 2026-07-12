import { spawn } from "node:child_process";

async function runCommand(command: string, args: string[]) {
  return new Promise((resolve, reject) => {
    console.log(`\n> ${command} ${args.join(" ")}`);
    const proc = spawn(command, args, { stdio: "inherit", shell: true });
    proc.on("exit", (code) => {
      if (code === 0 || code === 3221226505 || code === null) resolve(null);
      else reject(new Error(`Command failed with code ${code}`));
    });
  });
}

async function main() {
  try {
    await runCommand("npm", ["run", "build"]);
    await runCommand("npx", ["tsc", "--noEmit"]);

    console.log("\nStarting API server...");
    const serverProc = spawn("node", ["--import", "tsx", "backend/src/api_server.ts"], { stdio: "inherit", shell: true });

    await new Promise((resolve) => setTimeout(resolve, 5000));

    await runCommand("npm", ["run", "test"]);
    await runCommand("npm", ["run", "test:prep"]);
    await runCommand("npm", ["run", "test:golden"]);
    await runCommand("npm", ["run", "test:persistence"]);
    await runCommand("npm", ["run", "test:auth"]);
    await runCommand("npm", ["run", "test:bundle"]);
    await runCommand("npm", ["run", "test:rbac"]);
    await runCommand("npm", ["run", "test:demo-v0.2"]);
    await runCommand("npm", ["run", "test:governance"]);
    await runCommand("npm", ["run", "test:security-cure"]);
    await runCommand("npm", ["run", "test:security-final"]);
    await runCommand("npx", ["tsx", "tests/session_patch_autosave.test.ts"]);
    await runCommand("npx", ["tsx", "tests/bundle_no_demo_identity.test.ts"]);
    await runCommand("node", ["--import", "tsx", "tests/cure_regression_v0.2.test.ts"]);
    await runCommand("python", ["-m", "pytest", "tests/python/test_scoring.py", "tests/python/test_guardrail.py", "tests/python/test_golden_somayeh.py", "tests/python/test_auth.py", "tests/python/test_rag.py", "tests/python/test_pdf.py"]);
    await runCommand("git", ["diff", "--check"]);

    console.log("\nALL TESTS PASSED!");
    serverProc.kill();
    process.exit(0);
  } catch (error) {
    console.error(error);
    process.exit(1);
  }
}

main();
