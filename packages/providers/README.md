# @keyloom/providers

OAuth providers for Keyloom authentication library. Supports multiple OAuth providers with a unified API.

## Features

- 🔐 **OAuth 2.0 Flow** - Secure authentication with popular providers
- 👤 **User Profile Access** - Get user information from providers
- 🎯 **Type Safe** - Full TypeScript support
- ⚡ **Easy Setup** - Simple configuration
- 🔧 **Extensible** - Easy to add new providers

## Installation

```bash
npm install @keyloom/providers
# or
pnpm add @keyloom/providers
# or
yarn add @keyloom/providers
```

## Available Providers

### GitHub

```typescript
import { github } from "@keyloom/providers/github";
// or
import { github } from "@keyloom/providers";

const githubProvider = github({
  clientId: process.env.GITHUB_CLIENT_ID!,
  clientSecret: process.env.GITHUB_CLIENT_SECRET!,
});
```

## Usage

### With Keyloom Core

```typescript
import { createKeyloom } from "@keyloom/core";
import { github } from "@keyloom/providers/github";
import { PrismaAdapter } from "@keyloom/adapters/prisma";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const keyloom = createKeyloom({
  adapter: PrismaAdapter(prisma),
  providers: [
    github({
      clientId: process.env.GITHUB_CLIENT_ID!,
      clientSecret: process.env.GITHUB_CLIENT_SECRET!,
    }),
  ],
  session: {
    strategy: "database",
    ttlMinutes: 60,
    rolling: true,
  },
  secrets: {
    authSecret: process.env.AUTH_SECRET!,
  },
});
```

### With Next.js

```typescript
import { createNextHandler } from "@keyloom/nextjs";
import { github } from "@keyloom/providers/github";

const keyloomConfig = {
  // ... other config
  providers: [
    github({
      clientId: process.env.GITHUB_CLIENT_ID!,
      clientSecret: process.env.GITHUB_CLIENT_SECRET!,
    }),
  ],
};

const { GET, POST } = createNextHandler(keyloomConfig);
export { GET, POST };
```

## Provider Setup

### GitHub

1. Go to [GitHub Developer Settings](https://github.com/settings/developers)
2. Click "New OAuth App"
3. Fill in the application details:
   - **Application name**: Your app name
   - **Homepage URL**: `http://localhost:3000` (for development)
   - **Authorization callback URL**: `http://localhost:3000/api/auth/oauth/github/callback`
4. Save the **Client ID** and **Client Secret**

Required scopes: `read:user user:email`

Add to your `.env.local`:

```env
GITHUB_CLIENT_ID=your_github_client_id
GITHUB_CLIENT_SECRET=your_github_client_secret
```

Example redirect URIs:
- Local: `http://localhost:3000/api/auth/oauth/github/callback`
- Prod: `https://yourapp.com/api/auth/oauth/github/callback`

## Client-side Usage

```typescript
// Redirect to GitHub OAuth (App Router)
window.location.href = "/api/auth/oauth/github/start";

// Or with custom post-auth redirect
window.location.href = "/api/auth/oauth/github/start?callbackUrl=/dashboard";
```

## React Component Example

```tsx
import { github } from "@keyloom/providers/github";

export function GitHubLoginButton() {
  const handleLogin = () => {
    window.location.href = "/api/auth/login/github";
  };

  return (
    <button
      onClick={handleLogin}
      className="flex items-center gap-2 px-4 py-2 bg-gray-900 text-white rounded"
    >
      <GitHubIcon />
      Sign in with GitHub
    </button>
  );
}
```

## Configuration Options

### GitHub Provider

```typescript
github({
  clientId: string,           // Required: GitHub Client ID
  clientSecret: string,       // Required: GitHub Client Secret
  scopes?: string[],         // Optional: OAuth scopes (default: ['user:email'])
  allowSignup?: boolean,     // Optional: Allow new user registration (default: true)
  redirectUri?: string,      // Optional: Custom redirect URI
})
```

## Available Scopes (GitHub)

- `user` - Read user profile information
- `user:email` - Read user email addresses
- `read:user` - Read user profile information
- `user:follow` - Follow and unfollow users
- `public_repo` - Access public repositories
- `repo` - Access private repositories

## User Profile Data (GitHub)

```typescript
interface GitHubUser {
  id: number;
  login: string;
  name: string | null;
  email: string | null;
  avatar_url: string;
  html_url: string;
  company: string | null;
  location: string | null;
  bio: string | null;
  public_repos: number;
  followers: number;
  following: number;
  created_at: string;
}
```

## Adding New Providers

To add a new provider, create a new directory under `src/` and follow the same pattern:

```typescript
// src/google/index.ts
export function google(opts: GoogleProviderOptions) {
  return { id: "google", type: "oauth", ...opts } as const;
}
```

Then export it from the main index:

```typescript
// src/index.ts
export { google } from "./google/index.js";
```

## TypeScript Support

Full TypeScript support with comprehensive type definitions:

```typescript
import type {
  GitHubProvider,
  GitHubUser,
  GitHubConfig,
} from "@keyloom/providers";
```

## License

MIT
