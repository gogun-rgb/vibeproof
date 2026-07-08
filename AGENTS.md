# AGENTS.md

VibeProof is maintained by AI-first coding agents. Work should stay small, evidence-backed, and verified against the real repository state.

## Product invariants

- VibeProof is a static preflight scanner. Default scans must not execute target repository code.
- Findings are evidence, not proof of safety or danger.
- Every finding must include a real file path, line number, rule ID, severity, masked evidence, explanation, remediation, and score contribution.
- Deterministic scoring and verdicts are authoritative. GPT or other LLM review may explain or suggest, but must not decide scores or verdicts.
- Do not expose API keys, tokens, `.env` values, secrets, or unmasked personal data in reports, logs, traces, fixtures, or commit messages.

## Agent operating loop

1. State the concrete change target and the product invariant it touches.
2. Make the minimum reversible change for the requested outcome.
3. Reproduce bugs with a focused test before fixing them when practical.
4. Record evidence for changed behavior: tests, fixtures, schema checks, generated reports, or exact file/line inspection.
5. Run focused checks while developing. Before release approval, run exactly one `npm run verify` unless the task explicitly says otherwise.
6. If verification cannot run, report that as missing evidence rather than claiming success.

## Scan boundaries

- Never run target repository install scripts such as `npm install`, `pip install`, `setup`, `build`, or `test` during default scans.
- Do not execute scanned target repository code during default scans.
- Do not use AI guesses for deterministic risk scoring.
- Do not weaken tests, hide failures, delete failing checks, or report a failing command as successful.
- Do not use destructive Git commands such as `git reset --hard`, `git checkout --`, or `git clean -fd`.
- Commit, push, and open or merge PRs only after real verification passes.

## Trust and review rules

- Treat same-session self-review as insufficient for high-risk changes.
- Require independent review or stronger mechanical evidence when changes touch scoring, verdicts, masking, execution boundaries, dependency discovery, source acquisition, or public report schemas.
- Reviewer independence is not just a separate prompt. Record model/tool identity and context provenance when a review result is used as evidence.
- Keep subjective security judgment outside deterministic reducers. Reducers should consume explicit evidence requirements, rule IDs, reason codes, provenance, and mechanical invariants.

## Deadlock and retry rules

- Do not loop on vague blockers.
- A deadlock requires bounded attempt history plus repeated observable failure, such as the same failing command, evidence requirement, reason code, or finding fingerprint with no material state improvement.
- After a detected deadlock, either change strategy, reduce scope, or report the blocker with exact evidence.

## Trace and provenance rules

- Prefer selective structured event capture over full transcript retention.
- Preserve raw traces for failures, sampled successes, high-risk changes, reviewer disagreement, and harness-evolution experiments.
- Trace planning, routing, tool execution, patch application, verification, and review outcomes as auditable events when they affect trust decisions.
- Do not create a second trust or scoring control plane. One capability should have one canonical mechanism.

## Scope boundaries

Escalate instead of autonomously changing product direction when a task alters product identity, user-visible semantics, canonical terminology, public API behavior, trust or verdict semantics, supported users, business model, or explicit non-goals. Technical implementation choices remain autonomous when they preserve those surfaces.

## Verification

Use focused checks while developing. Before release approval, run:

```powershell
npm run verify
```
