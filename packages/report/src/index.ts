import type { Finding, ScanReport } from "@vibeproof/core";

export type OutputFormat = "terminal" | "json" | "markdown";

function severityRank(severity: Finding["severity"]): number {
  return { critical: 4, high: 3, medium: 2, low: 1 }[severity];
}

function sortedFindings(report: ScanReport): Finding[] {
  return [...report.findings].sort((left, right) => {
    const severityDiff = severityRank(right.severity) - severityRank(left.severity);
    if (severityDiff !== 0) {
      return severityDiff;
    }
    return left.filePath.localeCompare(right.filePath) || left.startLine - right.startLine;
  });
}

export function toPublicJson(report: ScanReport): string {
  const publicReport = {
    runId: report.runId,
    target: report.target,
    targetType: report.targetType,
    startedAt: report.startedAt,
    completedAt: report.completedAt,
    verdict: report.score.verdict,
    riskScore: report.score.finalScore,
    score: report.score,
    findings: sortedFindings(report),
    scannerResults: report.scannerResults.map((result) => ({
      scannerId: result.scannerId,
      status: result.status,
      errors: result.errors,
      filesScanned: result.filesScanned,
      findings: result.findings.length
    })),
    validationErrors: report.validationErrors,
    providerFailures: report.providerFailures,
    staticOnlyNotice: report.staticOnlyNotice
  };
  return `${JSON.stringify(publicReport, null, 2)}\n`;
}

export function toMarkdown(report: ScanReport): string {
  const lines = [
    "# VibeProof Risk Report",
    "",
    `Verdict: ${report.score.verdict}`,
    `Risk Score: ${report.score.finalScore}/100`,
    "",
    "## Findings"
  ];

  if (report.findings.length === 0) {
    lines.push("", "No findings.");
  } else {
    for (const finding of sortedFindings(report)) {
      lines.push(
        "",
        `### ${finding.severity.toUpperCase()} ${finding.ruleId}`,
        "",
        `- File: \`${finding.filePath}:${finding.startLine}\``,
        `- Evidence: \`${finding.evidence}\``,
        `- Explanation: ${finding.explanation}`,
        `- Remediation: ${finding.remediation}`
      );
    }
  }

  lines.push("", "## Evidence", "");
  for (const finding of sortedFindings(report)) {
    lines.push(`- ${finding.filePath}:${finding.startLine}`);
  }
  lines.push("", report.staticOnlyNotice, "");
  return lines.join("\n");
}

export function toTerminal(report: ScanReport): string {
  const lines = [
    "VibeProof Risk Report",
    "",
    `Verdict: ${report.score.verdict}`,
    `Risk Score: ${report.score.finalScore}/100`,
    ""
  ];

  for (const finding of sortedFindings(report)) {
    lines.push(
      `${finding.severity.toUpperCase().padEnd(8)} ${finding.filePath}:${finding.startLine} ${finding.ruleId}`,
      `         ${finding.evidence}`
    );
  }
  if (report.findings.length === 0) {
    lines.push("No findings.");
  }
  lines.push("", "Evidence:");
  for (const finding of sortedFindings(report)) {
    lines.push(`- ${finding.filePath}:${finding.startLine}`);
  }
  lines.push("", report.staticOnlyNotice, "");
  return lines.join("\n");
}

export function formatReport(report: ScanReport, format: OutputFormat): string {
  if (format === "json") {
    return toPublicJson(report);
  }
  if (format === "markdown") {
    return toMarkdown(report);
  }
  return toTerminal(report);
}

