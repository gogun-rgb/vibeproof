import path from "node:path";
import { describe, expect, it } from "vitest";
import { runCli } from "../src/index";

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

  it("lists and explains rules", async () => {
    const list = createIo();
    expect(await runCli(["rules", "list"], list.io)).toBe(0);
    expect(list.stdout).toContain("SCRIPT_REMOTE_EXEC_CRITICAL");

    const explain = createIo();
    expect(await runCli(["explain", "SCRIPT_REMOTE_EXEC_CRITICAL"], explain.io)).toBe(0);
    expect(explain.stdout).toContain("Remote download");
  });
});
