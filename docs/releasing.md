# Releasing (maintainers)

`main` is the only branch. Versions, tags, the changelog and npm publishing are automated with
[release-please](https://github.com/googleapis/release-please).

## How it works

1. Merge pull requests into `main` with a conventional-commit title (squash merge uses the PR title as the commit):
   `feat:`, `fix:`, `perf:`, `docs:`, `chore:`, `test:`, `refactor:`.
2. Every push to `main` runs CI. The release workflow then opens or updates one **release pull request** that contains
   the next version in `package.json` and the generated `CHANGELOG.md` entry.
3. Merge the release pull request when you want to ship. That creates the `vX.Y.Z` tag and the GitHub release, and the
   same workflow publishes the package to npm.

Nothing is published from a plain push to `main`, and nobody tags by hand.

## Version rules

| Commit | Bump |
|---|---|
| `fix:`, `perf:` | patch |
| `feat:` | minor |
| `feat!:` or a `BREAKING CHANGE:` footer | major, or minor while the version is below 1.0.0 |

`docs:`, `chore:`, `test:` and `refactor:` do not trigger a release on their own. Below 1.0.0 breaking changes bump the
minor version, as is conventional for 0.x packages. Move to 1.0.0 deliberately with a `Release-As: 1.0.0` commit footer.

## Requirements

- Repository secret `NPM_TOKEN`: an npm automation token with publish rights to the `@hsrcpay` scope.
- The organization must allow GitHub Actions to create and approve pull requests (Organization settings, Actions,
  General). Without it the release pull request cannot be opened.

## What CI checks

Typecheck, the unit and contract tests, the Bun build (ESM, CJS, bundled declarations, no source maps), and
[Are the types wrong?](https://arethetypeswrong.github.io/) against the packed tarball.
