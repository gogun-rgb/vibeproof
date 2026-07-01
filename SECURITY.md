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

## Known Dependency Advisory

VibeProof currently inherits a moderate PostCSS advisory through Next.js. The latest dependency audit reports no high or critical vulnerabilities.

The npm-proposed downgrade to Next.js 9.3.3 is intentionally not applied, because it would introduce a destructive and unsupported framework downgrade.

The affected dependency is transitive and will be updated when a compatible upstream Next.js release resolves the nested PostCSS advisory.

Users should avoid treating VibeProof results as a guarantee that a repository is safe. VibeProof performs evidence-based static analysis and does not execute the scanned repository in its default mode.

## Reporting a Vulnerability

Open a private security advisory or email the maintainer. Do not include live secrets in reports. Redact tokens before sharing logs.

