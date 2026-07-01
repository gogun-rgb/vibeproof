# Required Behavior Test Map

| Required behavior | Evidence |
| --- | --- |
| Static scanner positive detection | `packages/scanners/tests/scanners.test.ts` detects lifecycle hooks, remote execution, secret masking, and agent instructions; `packages/orchestrator/tests/run-scan.test.ts` covers container findings. |
| Safe fixture high-risk false positive prevention | `packages/scanners/tests/scanners.test.ts` checks `safe-node` and `safe-python` have no high or critical findings. |
| Risky fixture detection | `packages/scanners/tests/scanners.test.ts`, `packages/orchestrator/tests/run-scan.test.ts`, and `packages/cli/tests/cli.test.ts` scan risky fixtures. |
| File and line number accuracy | `packages/scanners/tests/scanners.test.ts` and `packages/orchestrator/tests/run-scan.test.ts` assert `package.json:5`. |
| Evidence exists in the actual file | `packages/verifier/tests/verifier.test.ts` rejects moved evidence and `runScan` expects no validation errors for real fixtures. |
| Duplicate finding suppression | `packages/scanners/tests/scanners.test.ts` verifies deterministic scoring suppresses duplicate findings. |
| Deterministic score calculation | `packages/scanners/tests/scanners.test.ts` verifies raw score, final score, verdict, and breakdown length. |
| Critical or forceBlock verdict | `packages/orchestrator/tests/run-scan.test.ts` asserts risky postinstall is `BLOCK` with `forceBlock`. |
| Secret masking | `packages/scanners/tests/scanners.test.ts` ensures secret evidence contains masking and omits the raw secret. |
| Path traversal prevention | `packages/scanners/tests/scanners.test.ts` rejects `../package.json` GitHub tree entries. |
| Invalid GitHub URL rejection | `packages/scanners/tests/scanners.test.ts` and `packages/cli/tests/cli.test.ts` reject unsupported hosts or protocols. |
| Scanner failure isolation | `packages/scanners/tests/scanners.test.ts` verifies a failed scanner result does not discard another scanner's findings. |
| CLI ALLOW/WARN/BLOCK/internal-error exit codes | `packages/cli/tests/cli.test.ts` covers safe JSON ALLOW, risky Markdown WARN, risky terminal BLOCK, and invalid-target internal error. |
| Terminal/JSON/Markdown output | `packages/cli/tests/cli.test.ts` covers terminal, JSON, and Markdown formats. |
| Verifier ruleId, evidence, and score validation | `packages/verifier/tests/verifier.test.ts` covers unknown rule IDs, evidence-line mismatch, rule metadata, score mismatch, and contribution mismatch. |
| API key unset state | `packages/orchestrator/tests/run-scan.test.ts` records missing `OPENAI_API_KEY` without changing static verdicts. |
| GPT provider failure state | `packages/orchestrator/tests/run-scan.test.ts` records provider failure when GPT explanation is requested. |
| Web core flow | `tests/e2e/web.spec.ts` validates the web UI scan flow across desktop and mobile. |
