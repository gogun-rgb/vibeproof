import path from "node:path";
import { describe, expect, it } from "vitest";
import { runScan } from "@vibeproof/orchestrator";
import { verifyFindings, verifyScore } from "../src/index";

const fixturesRoot = path.resolve(process.cwd(), "fixtures");

describe("verifier", () => {
  it("rejects findings whose line number no longer matches evidence", async () => {
    const report = await runScan(path.join(fixturesRoot, "risky-postinstall"));
    const tampered = [{ ...report.findings[0], startLine: 1 }];
    const result = verifyFindings(report.files, tampered);
    expect(result.ok).toBe(false);
    expect(result.errors.map((error) => error.code)).toContain("EVIDENCE_NOT_ON_LINE");
  });

  it("rejects unknown rule ids and rule metadata mismatches", async () => {
    const report = await runScan(path.join(fixturesRoot, "risky-postinstall"));
    const unknownRule = verifyFindings(report.files, [{ ...report.findings[0], ruleId: "UNKNOWN_RULE" }]);
    const metadataMismatch = verifyFindings(report.files, [{ ...report.findings[0], scoreContribution: 1 }]);

    expect(unknownRule.errors.map((error) => error.code)).toContain("UNKNOWN_RULE");
    expect(metadataMismatch.errors.map((error) => error.code)).toContain("RULE_METADATA_MISMATCH");
  });

  it("recalculates score and validates score breakdown contributions", async () => {
    const report = await runScan(path.join(fixturesRoot, "risky-postinstall"));
    const mismatchedScore = verifyScore(report.findings, { ...report.score, finalScore: 0 });
    const mismatchedContribution = verifyScore(report.findings, {
      ...report.score,
      breakdown: [{ ...report.score.breakdown[0], contribution: 999 }]
    });

    expect(mismatchedScore.errors.map((error) => error.code)).toContain("SCORE_MISMATCH");
    expect(mismatchedContribution.errors.map((error) => error.code)).toContain("SCORE_CONTRIBUTION_MISMATCH");
  });
});
