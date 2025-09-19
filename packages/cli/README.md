# @keyloom/cli

Professional CLI for initializing and maintaining a Keyloom authentication setup.

## Install

The CLI is shipped with the monorepo and published as a package. In app repos, install locally and use with npx/pnpm dlx:

```bash
pnpm add -D @keyloom/cli
npx keyloom init
```

Or invoke via node if running from a cloned monorepo build:

```bash
node ./packages/cli/dist/keyloom.js --help
```

## Commands

### `keyloom init`
Interactive wizard that sets up a production‑ready auth baseline.

What it does:
- Detects project type (Next.js App/Pages Router) and TypeScript
- Installs required deps (uses your package manager)
- Generates `keyloom.config.(ts|js)` with your choices
- Scaffolds API handler and middleware
- Writes `.env.example` including `AUTH_SECRET`, `DATABASE_URL`, and provider vars
- Generates migration artifacts for your chosen adapter
- Runs `keyloom routes` to create the initial route manifest

Useful flags:
- `--yes` non‑interactive defaults
- `--adapter <prisma|drizzle-pg|drizzle-mysql|postgres|mysql2|mongo>`
- `--providers <github,google,discord,...>`
- `--cwd <path>` to target a different project directory

### `keyloom routes`
Scans your project for Keyloom routes and produces a manifest used by the doctor and tooling.

```bash
keyloom routes --cwd .
```

Outputs:
- `.keyloom/routes.generated.ts`
- `.keyloom/routes.generated.json`

### `keyloom doctor`
Runs environment and configuration checks with actionable guidance.

Checks include:
- Required env vars (AUTH_SECRET, provider secrets, etc.)
- Cookie settings and JWT/DB session configuration
- Presence of route manifest and scaffolded files
- Package versions and known pitfalls

```bash
keyloom doctor --cwd .
```

### `keyloom generate`
Generates database artifacts (DDL/files) for the selected adapter without applying them.

```bash
keyloom generate --cwd .
```

### `keyloom migrate`
Generates artifacts and then runs the adapter’s migration tool when available.

```bash
# Prisma example
keyloom migrate --cwd .
# Drizzle example
keyloom migrate --cwd .
```

## Exit codes
- 0 on success
- Non‑zero when an operation fails (installation, generation, or validation)

## Troubleshooting
- Re‑run with `--cwd` if working in a subdirectory
- If dependency installation fails, the CLI prints the exact manual command
- For Prisma, ensure `DATABASE_URL` is set and `prisma` is installed

## License
MIT

