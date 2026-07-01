import path from "node:path";
import {
  STATIC_ONLY_NOTICE,
  createRunId,
  maskSecretEvidence,
  type Finding,
  type ScanReport,
  type ScanStage,
  type ScannerResult,
  type SourceFile,
  type StageRecord,
  type TargetType,
  type ValidationError
} from "@vibeproof/core";
import { reviewFindingsWithGpt } from "@vibeproof/ai-providers";
import { discoverGithubFiles, discoverLocalFiles, parseGithubUrl, runStaticScanners, scoreFindings } from "@vibeproof/scanners";
import { verifyFindings, verifyScore } from "@vibeproof/verifier";

export interface RunScanOptions {
  explain?: boolean;
  noAi?: boolean;
  fetchImpl?: typeof fetch;
  githubToken?: string;
  scannerRunner?: (files: SourceFile[]) => ScannerResult[];
}

function sanitizeScannerError(message: string): string {
  return maskSecretEvidence(message)
    .replace(/((?:api[_-]?key|token|secret|password)\s*[:=]\s*)\S+/gi, "$1***")
    .slice(0, 240);
}

function scannerFailureErrors(scannerResults: ScannerResult[]): ValidationError[] {
  return scannerResults
    .filter((result) => result.status === "failed")
    .flatMap((result) => {
      const messages = result.errors.length > 0 ? result.errors : ["Unknown scanner failure."];
      return messages.map((message) => ({
        code: "SCANNER_EXECUTION_FAILED",
        message: `Scanner ${result.scannerId} failed: ${sanitizeScannerError(message)}`
      }));
    });
}

export async function runScan(target: string, options: RunScanOptions = {}): Promise<ScanReport> {
  const runId = createRunId();
  const startedAt = new Date().toISOString();
  const stageHistory: StageRecord[] = [];
  let targetType: TargetType = "local";

  function record<T>(stage: ScanStage, action: () => Promise<T>): Promise<T> {
    const stageStart = Date.now();
    const started = new Date().toISOString();
    return action()
      .then((result) => {
        stageHistory.push({
          stage,
          startedAt: started,
          completedAt: new Date().toISOString(),
          durationMs: Date.now() - stageStart,
          success: true
        });
        return result;
      })
      .catch((error) => {
        stageHistory.push({
          stage,
          startedAt: started,
          completedAt: new Date().toISOString(),
          durationMs: Date.now() - stageStart,
          success: false,
          error: error instanceof Error ? error.message : String(error)
        });
        throw error;
      });
  }

  await record("TARGET_VALIDATION", async () => {
    if (/^https?:\/\//i.test(target)) {
      parseGithubUrl(target);
      targetType = "github";
      return;
    }
    const resolved = path.resolve(target);
    if (resolved.includes("\0")) {
      throw new Error("Local path contains an invalid null byte.");
    }
    targetType = "local";
  });

  const files = await record("SOURCE_ACQUISITION", async () => {
    if (targetType === "github") {
      return discoverGithubFiles(target, {
        fetchImpl: options.fetchImpl,
        githubToken: options.githubToken ?? process.env.GITHUB_TOKEN
      });
    }
    return discoverLocalFiles(target);
  });
  stageHistory.push({
    stage: "FILE_DISCOVERY",
    startedAt: new Date().toISOString(),
    completedAt: new Date().toISOString(),
    durationMs: 0,
    success: true,
    filesProcessed: files.length
  });

  const scannerResults = await record("PARALLEL_STATIC_SCAN", async () => (options.scannerRunner ?? runStaticScanners)(files));
  const findings = await record("EVIDENCE_AGGREGATION", async () => {
    const byId = new Map<string, Finding>();
    for (const result of scannerResults) {
      for (const finding of result.findings) {
        byId.set(finding.id, finding);
      }
    }
    return [...byId.values()];
  });

  const score = await record("DETERMINISTIC_SCORING", async () => scoreFindings(findings));
  const aiReviewEnabled = Boolean(options.explain && !options.noAi);
  const providerReview = await record("GPT_SECURITY_REVIEW", async () =>
    reviewFindingsWithGpt(
      {
        runId,
        target,
        targetType,
        startedAt,
        completedAt: new Date().toISOString(),
        files,
        findings,
        scannerResults,
        score,
        validationErrors: [],
        providerFailures: [],
        aiReviewEnabled,
        stageHistory,
        staticOnlyNotice: STATIC_ONLY_NOTICE
      },
      aiReviewEnabled
    )
  );

  const validationErrors = await record("CODE_VERIFICATION", async () => {
    const findingVerification = verifyFindings(files, findings);
    const scoreVerification = verifyScore(findings, score);
    return [...scannerFailureErrors(scannerResults), ...findingVerification.errors, ...scoreVerification.errors];
  });

  return record("REPORT_GENERATION", async () => ({
    runId,
    target,
    targetType,
    startedAt,
    completedAt: new Date().toISOString(),
    files,
    findings,
    scannerResults,
    score,
    validationErrors,
    providerFailures: providerReview.failures,
    aiReviewEnabled: providerReview.enabled,
    stageHistory,
    staticOnlyNotice: STATIC_ONLY_NOTICE
  }));
}
