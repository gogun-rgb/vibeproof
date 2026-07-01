# AGENTS.md

VibeProof is maintained by a single Codex agent. Work should stay small, evidence-backed, and verified against the real repository state.

## Operating Rules

- Make the minimum necessary change for the requested outcome.
- Do not execute scanned target repository code during default scans.
- Every finding must include a real file path, line number, rule ID, masked evidence, explanation, and remediation.
- Reproduce bugs with a focused test before fixing them.
- During development, run only the tests relevant to the current change.
- Final release validation is exactly one `npm run verify` run.
- Do not weaken tests, hide failures, or report a failing command as successful.
- Do not use destructive Git commands such as `git reset --hard`, `git checkout --`, or `git clean -fd`.
- Commit, push, and open or merge PRs only after real verification passes.

## Scan Boundaries

- Never run target repository install scripts such as `npm install`, `pip install`, `setup`, `build`, or `test`.
- Do not use AI guesses for deterministic risk scoring.
- Do not expose API keys, tokens, or secrets in reports or logs.
- Do not commit `.env` files.

## Verification

Use focused checks while developing. Before release approval, run:

```powershell
npm run verify
```
