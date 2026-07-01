import { spawn } from "node:child_process";
import { setTimeout as delay } from "node:timers/promises";

const port = process.env.VIBEPROOF_E2E_PORT ?? "3012";
const baseUrl = `http://127.0.0.1:${port}`;

function spawnNode(args, options = {}) {
  return spawn(process.execPath, args, {
    stdio: options.stdio ?? "inherit",
    env: { ...process.env, ...(options.env ?? {}) },
    windowsHide: true
  });
}

async function waitForServer() {
  const deadline = Date.now() + 120000;
  while (Date.now() < deadline) {
    try {
      const response = await fetch(baseUrl);
      if (response.ok) {
        return;
      }
    } catch {
      await delay(500);
    }
  }
  throw new Error(`Timed out waiting for ${baseUrl}`);
}

function waitForExit(child) {
  return new Promise((resolve) => {
    child.once("exit", (code) => resolve(code ?? 1));
  });
}

async function stopServer(child) {
  if (child.exitCode !== null) {
    return;
  }
  child.kill("SIGTERM");
  await delay(1000);
  if (child.exitCode === null && process.platform === "win32") {
    await new Promise((resolve) => {
      const killer = spawn("taskkill", ["/PID", String(child.pid), "/T", "/F"], {
        stdio: "ignore",
        windowsHide: true
      });
      killer.once("exit", resolve);
    });
  }
}

const server = spawnNode(["node_modules/next/dist/bin/next", "dev", "apps/web", "--hostname", "127.0.0.1", "--port", port], {
  stdio: "ignore"
});

let exitCode = 1;
try {
  await waitForServer();
  const testProcess = spawnNode(["node_modules/@playwright/test/cli.js", "test"], {
    env: { VIBEPROOF_E2E_PORT: port }
  });
  exitCode = await waitForExit(testProcess);
} finally {
  await stopServer(server);
}

process.exit(exitCode);

