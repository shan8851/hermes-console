# Security Policy

Hermes Console reads local Hermes Agent state and can display sensitive runtime context: messages, memory, config paths, logs, cron output, and local file previews. Treat it like a local admin tool, not a public web app.

## Supported versions

Security fixes target the latest tagged release and `main`.

## Default security posture

- The API binds to `127.0.0.1` by default.
- Hermes Console does not ship built-in authentication.
- Hermes Console is read-mostly and should not need write access to your Hermes state for normal use.
- Remote access is intentionally out of scope unless you put an authenticated tunnel or proxy in front of it.

Do not expose Hermes Console directly to the public internet. If you need access from another device, use something you control, such as SSH tunnelling, Tailscale, or an authenticated reverse proxy.

## Reporting vulnerabilities

Please report security issues privately rather than opening a public issue with exploit details.

Preferred: use GitHub's private vulnerability reporting flow for this repository if it is available. If it is not available, open a minimal public issue asking for a private security contact without sharing exploit details.

Include:

- affected version or commit
- operating system and Node version
- steps to reproduce
- impact and what data could be exposed or changed
- any relevant logs with secrets redacted

## Sensitive data in issues and PRs

Do not paste real Hermes memory, private logs, tokens, channel IDs, or personal message content into public issues. Use redacted snippets or synthetic fixtures.
