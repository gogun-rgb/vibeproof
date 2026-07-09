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
- Ordinary technical implementation decisions remain autonomous when protected product surfaces are not implicated.

## Product Boundary

Semantic-change suspicion is judged only by the dedicated Product Boundary Critic. The Governor may coordinate work, but is not the semantic-change decision owner. File paths, keywords, and protected-surface metadata may trigger inspection, but they are not final semantic-change authority.

A deterministic protected-surface trigger must invoke the Product Boundary Critic when a change may affect product identity, target user, core problem, user-visible semantics, public API behavior, canonical terminology, trust semantics, verdict semantics, supported targets, explicit non-goals, or business model.

The Product Boundary Critic must cite concrete changed-file or diff evidence and emit exactly one result:

- `NO_SEMANTIC_CHANGE`
- `SEMANTIC_CHANGE_SUSPECTED`
- `UNKNOWN`

`SEMANTIC_CHANGE_SUSPECTED` and `UNKNOWN` require escalation.

## Review Promotion

Fresh-Context Critic review provides contextual separation only; do not claim that a different session proves cognitive independence. Reviewer provenance must record session, model identity, model family or provider, and context exposure. Prefer evidence-based mechanical checks over prose agreement.

Promotion from Level 2 Fresh-Context Critic to Level 3 Diverse Challenger is automatic and Governor-independent when any observable condition holds: high-risk task classification, reviewer disagreement, reviewer result is `UNKNOWN`, a novel architecture marker is recorded for the task, the same finding fingerprint is repeatedly remediated with no material progress, or deterministic calibration sampling selects the task.

Level 3 should use a different model family or provider when available. When genuine model diversity is unavailable, record `DIVERSITY_UNAVAILABLE`; do not simulate diversity by spawning additional same-model reviewers and describing them as independent or diverse.

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
- Add specialized agent configs, hooks, skills, subagents, or setup workflows only when recorded traces show a repeated task class or failure class they uniquely reduce; otherwise keep the canonical repository instructions and focused verification loop as the default harness.
- Treat setup workflows, preflight hooks, and environment bootstrapping as convenience scaffolding, not trust gates. If they fail, are skipped, or are unavailable, require focused verification evidence or report missing evidence instead of treating the task as verified.

## Scope boundaries

Escalate instead of autonomously changing product direction when a task alters product identity, user-visible semantics, canonical terminology, public API behavior, trust or verdict semantics, supported users, business model, or explicit non-goals. Technical implementation choices remain autonomous when they preserve those surfaces.

## Verification

Use focused checks while developing. Before release approval, run:

```powershell
npm run verify
```
