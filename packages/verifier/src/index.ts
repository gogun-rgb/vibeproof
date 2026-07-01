import { evidenceAppearsInLine, getLine, type Finding, type SourceFile, type ValidationError } from "@vibeproof/core";
import { getRule, ruleById } from "@vibeproof/rules";
import { scoreFindings } from "@vibeproof/scanners";
import { z } from "zod";

export const findingSchema = z.object({
  id: z.string().min(1),
  ruleId: z.string().min(1),
  category: z.string().min(1),
  severity: z.enum(["low", "medium", "high", "critical"]),
  filePath: z.string().min(1),
  startLine: z.number().int().positive(),
  endLine: z.number().int().positive().optional(),
  evidence: z.string().min(1).max(240),
  explanation: z.string().min(1),
  remediation: z.string().min(1),
  scoreContribution: z.number().int().nonnegative()
});

export const publicReportSchema = z.object({
  runId: z.string().min(1),
  target: z.string().min(1),
  targetType: z.enum(["github", "local"]),
  startedAt: z.string().min(1),
  completedAt: z.string().min(1),
  findings: z.array(findingSchema),
  score: z.object({
    rawScore: z.number().int().nonnegative(),
    duplicateSuppressed: z.number().int().nonnegative(),
    finalScore: z.number().int().min(0).max(100),
    forceBlock: z.boolean(),
    verdict: z.enum(["ALLOW", "WARN", "BLOCK"]),
    breakdown: z.array(
      z.object({
        findingId: z.string(),
        ruleId: z.string(),
        contribution: z.number().int().nonnegative()
      })
    )
  }),
  staticOnlyNotice: z.literal("No repository code was executed during this scan.")
});

export interface VerificationResult {
  ok: boolean;
  errors: ValidationError[];
}

export function verifyFindings(files: SourceFile[], findings: Finding[]): VerificationResult {
  const errors: ValidationError[] = [];
  const fileByPath = new Map(files.map((file) => [file.path, file]));

  for (const finding of findings) {
    const parsed = findingSchema.safeParse(finding);
    if (!parsed.success) {
      errors.push({
        code: "FINDING_SCHEMA_INVALID",
        message: parsed.error.issues.map((issue) => issue.message).join("; "),
        findingId: finding.id
      });
      continue;
    }

    const rule = ruleById.get(finding.ruleId);
    if (!rule) {
      errors.push({
        code: "UNKNOWN_RULE",
        message: `Unknown ruleId ${finding.ruleId}.`,
        findingId: finding.id
      });
      continue;
    }
    if (finding.severity !== rule.severity || finding.scoreContribution !== rule.score || finding.category !== rule.category) {
      errors.push({
        code: "RULE_METADATA_MISMATCH",
        message: `Finding metadata does not match rule ${finding.ruleId}.`,
        findingId: finding.id
      });
    }

    const file = fileByPath.get(finding.filePath);
    if (!file) {
      errors.push({
        code: "FILE_NOT_FOUND",
        message: `Finding references missing file ${finding.filePath}.`,
        findingId: finding.id
      });
      continue;
    }

    const lines = file.content.split(/\r?\n/);
    if (finding.startLine < 1 || finding.startLine > lines.length) {
      errors.push({
        code: "LINE_OUT_OF_RANGE",
        message: `Line ${finding.startLine} is outside ${finding.filePath}.`,
        findingId: finding.id
      });
      continue;
    }

    const line = getLine(file.content, finding.startLine);
    if (!evidenceAppearsInLine(finding.evidence, line)) {
      errors.push({
        code: "EVIDENCE_NOT_ON_LINE",
        message: `Evidence for ${finding.id} is not present on the referenced line.`,
        findingId: finding.id
      });
    }
  }

  return { ok: errors.length === 0, errors };
}

export function verifyScore(findings: Finding[], reportedScore: ReturnType<typeof scoreFindings>): VerificationResult {
  const recalculated = scoreFindings(findings);
  const errors: ValidationError[] = [];
  if (
    recalculated.finalScore !== reportedScore.finalScore ||
    recalculated.verdict !== reportedScore.verdict ||
    recalculated.forceBlock !== reportedScore.forceBlock
  ) {
    errors.push({
      code: "SCORE_MISMATCH",
      message: "Reported score or verdict does not match deterministic recalculation."
    });
  }
  for (const item of reportedScore.breakdown) {
    const rule = getRule(item.ruleId);
    if (item.contribution !== rule.score) {
      errors.push({
        code: "SCORE_CONTRIBUTION_MISMATCH",
        message: `Score contribution for ${item.ruleId} does not match the rule.`
      });
    }
  }
  return { ok: errors.length === 0, errors };
}

