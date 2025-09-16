# @keyloom/core

The core authentication library for Keyloom - a modern, type-safe authentication solution for JavaScript applications.

## Features

- 🔐 **Secure Session Management** - Database-backed sessions with rolling expiration
- 🛡️ **CSRF Protection** - Double-submit cookie pattern for enhanced security
- 🔑 **Password Hashing** - Argon2id for secure password storage
- 🎯 **TypeScript First** - Full type safety and excellent developer experience
- 🔌 **Adapter Pattern** - Support for multiple databases (Prisma, Memory, etc.)
- 🚀 **Framework Agnostic** - Works with any JavaScript framework

## Installation

```bash
npm install @keyloom/core
# or
pnpm add @keyloom/core
# or
yarn add @keyloom/core
```

## Quick Start

```typescript
import { createKeyloom, memoryAdapter } from "@keyloom/core";

const keyloom = createKeyloom({
  adapter: memoryAdapter(),
  session: {
    strategy: "database",
    ttlMinutes: 60,
    rolling: true,
  },
  secrets: {
    authSecret: process.env.AUTH_SECRET,
  },
});

// Register a user
const user = await keyloom.register({
  email: "user@example.com",
  password: "secure-password",
});

// Login
const session = await keyloom.login({
  email: "user@example.com",
  password: "secure-password",
});
```

## Core Concepts

### Adapters

Adapters provide database abstraction for storing users and sessions:

```typescript
import { PrismaAdapter } from "@keyloom/adapters/prisma";
import { memoryAdapter } from "@keyloom/core";

// Production: Use Prisma adapter
const adapter = PrismaAdapter(prisma);

// Development: Use memory adapter
const adapter = memoryAdapter();
```

### Session Management

Sessions are stored in the database with configurable TTL and rolling expiration:

```typescript
const config = {
  session: {
    strategy: "database" as const,
    ttlMinutes: 60, // Session expires after 60 minutes
    rolling: true, // Extend session on activity
  },
};
```

### CSRF Protection

Built-in CSRF protection using double-submit cookie pattern:

```typescript
import { issueCsrfToken, validateDoubleSubmit } from "@keyloom/core/guard/csrf";

// Issue CSRF token
const token = issueCsrfToken();

// Validate CSRF token
const isValid = validateDoubleSubmit(token, cookieValue);
```

## API Reference

### Core Functions

- `createKeyloom(config)` - Create a Keyloom instance
- `register(credentials)` - Register a new user
- `login(credentials)` - Authenticate a user
- `logout(sessionId)` - End a user session
- `getCurrentSession(sessionId)` - Get current session data

### Utilities

- `argon2idHasher` - Password hashing utilities
- `memoryAdapter()` - In-memory adapter for development
- `newId()` - Generate unique identifiers

## TypeScript Support

Full TypeScript support with comprehensive type definitions:

```typescript
import type {
  KeyloomConfig,
  SessionData,
  UserData,
  Adapter,
} from "@keyloom/core";
```

## License

MIT
