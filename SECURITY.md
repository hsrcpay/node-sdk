# Security Policy

## Reporting a vulnerability

Please **do not** open a public issue. Report privately through GitHub's **Report a vulnerability** button
(Security tab, Advisories) on this repository, or email **info@phineup.com**.

Include a description, the affected SDK version, and reproduction steps. You can expect an acknowledgement within
7 days. Please allow reasonable time for a fix before public disclosure.

Never include real API keys, card data or customer data in a report. Rotate any key that was exposed.

## Supported versions

Only the latest released version receives security fixes.

## Scope

In scope: this SDK, its build and release pipeline. Vulnerabilities in the HSRCPay platform or API itself are
reported the same way and routed to the platform team.

## For SDK users

- Keep secret API keys (`sk_live_...`) on the server. Never ship them to browsers or mobile apps.
- Use `sk_test_...` keys for development; they use the sandbox.
- Pin and update the SDK through your lockfile and watch the GitHub releases for security notes.
