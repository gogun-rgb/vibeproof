export type Severity = "low" | "medium" | "high" | "critical";
export type Verdict = "ALLOW" | "WARN" | "BLOCK";
export type TargetType = "github" | "local";

export type ScanStage =
  | "TARGET_VALIDATION"
  | "SOURCE_ACQUISITION"
  | "FILE_DISCOVERY"
  | "STATIC_SCAN"
  | "EVIDENCE_AGGREGATION"
  | "DETERMINISTIC_SCORING"
  | "GPT_SECURITY_REVIEW"
  | "CODE_VERIFICATION"
  | "REPORT_GENERATION"
  | "COMPLETED"
  | "FAILED";

export interface StageRecord {
  stage: ScanStage;
  startedAt: string;
  completedAt?: string;
  durationMs?: number;
  success: boolean;
  error?: string;
  filesProcessed?: number;
  findingsProduced?: number;
}

export interface SourceFile {
  path: string;
  absolutePath?: string;
  content: string;
  size: number;
  source: TargetType;
}

export interface ScanRule {
  id: string;
  title: string;
  category: "script" | "agent-instruction" | "mcp" | "container" | "secret" | "dependency";
  severity: Severity;
  description: string;
  remediation: string;
  references?: string[];
  score: number;
  forceBlock?: boolean;
}

export interface Finding {
  id: string;
  ruleId: string;
  category: ScanRule["category"];
  severity: Severity;
  filePath: string;
  startLine: number;
  endLine?: number;
  evidence: string;
  explanation: string;
  remediation: string;
  scoreContribution: number;
}

export interface ScannerResult {
  scannerId: string;
  status: "completed" | "failed" | "partial";
  findings: Finding[];
  errors: string[];
  filesScanned: number;
  startedAt: string;
  completedAt: string;
}

export interface ScoreBreakdownItem {
  findingId: string;
  ruleId: string;
  contribution: number;
}

export interface ScoreResult {
  rawScore: number;
  duplicateSuppressed: number;
  breakdown: ScoreBreakdownItem[];
  forceBlock: boolean;
  finalScore: number;
  verdict: Verdict;
}

export interface ValidationError {
  code: string;
  message: string;
  findingId?: string;
}

export interface ProviderFailure {
  provider: string;
  message: string;
}

export interface ScanReport {
  runId: string;
  target: string;
  targetType: TargetType;
  startedAt: string;
  completedAt: string;
  files: SourceFile[];
  findings: Finding[];
  scannerResults: ScannerResult[];
  score: ScoreResult;
  validationErrors: ValidationError[];
  providerFailures: ProviderFailure[];
  aiReviewEnabled: boolean;
  stageHistory: StageRecord[];
  staticOnlyNotice: string;
}

export interface ScanState {
  runId: string;
  target: string;
  targetType: TargetType;
  stage: ScanStage;
  startedAt: string;
  completedAt?: string;
  files: SourceFile[];
  findings: Finding[];
  scannerResults: ScannerResult[];
  riskScore?: number;
  verdict?: Verdict;
  validationErrors: ValidationError[];
  providerFailures: ProviderFailure[];
  aiReviewEnabled: boolean;
  report?: ScanReport;
}

export const STATIC_ONLY_NOTICE = "No repository code was executed during this scan.";

export function createRunId(prefix = "vp"): string {
  return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

export function splitLines(content: string): string[] {
  return content.split(/\r?\n/);
}

export function getLine(content: string, lineNumber: number): string {
  return splitLines(content)[lineNumber - 1] ?? "";
}

export function findLineNumber(content: string, predicate: (line: string) => boolean): number {
  const lines = splitLines(content);
  const index = lines.findIndex(predicate);
  return index >= 0 ? index + 1 : 1;
}

export function normalizePathForReport(path: string): string {
  return path.replace(/\\/g, "/").replace(/^\/+/, "");
}

export function createFindingId(ruleId: string, filePath: string, line: number, evidence: string): string {
  const base = `${ruleId}:${filePath}:${line}:${evidence}`;
  let hash = 0;
  for (let index = 0; index < base.length; index += 1) {
    hash = (hash * 31 + base.charCodeAt(index)) >>> 0;
  }
  return `finding_${hash.toString(16)}`;
}

export function maskSecretEvidence(value: string): string {
  return value
    .replace(/(sk-[A-Za-z0-9_-]{6})[A-Za-z0-9_-]+([A-Za-z0-9_-]{4})/g, "$1***$2")
    .replace(/([A-Za-z0-9_-]{4})[A-Za-z0-9_-]{16,}([A-Za-z0-9_-]{4})/g, "$1***$2");
}

export function evidenceAppearsInLine(maskedEvidence: string, line: string): boolean {
  if (line.includes(maskedEvidence)) {
    return true;
  }
  const parts = maskedEvidence.split("***").filter((part) => part.length > 0);
  return parts.length > 0 && parts.every((part) => line.includes(part));
}
