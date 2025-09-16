<div align="center">
  <img src="keyloom_banner.png" alt="Keyloom" width="850" height="250" />
</div>

<div align="center">

**Modern, type-safe authentication for JavaScript applications**

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Node.js](https://img.shields.io/badge/Node.js-18.17.0+-green.svg)](https://nodejs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.9+-blue.svg)](https://www.typescriptlang.org/)
[![NPM](https://img.shields.io/npm/v/@keyloom/core)](https://www.npmjs.com/package/@keyloom/core)

</div>

---

## 🚀 What is Keyloom?

Keyloom is a comprehensive authentication library designed for modern JavaScript and TypeScript applications. It provides a secure, flexible, and developer-friendly solution for handling user authentication, session management, and authorization.

### ✨ Key Features

- **🔐 Multiple Auth Providers** - GitHub, Google, and more OAuth providers
- **🗄️ Database Agnostic** - Prisma, memory, and custom adapters
- **⚡ Framework Support** - First-class Next.js integration with edge runtime support
- **🛡️ Security First** - CSRF protection, secure session management, and rate limiting
- **📱 Modern Stack** - TypeScript-first with full type safety
- **🎯 Developer Experience** - Simple configuration, comprehensive examples
- **🔄 Session Management** - Flexible session strategies with rolling sessions
- **🚦 Middleware Support** - Route protection and authentication guards

## 🏗️ Architecture

Keyloom is built as a modular monorepo with the following packages:

- **`@keyloom/core`** - Core authentication logic and utilities
- **`@keyloom/nextjs`** - Next.js integration and middleware
- **`@keyloom/server`** - Standalone server implementation
- **`@keyloom/cli`** - Command-line tools and utilities
- **`@keyloom/adapters/*`** - Database adapters (Prisma, etc.)
- **`@keyloom/providers/*`** - OAuth providers (GitHub, Google, etc.)

## 🚀 Quick Start

### Installation

```bash
# Using npm
npm install @keyloom/core @keyloom/nextjs

# Using pnpm
pnpm add @keyloom/core @keyloom/nextjs

# Using yarn
yarn add @keyloom/core @keyloom/nextjs
```

### Basic Configuration

Create a `keyloom.config.ts` file in your project root:

```typescript
import { memoryAdapter } from "@keyloom/core";
import github from "@keyloom/providers/github";

export default {
  baseUrl: process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000",
  session: {
    strategy: "database",
    ttlMinutes: 60,
    rolling: true,
  },
  adapter: memoryAdapter(),
  providers: [
    github({
      clientId: process.env.GITHUB_CLIENT_ID!,
      clientSecret: process.env.GITHUB_CLIENT_SECRET!,
    }),
  ],
  rbac: { enabled: false },
  cookie: { sameSite: "lax" },
  secrets: { authSecret: process.env.AUTH_SECRET! },
};
```

### Next.js Integration

#### API Routes

Create `app/api/auth/[[...keyloom]]/route.ts`:

```typescript
import { createNextHandler } from "@keyloom/nextjs";
import config from "../../../../keyloom.config";

export const { GET, POST } = createNextHandler(config);
```

#### Middleware (Optional)

Create `middleware.ts` for route protection:

```typescript
import { createAuthMiddleware } from "@keyloom/nextjs";
import config from "./keyloom.config";

export default createAuthMiddleware(config, {
  publicRoutes: ["/login", "/register", "/"],
  verifyAtEdge: true,
});

export const config = {
  runtime: "edge",
  matcher: ["/((?!_next|.*\\.(?:ico|png|jpg|svg)).*)"],
};
```

### Client-Side Usage

```typescript
// Login
const response = await fetch("/api/auth/csrf");
const { csrfToken } = await response.json();

await fetch("/api/auth/login", {
  method: "POST",
  headers: {
    "x-keyloom-csrf": csrfToken,
    "content-type": "application/json",
  },
  body: JSON.stringify({ email, password }),
});

// Get current session
const sessionResponse = await fetch("/api/auth/session");
const { session, user } = await sessionResponse.json();

// Logout
await fetch("/api/auth/logout", { method: "POST" });
```

## 📦 Database Adapters

### Prisma Adapter

```typescript
import prismaAdapter from "@keyloom/adapters/prisma";

export default {
  adapter: prismaAdapter({
    url: process.env.DATABASE_URL,
  }),
  // ... other config
};
```

### Memory Adapter (Development)

```typescript
import { memoryAdapter } from "@keyloom/core";

export default {
  adapter: memoryAdapter(),
  // ... other config
};
```

## 🔌 OAuth Providers

### GitHub Provider

```typescript
import github from "@keyloom/providers/github";

export default {
  providers: [
    github({
      clientId: process.env.GITHUB_CLIENT_ID!,
      clientSecret: process.env.GITHUB_CLIENT_SECRET!,
    }),
  ],
  // ... other config
};
```

## 🛠️ Development

### Prerequisites

- Node.js >= 18.17.0
- pnpm >= 10.16.1

### Setup

```bash
# Clone the repository
git clone https://github.com/keyloom/keyloom.git
cd keyloom

# Install dependencies
pnpm install -w

# Start development
pnpm dev
```

This will start the development servers for all example applications and watch for changes across all packages.

### Available Scripts

```bash
# Development
pnpm dev              # Start all example apps in development mode
pnpm build            # Build all packages
pnpm typecheck        # Type check all packages
pnpm test             # Run all tests

# Code Quality
pnpm lint             # Lint all packages
pnpm format           # Format all code
pnpm format-and-lint:fix  # Fix formatting and linting issues

# Release
pnpm changeset        # Create a changeset
pnpm release          # Version and publish packages
```

### Project Structure

```
keyloom/
├── packages/
│   ├── core/           # Core authentication logic
│   ├── nextjs/         # Next.js integration
│   ├── server/         # Standalone server
│   ├── cli/            # Command-line tools
│   ├── adapters/       # Database adapters
│   └── providers/      # OAuth providers
├── examples/
│   ├── playground/     # Development playground
│   └── next-app-router/ # Next.js App Router example
└── docs/               # Documentation
```

## 🧪 Examples

The repository includes several example applications:

- **Playground** (`examples/playground`) - Development playground with memory adapter
- **Next.js App Router** (`examples/next-app-router`) - Production-ready example with Prisma

Run examples:

```bash
# Start all examples
pnpm dev

# Playground runs on http://localhost:3000
# Next.js example runs on http://localhost:3001
```

## 🤝 Contributing

We welcome contributions! Please see our [Contributing Guide](CONTRIBUTING.md) for details.

### Development Workflow

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Run tests and linting: `pnpm test && pnpm lint`
5. Create a changeset: `pnpm changeset`
6. Submit a pull request

## 📄 License

Keyloom is [MIT licensed](LICENSE).

## 🔒 Security

For security issues, please email security@keyloom.dev instead of using the issue tracker.

## 📚 Documentation

- [API Reference](docs/api.md) _(Coming Soon)_
- [Configuration Guide](docs/configuration.md) _(Coming Soon)_
- [Migration Guide](docs/migration.md) _(Coming Soon)_

---

<div align="center">
  <p>Built with ❤️ by the Keyloom team</p>
</div>
