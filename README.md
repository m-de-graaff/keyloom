<div align="center">
  <img src="keyloom_banner.png" alt="Keyloom" width="850" height="250" />
</div>

# Keyloom

**Modern, type-safe authentication for Next.js applications**

Keyloom is a comprehensive authentication library designed specifically for Next.js, providing seamless integration with both App Router and Pages Router. Built with TypeScript-first design, edge-runtime compatibility, and developer experience in mind.

## ✨ Features

- 🚀 **Next.js Optimized** - Built specifically for Next.js 13+ with App Router and Pages Router support
- 🔒 **Type-Safe** - Full TypeScript support with comprehensive type definitions
- ⚡ **Edge Compatible** - Works seamlessly with Vercel Edge Runtime and middleware
- 🛡️ **Security First** - CSRF protection, secure session management, and argon2id password hashing
- 🎯 **Developer Experience** - Clean APIs, excellent IntelliSense, and minimal configuration
- 🔌 **Adapter System** - Pluggable database adapters (Prisma, and more coming soon)
- 🎨 **Flexible** - Support for credentials, OAuth providers, and custom authentication flows
- 📱 **RSC Ready** - Server Components compatible with proper session handling

## 📦 Package Structure

```
packages/
├── core/                    # Core authentication logic and types
├── nextjs/                  # Next.js integration package
│   ├── src/
│   │   ├── index.ts        # Main exports
│   │   ├── handler.ts      # createNextHandler for API routes
│   │   ├── middleware.ts   # createAuthMiddleware for edge
│   │   ├── server-helpers.ts # getSession, getUser, guard (RSC-safe)
│   │   ├── edge.ts         # Edge-safe utilities
│   │   ├── cookies.ts      # Cookie management helpers
│   │   ├── routing.ts      # Internal API routing
│   │   └── types.ts        # Next.js specific types
│   └── package.json        # Clean exports with subpath exports
├── adapters/
│   └── prisma/             # Prisma database adapter
├── cli/                    # CLI tools for setup and management
└── providers/              # OAuth and social login providers
```

## 🚀 Quick Start

### Installation

```bash
npm install @keyloom/nextjs @keyloom/core @keyloom/adapters-prisma
# or
pnpm add @keyloom/nextjs @keyloom/core @keyloom/adapters-prisma
# or
yarn add @keyloom/nextjs @keyloom/core @keyloom/adapters-prisma
```

### Basic Setup (10-minute setup)

1. **Create your configuration file**

```typescript
// keyloom.config.ts
import { defineKeyloom } from "@keyloom/core";
import prismaAdapter from "@keyloom/adapters/prisma";

export default defineKeyloom({
  baseUrl: process.env.NEXT_PUBLIC_APP_URL!,
  session: {
    strategy: "database",
    ttlMinutes: 60,
    rolling: true,
  },
  adapter: prismaAdapter(), // uses DATABASE_URL env
  rbac: { enabled: false },
  cookie: { sameSite: "lax" },
  secrets: { authSecret: process.env.AUTH_SECRET! },
});
```

2. **Set up API routes**

```typescript
// app/api/auth/[...keyloom]/route.ts
import { createNextHandler } from "@keyloom/nextjs";
import config from "../../../keyloom.config";

export const { GET, POST } = createNextHandler(config);
```

3. **Add middleware for authentication**

```typescript
// middleware.ts
import { createAuthMiddleware } from "@keyloom/nextjs/middleware";
import config from "./keyloom.config";

export default createAuthMiddleware(config, {
  publicRoutes: ["/", "/sign-in", "/api/auth/csrf"],
});

export const config = {
  matcher: ["/((?!_next|.*\\.(?:ico|png|jpg|svg)).*)"],
};
```

4. **Environment variables**

```bash
# .env.local
NEXT_PUBLIC_APP_URL=http://localhost:3000
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/keyloom_app
AUTH_SECRET=your-super-secret-key-change-in-production
```

## 🔧 Usage Examples

### Server Components (App Router)

```typescript
// app/dashboard/page.tsx
import { getSession } from "@keyloom/nextjs";
import { redirect } from "next/navigation";

export default async function Dashboard() {
  const { session, user } = await getSession();

  if (!session) {
    redirect("/sign-in");
  }

  return (
    <div>
      <h1>Welcome back, {user?.email}!</h1>
      <p>Session ID: {session.id}</p>
    </div>
  );
}
```

### Client Components

```typescript
"use client";

import { useState } from "react";

function getCsrf() {
  const part = document.cookie
    .split("; ")
    .find((x) => x.startsWith("__keyloom_csrf="));
  return part?.split("=")[1] ?? "";
}

export default function SignIn() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");

  async function ensureCsrf() {
    await fetch("/api/auth/csrf", { cache: "no-store" });
  }

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    await ensureCsrf();

    const response = await fetch("/api/auth/login", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-keyloom-csrf": getCsrf(),
      },
      body: JSON.stringify({ email, password }),
    });

    const result = await response.json();
    setMessage(JSON.stringify(result));

    if (response.ok) {
      window.location.href = "/dashboard";
    }
  }

  return (
    <form onSubmit={handleLogin} className="space-y-4">
      <input
        type="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder="Email"
        required
      />
      <input
        type="password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        placeholder="Password"
        required
      />
      <button type="submit">Sign In</button>
      {message && <pre>{message}</pre>}
    </form>
  );
}
```

### Middleware Configuration

```typescript
// middleware.ts - Advanced configuration
import { createAuthMiddleware } from "@keyloom/nextjs/middleware";
import config from "./keyloom.config";

export default createAuthMiddleware(config, {
  publicRoutes: [
    "/",
    "/sign-in",
    "/sign-up",
    "/api/auth/csrf",
    /^\/blog\/.*/, // Regex patterns supported
  ],
  // Optional: verify session at edge (lower performance)
  verifyAtEdge: false,
  // Custom logic after auth check
  afterAuth: ({ authed, req, next, redirect }) => {
    const { pathname } = req.nextUrl;

    // Redirect authenticated users away from auth pages
    if (authed && ["/sign-in", "/sign-up"].includes(pathname)) {
      return redirect("/dashboard");
    }

    // Redirect unauthenticated users to sign-in
    if (!authed && pathname.startsWith("/dashboard")) {
      return redirect("/sign-in");
    }

    return next();
  },
});
```
