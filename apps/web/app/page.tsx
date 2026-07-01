"use client";

import { FormEvent, useMemo, useState } from "react";

type Finding = {
  id: string;
  ruleId: string;
  severity: "low" | "medium" | "high" | "critical";
  filePath: string;
  startLine: number;
  evidence: string;
  explanation: string;
  remediation: string;
};

type ScanResponse = {
  report: {
    verdict: "ALLOW" | "WARN" | "BLOCK";
    riskScore: number;
    findings: Finding[];
    staticOnlyNotice: string;
    validationErrors: Array<{ code: string; message: string }>;
  };
  markdown: string;
};

const stages = [
  "TARGET_VALIDATION",
  "SOURCE_ACQUISITION",
  "PARALLEL_STATIC_SCAN",
  "DETERMINISTIC_SCORING",
  "CODE_VERIFICATION",
  "REPORT_GENERATION"
];

function download(name: string, type: string, content: string) {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = name;
  link.click();
  URL.revokeObjectURL(url);
}

export default function Home() {
  const [target, setTarget] = useState("https://github.com/owner/repository");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState<ScanResponse | null>(null);

  const jsonText = useMemo(() => (result ? JSON.stringify(result.report, null, 2) : ""), [result]);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError("");
    setResult(null);
    try {
      const response = await fetch("/api/scan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ target })
      });
      const body = (await response.json()) as ScanResponse | { error?: string };
      if (!response.ok) {
        throw new Error("error" in body && body.error ? body.error : "Scan failed.");
      }
      setResult(body as ScanResponse);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Scan failed.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="shell">
      <header className="topbar">
        <div className="topbar-inner">
          <div className="brand">
            <strong>VibeProof</strong>
            <span>Scan before your AI runs it.</span>
          </div>
          <span className="muted">Static first. GPT optional.</span>
        </div>
      </header>

      <section className="workspace">
        <div className="hero">
          <div>
            <h1>Paste a GitHub repository. See what your AI agent would run.</h1>
            <p className="subtitle">
              VibeProof checks install hooks, agent instructions, MCP permissions, container settings, dependency risk, and secret-like text before code execution.
            </p>
          </div>

          <form className="scan-panel" onSubmit={submit}>
            <label htmlFor="target">GitHub repository URL</label>
            <input
              id="target"
              className="target-input"
              value={target}
              onChange={(event) => setTarget(event.target.value)}
              placeholder="https://github.com/owner/repository"
            />
            <div className="actions">
              <button className="primary" disabled={loading} type="submit">
                {loading ? "Scanning..." : "Scan"}
              </button>
              {result ? (
                <>
                  <button className="secondary" type="button" onClick={() => download("vibeproof-report.json", "application/json", jsonText)}>
                    JSON
                  </button>
                  <button className="secondary" type="button" onClick={() => download("vibeproof-report.md", "text/markdown", result.markdown)}>
                    Markdown
                  </button>
                </>
              ) : null}
            </div>
            <ul className="stages" aria-label="scan stages">
              {stages.map((stage, index) => (
                <li key={stage} className={loading && index < stages.length ? "stage-active" : ""}>
                  {stage}
                </li>
              ))}
            </ul>
            {error ? <p className="error">{error}</p> : null}
          </form>
        </div>

        {result ? (
          <section className="results" aria-label="scan results">
            <div className="result-panel">
              <div className="result-header">
                <span className={`verdict ${result.report.verdict}`}>{result.report.verdict}</span>
                <div>
                  <div className="score">{result.report.riskScore}/100</div>
                  <div className="muted">{result.report.staticOnlyNotice}</div>
                </div>
              </div>
              {result.report.validationErrors.length > 0 ? (
                <p className="error">Verifier rejected this report. Do not treat it as complete.</p>
              ) : null}
            </div>

            <div className="result-panel">
              <h2>Verified findings</h2>
              <div className="finding-list">
                {result.report.findings.length === 0 ? <p>No findings.</p> : null}
                {result.report.findings.map((finding) => (
                  <article className="finding" key={finding.id}>
                    <div className="finding-title">
                      <strong>
                        {finding.severity.toUpperCase()} {finding.ruleId}
                      </strong>
                      <code>
                        {finding.filePath}:{finding.startLine}
                      </code>
                    </div>
                    <p>
                      <code>{finding.evidence}</code>
                    </p>
                    <p>{finding.explanation}</p>
                    <p className="muted">{finding.remediation}</p>
                  </article>
                ))}
              </div>
            </div>

            <div className="result-panel">
              <h2>GPT-reviewed explanation</h2>
              <p className="muted">Optional GPT review is separate from verified static findings and is disabled by default in v0.1.0.</p>
            </div>
          </section>
        ) : null}
      </section>
    </main>
  );
}

