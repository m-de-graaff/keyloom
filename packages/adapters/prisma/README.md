# @keyloom/adapters-prisma

Prisma adapter for Keyloom authentication library. Provides database integration using Prisma ORM for storing users and sessions.

## Features

- 🗄️ **Database Agnostic** - Works with PostgreSQL, MySQL, SQLite, and more
- 🔄 **Auto Migrations** - Prisma handles database schema migrations
- 🎯 **Type Safe** - Full TypeScript support with Prisma's type generation
- ⚡ **Optimized Queries** - Efficient database operations
- 🔧 **Flexible Schema** - Customizable user and session models

## Installation

```bash
npm install @keyloom/adapters-prisma prisma @prisma/client
# or
pnpm add @keyloom/adapters-prisma prisma @prisma/client
# or
yarn add @keyloom/adapters-prisma prisma @prisma/client
```

## Setup

### 1. Initialize Prisma

```bash
npx prisma init
```

### 2. Update your Prisma schema

Add the required models to your `schema.prisma`:

```prisma
model User {
  id        String   @id @default(cuid())
  email     String   @unique
  password  String
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
  sessions  Session[]
}

model Session {
  id        String   @id @default(cuid())
  userId    String
  expiresAt DateTime
  createdAt DateTime @default(now())
  user      User     @relation(fields: [userId], references: [id], onDelete: Cascade)
}
```

### 3. Generate Prisma client

```bash
npx prisma generate
npx prisma db push
```

## Usage

```typescript
import { createKeyloom } from '@keyloom/core'
import { prismaAdapter } from '@keyloom/adapters-prisma'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

const keyloom = createKeyloom({
  adapter: prismaAdapter(prisma),
  session: {
    strategy: 'database',
    ttlMinutes: 60,
    rolling: true
  },
  secrets: {
    authSecret: process.env.AUTH_SECRET
  }
})

// Now you can use keyloom with Prisma backend
const user = await keyloom.register({
  email: 'user@example.com',
  password: 'secure-password'
})
```

## Configuration

The adapter automatically maps to your Prisma models:

```typescript
const adapter = prismaAdapter(prisma, {
  // Optional: customize model names
  userModel: 'User',      // Default: 'User'
  sessionModel: 'Session' // Default: 'Session'
})
```

## Database Support

Works with all Prisma-supported databases:

- **PostgreSQL** - Recommended for production
- **MySQL** - Popular choice for web applications
- **SQLite** - Great for development and testing
- **SQL Server** - Enterprise applications
- **MongoDB** - Document database support

## Example Schema Variations

### With additional user fields

```prisma
model User {
  id        String   @id @default(cuid())
  email     String   @unique
  password  String
  name      String?
  avatar    String?
  role      Role     @default(USER)
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
  sessions  Session[]
}

enum Role {
  USER
  ADMIN
}
```

### With session metadata

```prisma
model Session {
  id        String   @id @default(cuid())
  userId    String
  expiresAt DateTime
  ipAddress String?
  userAgent String?
  createdAt DateTime @default(now())
  user      User     @relation(fields: [userId], references: [id], onDelete: Cascade)
}
```

## Migration Commands

```bash
# Generate Prisma client
npx prisma generate

# Apply schema changes to database
npx prisma db push

# Create and apply migrations
npx prisma migrate dev

# View your data
npx prisma studio
```

## TypeScript Support

Full TypeScript support with Prisma's generated types:

```typescript
import type { User, Session } from '@prisma/client'
import type { PrismaAdapter } from '@keyloom/adapters-prisma'
```

## License

MIT
