# @keyloom/providers-github

GitHub OAuth provider for Keyloom authentication library. Enables secure authentication using GitHub accounts.

## Features

- 🔐 **OAuth 2.0 Flow** - Secure GitHub authentication
- 👤 **User Profile** - Access to GitHub user information
- 🎯 **Type Safe** - Full TypeScript support
- ⚡ **Easy Setup** - Simple configuration
- 🔧 **Customizable** - Configurable scopes and permissions

## Installation

```bash
npm install @keyloom/providers-github
# or
pnpm add @keyloom/providers-github
# or
yarn add @keyloom/providers-github
```

## Setup

### 1. Create GitHub OAuth App

1. Go to [GitHub Developer Settings](https://github.com/settings/developers)
2. Click "New OAuth App"
3. Fill in the application details:
   - **Application name**: Your app name
   - **Homepage URL**: `http://localhost:3000` (for development)
   - **Authorization callback URL**: `http://localhost:3000/api/auth/callback/github`
4. Save the **Client ID** and **Client Secret**

### 2. Environment Variables

Add to your `.env.local`:

```env
GITHUB_CLIENT_ID=your_github_client_id
GITHUB_CLIENT_SECRET=your_github_client_secret
```

## Usage

### With Next.js

```typescript
import { createKeyloom } from '@keyloom/core'
import { githubProvider } from '@keyloom/providers-github'
import { prismaAdapter } from '@keyloom/adapters-prisma'

const keyloom = createKeyloom({
  adapter: prismaAdapter(prisma),
  providers: [
    githubProvider({
      clientId: process.env.GITHUB_CLIENT_ID!,
      clientSecret: process.env.GITHUB_CLIENT_SECRET!,
      scopes: ['user:email'] // Optional: customize scopes
    })
  ],
  session: {
    strategy: 'database',
    ttlMinutes: 60,
    rolling: true
  },
  secrets: {
    authSecret: process.env.AUTH_SECRET!
  }
})
```

### Client-side Login

```typescript
// Redirect to GitHub OAuth
window.location.href = '/api/auth/login/github'

// Or with custom redirect
window.location.href = '/api/auth/login/github?redirect=/dashboard'
```

### React Component

```tsx
export function GitHubLoginButton() {
  const handleLogin = () => {
    window.location.href = '/api/auth/login/github'
  }

  return (
    <button 
      onClick={handleLogin}
      className="flex items-center gap-2 px-4 py-2 bg-gray-900 text-white rounded"
    >
      <GitHubIcon />
      Sign in with GitHub
    </button>
  )
}
```

## Configuration Options

```typescript
githubProvider({
  clientId: string,           // Required: GitHub Client ID
  clientSecret: string,       // Required: GitHub Client Secret
  scopes?: string[],         // Optional: OAuth scopes (default: ['user:email'])
  allowSignup?: boolean,     // Optional: Allow new user registration (default: true)
  redirectUri?: string,      // Optional: Custom redirect URI
})
```

### Available Scopes

- `user` - Read user profile information
- `user:email` - Read user email addresses
- `read:user` - Read user profile information
- `user:follow` - Follow and unfollow users
- `public_repo` - Access public repositories
- `repo` - Access private repositories

## User Profile Data

The GitHub provider returns the following user data:

```typescript
interface GitHubUser {
  id: number
  login: string
  name: string | null
  email: string | null
  avatar_url: string
  html_url: string
  company: string | null
  location: string | null
  bio: string | null
  public_repos: number
  followers: number
  following: number
  created_at: string
}
```

## Error Handling

```typescript
// Handle OAuth errors
try {
  const session = await keyloom.handleCallback(req)
} catch (error) {
  if (error.code === 'OAUTH_ERROR') {
    // Handle OAuth-specific errors
    console.error('GitHub OAuth error:', error.message)
  }
}
```

## Security Considerations

- Always use HTTPS in production
- Keep your Client Secret secure and never expose it to the client
- Validate the `state` parameter to prevent CSRF attacks
- Consider implementing rate limiting for OAuth endpoints

## Development vs Production

### Development
```typescript
githubProvider({
  clientId: process.env.GITHUB_CLIENT_ID!,
  clientSecret: process.env.GITHUB_CLIENT_SECRET!,
  redirectUri: 'http://localhost:3000/api/auth/callback/github'
})
```

### Production
```typescript
githubProvider({
  clientId: process.env.GITHUB_CLIENT_ID!,
  clientSecret: process.env.GITHUB_CLIENT_SECRET!,
  redirectUri: 'https://yourdomain.com/api/auth/callback/github'
})
```

## TypeScript Support

Full TypeScript support with comprehensive type definitions:

```typescript
import type { 
  GitHubProvider,
  GitHubUser,
  GitHubConfig 
} from '@keyloom/providers-github'
```

## License

MIT
