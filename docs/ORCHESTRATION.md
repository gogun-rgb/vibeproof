# VibeProof Orchestration

The Codex agent owns planning, implementation, review, verification, and final approval. Completion is based on inspected diffs, real command output, and evidence-backed findings.

## Gate 1 - Design

Status: PASS for v0.1.0 scope.

Included:

- Static source acquisition for local folders and public GitHub URLs.
- Deterministic scanners.
- Deterministic scoring.
- Verifier that checks schema, rule metadata, file existence, line numbers, evidence, and score.
- CLI with terminal, JSON, and Markdown output.
- Web UI connected to the same scanner engine.
- Safe and risky fixtures.
- Unit, integration, E2E, lint, typecheck, and build commands.

Excluded:

- Payments, login, accounts, hosted jobs, browser extensions.
- Automatic vulnerability fixing.
- Default execution of target repository code.
- AI-based scoring or AI-based verdicts.
- Docker sandbox as a required v0.1 feature.

## Result Evidence Contract

Every implementation or review task must report:

- Task ID
- Objective
- Files changed
- Commands executed
- Exit codes
- Test result
- Build result
- Errors found
- Remaining limitations
- Git diff summary
- Git status
