import path from "node:path";
import { describe, expect, it } from "vitest";
import { runScan } from "../src/index";

const fixturesRoot = path.resolve(process.cwd(), "fixtures");

describe("runScan", () => {
  it("returns ALLOW for a safe local folder", async () => {
    const report = await runScan(path.join(fixturesRoot, "safe-node"));
    expect(report.score.verdict).toBe("ALLOW");
    expect(report.findings).toEqual([]);
    expect(report.staticOnlyNotice).toBe("No repository code was executed during this scan.");
    expect(report.validationErrors).toEqual([]);
  });

  it("returns BLOCK for risky postinstall fixture and verifies evidence", async () => {
    const report = await runScan(path.join(fixturesRoot, "risky-postinstall"));
    expect(report.score.verdict).toBe("BLOCK");
    expect(report.score.forceBlock).toBe(true);
    expect(report.validationErrors).toEqual([]);
    expect(report.findings.some((finding) => finding.filePath === "package.json" && finding.startLine === 5)).toBe(true);
  });

  it("isolates scanner output even when one category has no matches", async () => {
    const report = await runScan(path.join(fixturesRoot, "risky-docker"));
    expect(report.scannerResults.every((result) => result.status === "completed")).toBe(true);
    expect(report.findings.map((finding) => finding.ruleId)).toContain("CONTAINER_DOCKER_SOCKET_CRITICAL");
  });

  it("records missing API key state without changing deterministic static results", async () => {
    const previousKey = process.env.OPENAI_API_KEY;
    delete process.env.OPENAI_API_KEY;
    try {
      const report = await runScan(path.join(fixturesRoot, "safe-node"), { explain: true, noAi: false });
      expect(report.aiReviewEnabled).toBe(false);
      expect(report.providerFailures[0]?.message).toContain("OPENAI_API_KEY is not configured");
      expect(report.score.verdict).toBe("ALLOW");
    } finally {
      if (previousKey) {
        process.env.OPENAI_API_KEY = previousKey;
      }
    }
  });

  it("records GPT provider failure state without changing static verdicts", async () => {
    const previousKey = process.env.OPENAI_API_KEY;
    process.env.OPENAI_API_KEY = "test-key";
    try {
      const report = await runScan(path.join(fixturesRoot, "safe-node"), { explain: true, noAi: false });
      expect(report.providerFailures[0]?.message).toContain("reserved for a future release");
      expect(report.score.verdict).toBe("ALLOW");
    } finally {
      if (previousKey) {
        process.env.OPENAI_API_KEY = previousKey;
      } else {
        delete process.env.OPENAI_API_KEY;
      }
    }
  });
});
