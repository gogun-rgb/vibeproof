import path from "node:path";
import { describe, expect, it } from "vitest";
import { runCli } from "../src/index";
import { runScan } from "../../orchestrator/src/index";
import { runStaticScanners } from "../../scanners/src/index";

const fixturesRoot = path.resolve(process.cwd(), "fixtures");

function createIo() {
  let stdout = "";
  let stderr = "";
  return {
    io: {
      stdout: { write: (message: string) => { stdout += message; } },
      stderr: { write: (message: string) => { stderr += message; } }
    },
    get stdout() {
      return stdout;
    },
    get stderr() {
      return stderr;
    }
  };
}

describe("CLI", () => {
  it("prints terminal output and returns BLOCK exit code for risky fixture", async () => {
    const capture = createIo();
    const code = await runCli(["scan", path.join(fixturesRoot, "risky-postinstall")], capture.io);
    expect(code).toBe(2);
    expect(capture.stdout).toContain("VibeProof Risk Report");
    expect(capture.stdout).toContain("No repository code was executed during this scan.");
    expect(capture.stdout).toContain("package.json:5");
    expect(capture.stderr).toBe("");
  });

  it("supports JSON output and fail-on block semantics", async () => {
    const capture = createIo();
    const code = await runCli(["scan", path.join(fixturesRoot, "safe-node"), "--format", "json", "--fail-on", "block"], capture.io);
    const body = JSON.parse(capture.stdout) as { verdict: string; riskScore: number };
    expect(code).toBe(0);
    expect(body.verdict).toBe("ALLOW");
    expect(body.riskScore).toBe(0);
  });

  it("returns WARN exit code and supports Markdown output", async () => {
    const capture = createIo();
    const code = await runCli(["scan", path.join(fixturesRoot, "risky-agent-single"), "--format", "markdown"], capture.io);
    expect(code).toBe(1);
    expect(capture.stdout).toContain("# VibeProof Risk Report");
    expect(capture.stdout).toContain("Verdict: WARN");
    expect(capture.stdout).toContain("AGENT_DANGEROUS_INSTRUCTION_HIGH");
    expect(capture.stdout).toContain("No repository code was executed during this scan.");
    expect(capture.stderr).toBe("");
  });

  it("returns internal error exit code for invalid scan targets", async () => {
    const capture = createIo();
    const code = await runCli(["scan", "https://example.com/owner/repo"], capture.io);
    expect(code).toBe(3);
    expect(capture.stderr).toContain("Only https://github.com/owner/repo URLs are supported.");
  });

  it("returns internal error exit code when a scanner failed", async () => {
    const capture = createIo();
    const report = await runScan(path.join(fixturesRoot, "risky-postinstall"), {
      scannerRunner: (files) => [
        {
          scannerId: "broken-scanner",
          status: "failed",
          findings: [],
          errors: ["scanner exploded"],
          filesScanned: files.length,
          startedAt: new Date().toISOString(),
          completedAt: new Date().toISOString()
        },
        ...runStaticScanners(files)
      ]
    });

    const code = await runCli(["scan", path.join(fixturesRoot, "risky-postinstall")], capture.io, {
      runScanImpl: async () => report
    });

    expect(code).toBe(3);
    expect(capture.stdout).toContain("VibeProof Risk Report");
    expect(capture.stdout).toContain("Verdict: BLOCK");
    expect(capture.stderr).toContain("Scanner broken-scanner failed");
  });

  it("lists and explains rules", async () => {
    const list = createIo();
    expect(await runCli(["rules", "list"], list.io)).toBe(0);
    expect(list.stdout).toContain("SCRIPT_REMOTE_EXEC_CRITICAL");

    const explain = createIo();
    expect(await runCli(["explain", "SCRIPT_REMOTE_EXEC_CRITICAL"], explain.io)).toBe(0);
    expect(explain.stdout).toContain("Remote download");
  });
});
