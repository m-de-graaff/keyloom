<p align="center">
  <img src="./keyloom_banner.png" height="250" width="830" title="Keyloom Banner">
</p>

## Keyloom

TypeScript-first authentication toolkit for modern web apps. Framework-friendly building blocks with providers, database adapters, React hooks and Next.js utilities.

[![License: MIT](https://img.shields.io/badge/license-MIT-blue.svg)](./LICENSE)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.x-blue?logo=typescript)](https://www.typescriptlang.org/)
[![pnpm](https://img.shields.io/badge/pnpm-9.x-orange?logo=pnpm)](https://pnpm.io/)
[![Turborepo](https://img.shields.io/badge/Turborepo-2.x-000?logo=turbo)](https://turbo.build/repo)
[![Changesets](https://img.shields.io/badge/changesets-enabled-purple?logo=changesets)](https://github.com/changesets/changesets)
![ESM + CJS](https://img.shields.io/badge/ESM%20%2B%20CJS-supported-4c1)
![Tree-shakeable](https://img.shields.io/badge/tree--shakeable-yes-4c1)

### Highlights

- **TypeScript-first**: strict types across all packages
- **Framework friendly**: utilities for **Next.js** and **React**
- **Pluggable**: OAuth providers, email, and multiple DB adapters
- **Modern build**: ESM/CJS outputs, tree-shakeable, Turborepo workspace

### Contents

- **Quick start**
- **Packages**
- **Examples**
- **Develop**
- **Release**
- **Contributing**
- **Security**
- **License**

---

### Quick start

Install core packages (choose the adapter(s) and provider(s) you need):

```bash
pnpm add @keyloom/core @keyloom/nextjs @keyloom/react @keyloom/providers @keyloom/adapters
```

All published packages will appear under the `keyloom` org on npm: `https://www.npmjs.com/settings/keyloom/packages`.

### Packages

- **@keyloom/core** – primitives, types, and core auth engine  
  [![npm version](https://img.shields.io/npm/v/%40keyloom%2Fcore)](https://www.npmjs.com/package/@keyloom/core)
  [![npm downloads](https://img.shields.io/npm/dm/%40keyloom%2Fcore)](https://www.npmjs.com/package/@keyloom/core)

- **@keyloom/nextjs** – Next.js helpers (routes, middleware, server utils)  
  [![npm version](https://img.shields.io/npm/v/%40keyloom%2Fnextjs)](https://www.npmjs.com/package/@keyloom/nextjs)
  [![npm downloads](https://img.shields.io/npm/dm/%40keyloom%2Fnextjs)](https://www.npmjs.com/package/@keyloom/nextjs)

- **@keyloom/react** – React hooks for auth state, user and org context  
  [![npm version](https://img.shields.io/npm/v/%40keyloom%2Freact)](https://www.npmjs.com/package/@keyloom/react)
  [![npm downloads](https://img.shields.io/npm/dm/%40keyloom%2Freact)](https://www.npmjs.com/package/@keyloom/react)

- **@keyloom/providers** – OAuth providers (GitHub, Google, …)  
  [![npm version](https://img.shields.io/npm/v/%40keyloom%2Fproviders)](https://www.npmjs.com/package/@keyloom/providers)
  [![npm downloads](https://img.shields.io/npm/dm/%40keyloom%2Fproviders)](https://www.npmjs.com/package/@keyloom/providers)

- **@keyloom/adapters** – database adapters (Prisma, Drizzle, Mongo)  
  [![npm version](https://img.shields.io/npm/v/%40keyloom%2Fadapters)](https://www.npmjs.com/package/@keyloom/adapters)
  [![npm downloads](https://img.shields.io/npm/dm/%40keyloom%2Fadapters)](https://www.npmjs.com/package/@keyloom/adapters)

- **@keyloom/email** – email utilities for magic links, verification codes  
  [![npm version](https://img.shields.io/npm/v/%40keyloom%2Femail)](https://www.npmjs.com/package/@keyloom/email)
  [![npm downloads](https://img.shields.io/npm/dm/%40keyloom%2Femail)](https://www.npmjs.com/package/@keyloom/email)

- **@keyloom/cli** – CLI for project init, dev and migrations  
  [![npm version](https://img.shields.io/npm/v/%40keyloom%2Fcli)](https://www.npmjs.com/package/@keyloom/cli)
  [![npm downloads](https://img.shields.io/npm/dm/%40keyloom%2Fcli)](https://www.npmjs.com/package/@keyloom/cli)

### Examples

- `examples/next-app` – Next.js App Router
- `examples/next-pages` – Next.js Pages Router
- `examples/express` – Express server

### Develop

```bash
pnpm install
pnpm -r build
pnpm -r dev
```

### Release

Use Changesets. Merge changesets to `main`, then run the Release workflow.

### Contributing

See `CONTRIBUTING.md`. By participating, you agree to abide by the `CODE_OF_CONDUCT.md`.

### Security

Please review `SECURITY.md` for how to report vulnerabilities.

### License

MIT © Keyloom Contributors
