# Releases Guide (Changesets)

This monorepo uses Changesets for versioning and publishing. There are two automated workflows:

- Stable releases to the `latest` tag on npm
- Canary (pre-release snapshot) releases to the `canary` tag on npm

## Prerequisites

- GitHub repository secrets:
  - `NPM_TOKEN` — npm token with publish access to the `@keyloom/*` scopes
  - (Optional) `GITHUB_TOKEN` is provided by GitHub Actions automatically

## Stable Release Flow

1. Contributors add changesets locally:
   - `pnpm changeset` and select the packages and semver bump
   - Commit the generated files under `.changeset/`
2. When merged to `main`, the `Release (Changesets)` workflow will:
   - Create or update a "Version Packages" PR if there are unreleased changesets
   - When that PR is merged, it will version and publish all affected packages to npm under the `latest` tag

Manual trigger:
- You can also trigger the workflow via Actions → "Release (Changesets)" → Run workflow

## Canary (Snapshot) Release Flow

Use canary releases to test packages before merging:

1. Open a PR against `main`
2. Add the `canary` label to the PR
3. The `Canary Release (Changesets)` workflow will publish snapshot versions to npm under the `canary` tag
   - Versions will look like `1.2.3-canary-<sha>`

Install canaries in an app:

```bash
pnpm add @keyloom/core@canary @keyloom/providers@canary @keyloom/adapters@canary
```

Manual trigger:
- You can also run from Actions → "Canary Release (Changesets)"

## Notes

- Do not publish packages manually — rely on the workflows
- Keep `NPM_TOKEN` rotated and scoped minimally
- If a canary is good, proceed to land the PR. Stable publishing will happen automatically after the Version PR is merged.

