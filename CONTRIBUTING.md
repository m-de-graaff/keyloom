# Contributing to Keyloom

Thanks for your interest in contributing! This guide explains how to set up the repo, run builds/tests, and submit changes.

## Prerequisites

- Node 18+
- pnpm 8+
- Git

## Repo setup

```bash
# Clone
git clone https://github.com/m-de-graaff/keyloom.git
cd keyloom

# Install deps (workspace)
pnpm install -w

# Build all packages
pnpm -w build
```

## Useful scripts

```bash
# Type-check all packages
pnpm -w typecheck

# Lint all packages
pnpm -w lint

# Test a single package
pnpm -C keyloom/packages/core test

# Build only CLI
pnpm -C keyloom/packages/cli build
```

## Development workflow

1. Create a feature branch from `main`.
2. Make focused changes with clear commits.
3. Run `pnpm -w typecheck` and `pnpm -w lint`.
4. Run tests for affected packages.
5. Submit a PR with:
   - Motivation and context
   - Screenshots/CLI output if UX-related
   - Notes about breaking changes (aim to avoid)

## Commit style

Use clear, conventional messages when possible:

- feat(cli): add automatic routes generation in init
- fix(providers): correct github import in README
- docs(core): expand hashing selector section
- refactor(server): extract rate-limit helper

## Coding guidelines

- TypeScript strict mode; prefer explicit types at module boundaries
- Avoid heavy dependencies; keep core/runtime edge-friendly
- Security-first defaults; prefer safe primitives (crypto, cookies, CSRF)
- Maintain backward compatibility for published packages

## Docs and READMEs

- Keep package READMEs up to date with accurate imports and commands
- When CLI UX changes, include a short usage example in the CLI README

## Testing

- Write unit tests for new logic; prefer small, focused tests
- For adapters, consider contract tests under `packages/adapters/tests`

## Releasing

- Maintainers handle versioning and publishes
- Non-maintainers: mention if a release is desired in the PR description

## Community

- Be respectful and constructive
- Use Discussions/Issues for questions and proposals

Thanks for helping make Keyloom better!
