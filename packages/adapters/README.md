# @keyloom/adapters

Consolidated database adapters for Keyloom. Start with Prisma:

## Installation

```bash
npm install @keyloom/adapters @prisma/client prisma
# or
pnpm add @keyloom/adapters @prisma/client prisma
```

## Quick Start (Prisma)

```ts
import { PrismaAdapter } from "@keyloom/adapters";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export default {
  adapter: PrismaAdapter(prisma),
  // ...
};
```

See SCHEMA.md in this package for the reference Prisma schema.
