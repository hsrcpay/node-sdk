# Contributing to @hsrcpay/sdk

Thanks for helping improve the HSRCPay Node.js SDK. Please read the [Code of Conduct](CODE_OF_CONDUCT.md) first.

## Ground rules

- **Tests required.** Bug fixes need a regression test, features need tests.
- **Bun only.** Use `bun install`, `bun run`, `bun test`. No Node.js, npm, yarn or pnpm commands.
- **Backend contract first.** Request and response schemas mirror the HSRCPay API. If the API changes, update
  `test/contract/backend-schemas.ts` together with the SDK schema so the contract tests stay honest.
- **No source maps** in the published package. `bun run build` verifies this.
- **Conventional commits**: `feat:`, `fix:`, `docs:`, `test:`, `chore:`, `refactor:`. Breaking changes use `feat!:` or a
  `BREAKING CHANGE:` footer.

## Development

```sh
bun install
bun run typecheck
bun test
bun run build
```

## Branching and releases

`main` is the only long-lived branch. Open pull requests against `main`.

- Pushes and pull requests run CI only (typecheck, tests, build). A plain push to `main` never publishes.
- Pull request titles must be conventional commits (`feat: ...`, `fix: ...`); squash merge uses the title as the commit
  message and the release tooling reads it.
- A release happens only when a maintainer merges the automatically maintained release pull request, which creates the
  tag, the GitHub release and the npm publish. Contributors never tag or publish. See [docs/releasing.md](docs/releasing.md).

## Pull request process

1. Open an issue first for large changes or new API surface.
2. Fork, create a topic branch from `main`, keep the pull request small and focused.
3. Fill in the pull request template and make sure CI is green.
4. A maintainer review (see `.github/CODEOWNERS`) is required before merge.

## Licensing

This repository is under the [HSRCPAY API Client License](LICENSE). By submitting a contribution you confirm that you
have the right to submit it and that it is provided under the same license.

## Security

Do not open public issues for vulnerabilities. See [SECURITY.md](SECURITY.md).
