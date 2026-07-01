# Harness Log

This file records reusable verification evidence for VibeProof. Update it when the harness, quality gates, or required commands change.

## Baseline Commands

- `npm ci`
- `npm run typecheck`
- `npm run lint`
- `npm run test`
- `npm run build`
- `npm run test:e2e`
- `npm run verify`
- `powershell.exe -NoProfile -ExecutionPolicy Bypass -File scripts\verify.ps1`

## Current Gate Notes

- Static scanners must not execute target repository code.
- CLI output must include `No repository code was executed during this scan.`
- Failed checks must be fixed at the source; tests must not be deleted, weakened, or replaced with empty commands.
- Full verification must be rerun after fixes, not only the test that originally failed.
