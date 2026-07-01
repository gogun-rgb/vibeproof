# Security Policy

VibeProof is a static preflight scanner. It does not guarantee that a repository is safe. It highlights evidence that an AI coding agent or developer should review before running repository code.

## Supported Version

| Version | Supported |
| --- | --- |
| 0.1.x | Yes |

## Design Limits

- Default scans do not execute target repository code.
- Target install, build, setup, and test commands are not run.
- API keys are read only from server-side environment variables.
- Secret-like findings are masked before reporting.
- Risk score and verdict are deterministic and rule-based.

## Reporting a Vulnerability

Open a private security advisory or email the maintainer. Do not include live secrets in reports. Redact tokens before sharing logs.

