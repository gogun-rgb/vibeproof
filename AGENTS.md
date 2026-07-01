# AGENTS.md

VibeProof work follows a GPT Team Leader loop. Workers may provide patches or evidence, but they cannot declare completion. The team leader must inspect code, diff, tests, security posture, and documentation before any PASS decision.

## Required Loop

1. Analyze requirements and current code.
2. Define a bounded work order with allowed files and prohibited actions.
3. Implement the smallest useful checkpoint.
4. Run the relevant tests.
5. Review the actual diff and command output.
6. Fix root causes without weakening tests or hiding errors.
7. Re-run the full verification command before final approval.

## Non-Negotiable Rules

- Never execute scanned repository code during a default scan.
- Never run target repository install scripts such as `npm install`, `pip install`, `setup`, `build`, or `test`.
- Do not use LLM guesses for deterministic risk scoring.
- Every finding must point to a real file path, line number, rule ID, masked evidence, explanation, and remediation.
- Do not expose API keys, tokens, or secrets in reports or logs.
- Do not commit `.env` files.
- Do not use destructive Git commands such as `git reset --hard` or `git clean -fd`.
- Do not claim verification passed unless the command actually ran and passed.
- Do not remove or weaken failing tests to pass CI.
- If the same issue fails twice, stop and reassess the approach.

## Verification

Run all of these before declaring a release-ready state:

```powershell
npm run typecheck
npm run lint
npm run test
npm run build
npm run test:e2e
```

or:

```powershell
npm run verify
```

