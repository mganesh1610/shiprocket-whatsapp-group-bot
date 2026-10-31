# Security review before shipping

Run these checks before merging a change:

```sh
gitleaks git --redact=100 .
trivy fs --scanners vuln .
```

The GitLeaks command scans reachable Git history. The pre-commit hook scans staged changes after `git config core.hooksPath .githooks`. GitHub Actions repeats secret, dependency, and CodeQL checks on pull requests and on `main`. Dependabot checks npm and GitHub Actions dependencies weekly.

Use this prompt for a human-reviewed AI security pass over each meaningful change:

> Review this diff and the surrounding source for security vulnerabilities. Map lower-trust inputs, identity and authorization decisions, secrets, outbound requests, browser/session authority, file access, logging, and state transitions. For each candidate, trace the entry point through the strongest control to a concrete affected principal or resource. Identify the exact source lines, conditions, smallest safe dummy-data reproduction, and narrowest effective fix. Inspect Git history for secrets and the lockfile for dependency advisories. Separate confirmed findings from leads that require runtime or deployment facts. Do not label a missing best practice or a scanner alert as an exploitable vulnerability without a reachable boundary result.

For deeper pre-launch validation, use an isolated local test environment with dummy tracking pages, dummy WhatsApp chats, a read-only source mount, no external network, scratch-only writes, and explicit resource limits. The repository has no staging environment defined. Do not use a real WhatsApp account or shipment to reproduce a lead. Arrange an independent human review before adding billing or broader account access.
