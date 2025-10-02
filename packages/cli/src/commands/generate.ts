import { mkdirSync, existsSync, writeFileSync, readFileSync } from 'node:fs'
import { join } from 'node:path'

export async function generateCommand(args: string[]) {
  const sub = args[0]
  if (!sub) {
    printUsage()
    process.exit(1)
  }
  if (sub === 'migration') {
    await generateMigration()
    return
  }
  // Back-compat alias
  if (sub === 'prisma-rbac') {
    await generateMigration('prisma')
    return
  }
  console.error(`Unknown subcommand: ${sub}`)
  printUsage()
  process.exit(1)
}

function printUsage() {
  console.log('Usage: keyloom generate <subcommand>')
  console.log('  migration     Detect adapter and generate RBAC migrations/schema')
  console.log('  prisma-rbac   [DEPRECATED] Generate Prisma RBAC scaffolding')
}

type AdapterKind = 'prisma' | 'drizzle-pg' | 'drizzle-mysql' | 'postgres' | 'mysql2' | 'mongo'

function readJSON(path: string): any | null {
  try {
    return JSON.parse(readFileSync(path, 'utf8'))
  } catch {
    return null
  }
}
function hasDep(pkg: any, name: string) {
  return Boolean(pkg?.dependencies?.[name] || pkg?.devDependencies?.[name])
}
export function detectAdapter(cwd: string): AdapterKind {
  const pkg = readJSON(join(cwd, 'package.json'))
  // Drizzle dialect detection first
  if (hasDep(pkg, 'drizzle-orm')) {
    if (hasDep(pkg, 'mysql2')) return 'drizzle-mysql'
    return 'drizzle-pg'
  }
  // Prisma
  if (
    hasDep(pkg, 'prisma') ||
    hasDep(pkg, '@prisma/client') ||
    hasDep(pkg, '@keyloom/adapters/prisma')
  )
    return 'prisma'
  // Raw adapters
  if (hasDep(pkg, '@keyloom/adapters/postgres') || hasDep(pkg, 'pg')) return 'postgres'
  if (hasDep(pkg, '@keyloom/adapters/mysql2') || hasDep(pkg, 'mysql2')) return 'mysql2'
  if (hasDep(pkg, '@keyloom/adapters/mongo') || hasDep(pkg, 'mongodb')) return 'mongo'
  // Try to sniff keyloom.config.*
  const configFiles = [
    'keyloom.config.ts',
    'keyloom.config.js',
    'keyloom.config.mjs',
    'keyloom.config.cjs',
  ]
  for (const f of configFiles) {
    try {
      const src = readFileSync(join(cwd, f), 'utf8')
      if (/drizzle/i.test(src)) return /mysql/i.test(src) ? 'drizzle-mysql' : 'drizzle-pg'
      if (/prisma/i.test(src)) return 'prisma'
      if (/postgres|pg\b/i.test(src)) return 'postgres'
      if (/mysql2?/i.test(src)) return 'mysql2'
      if (/mongo/i.test(src)) return 'mongo'
    } catch {}
  }
  return 'prisma'
}

export async function generateMigration(adapterOverride?: AdapterKind) {
  const cwd = process.cwd()
  const kind = adapterOverride ?? detectAdapter(cwd)
  switch (kind) {
    case 'prisma':
      return generatePrisma(cwd)
    case 'drizzle-pg':
      return generateDrizzle(cwd, 'pg')
    case 'drizzle-mysql':
      return generateDrizzle(cwd, 'mysql')
    case 'postgres':
      return generatePostgres(cwd)
    case 'mysql2':
      return generateMysql(cwd)
    case 'mongo':
      return generateMongo(cwd)
  }
}

function tsStamp() {
  const ts = new Date()
  return `${ts.getFullYear()}${String(ts.getMonth() + 1).padStart(
    2,
    '0',
  )}${String(ts.getDate()).padStart(2, '0')}_${String(ts.getHours()).padStart(
    2,
    '0',
  )}${String(ts.getMinutes()).padStart(2, '0')}${String(ts.getSeconds()).padStart(2, '0')}`
}

function generatePrisma(cwd: string) {
  const prismaDir = join(cwd, 'prisma')
  const migrationsDir = join(prismaDir, 'migrations')
  if (!existsSync(prismaDir)) mkdirSync(prismaDir)
  if (!existsSync(migrationsDir)) mkdirSync(migrationsDir)

  const schemaPath = join(prismaDir, 'schema.prisma')
  const schema = `// Keyloom RBAC schema additions\n\nmodel Organization {\n  id        String   @id @default(cuid())\n  name      String\n  slug      String?  @unique\n  createdAt DateTime @default(now())\n  updatedAt DateTime @updatedAt\n  memberships Membership[]\n  invites     Invite[]\n  entitlement Entitlement?\n}\n\nmodel Membership {\n  id        String   @id @default(cuid())\n  userId    String\n  orgId     String\n  role      String\n  status    String   @default(\"active\")\n  createdAt DateTime @default(now())\n  updatedAt DateTime @updatedAt\n  user User @relation(fields: [userId], references: [id], onDelete: Cascade)\n  org  Organization @relation(fields: [orgId], references: [id], onDelete: Cascade)\n  @@unique([userId, orgId])\n  @@index([orgId])\n  @@index([userId, orgId, role, status])\n}\n\nmodel Invite {\n  id         String   @id @default(cuid())\n  orgId      String\n  email      String\n  role       String\n  tokenHash  String\n  expiresAt  DateTime\n  createdAt  DateTime @default(now())\n  acceptedAt DateTime?\n  org Organization @relation(fields: [orgId], references: [id], onDelete: Cascade)\n  @@unique([orgId, tokenHash])\n  @@index([orgId])\n  @@index([expiresAt])\n}\n\nmodel Entitlement {\n  orgId      String   @id\n  plan       String?\n  seats      Int?\n  features   Json?\n  limits     Json?\n  validUntil DateTime?\n  org Organization @relation(fields: [orgId], references: [id], onDelete: Cascade)\n}\n`

  if (!existsSync(schemaPath)) {
    const fullSchema =
      `// Generated by Keyloom — Prisma schema (default: PostgreSQL)
// NOTE: If you are not using PostgreSQL, change the datasource provider accordingly.

generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

model User {
  id            String    @id @default(cuid())
  email         String?   @unique
  emailVerified DateTime?
  name          String?
  image         String?
  createdAt     DateTime  @default(now())
  updatedAt     DateTime  @updatedAt

  accounts      Account[]
  sessions      Session[]
  credentials   Credential?
  authKeys      AuthKey[]
  auditLogs     AuditLog[]
  refreshTokens RefreshToken[]
  Membership    Membership[]
}

model Account {
  id                String   @id @default(cuid())
  userId            String
  type              String
  provider          String
  providerAccountId String
  refresh_token     String?
  access_token      String?
  expires_at        Int?
  token_type        String?
  scope             String?
  id_token          String?
  session_state     String?
  user              User     @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@unique([provider, providerAccountId])
  @@index([userId])
}

model Session {
  id           String   @id @default(cuid())
  sessionToken String   @unique
  userId       String
  expires      DateTime
  user         User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  @@index([userId])
}

model VerificationToken {
  identifier String
  token      String   @unique
  expires    DateTime
  @@unique([identifier, token])
}

model Credential {
  id        String   @id @default(cuid())
  userId    String   @unique
  publicKey String
  counter   Int      @default(0)
  createdAt DateTime @default(now())
  user      User     @relation(fields: [userId], references: [id], onDelete: Cascade)
}

model AuthKey {
  id        String   @id @default(cuid())
  userId    String
  keyId     String
  publicKey String
  counter   Int      @default(0)
  createdAt DateTime @default(now())
  user      User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  @@unique([userId, keyId])
}

model AuditLog {
  id        String   @id @default(cuid())
  userId    String?
  action    String
  resource  String?
  details   Json?
  ipAddress String?
  userAgent String?
  createdAt DateTime @default(now())
  user      User?    @relation(fields: [userId], references: [id], onDelete: SetNull)
  @@index([userId])
  @@index([action])
  @@index([createdAt])
}

model RefreshToken {
  id        String   @id @default(cuid())
  userId    String
  tokenHash String   @unique
  expiresAt DateTime
  createdAt DateTime @default(now())
  user      User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  @@index([userId])
  @@index([expiresAt])
}

` + schema
    writeFileSync(schemaPath, fullSchema)
    console.log(`Created ${schemaPath}`)
  } else {
    // Check if RBAC models already exist to avoid duplication
    const existingContent = readFileSync(schemaPath, 'utf8')
    const rbacMarker = '// --- Added by Keyloom: RBAC models ---'

    if (existingContent.includes(rbacMarker)) {
      console.log(`RBAC models already exist in ${schemaPath}, skipping...`)
      return
    }

    // Check if any RBAC models already exist individually
    const rbacModels = [
      'model Organization',
      'model Membership',
      'model Invite',
      'model Entitlement',
    ]
    const hasExistingRbacModels = rbacModels.some((model) => existingContent.includes(model))

    if (hasExistingRbacModels) {
      console.log(`Some RBAC models already exist in ${schemaPath}, skipping to avoid conflicts...`)
      return
    }

    const delim = '\n// --- Added by Keyloom: RBAC models ---\n'
    writeFileSync(schemaPath, delim + schema, { flag: 'a' })
    console.log(`Appended RBAC models to ${schemaPath}`)
  }

  const migDir = join(migrationsDir, `${tsStamp()}_rbac`)
  if (!existsSync(migDir)) mkdirSync(migDir)
  const migPath = join(migDir, 'migration.sql')
  const migSql = `-- See Keyloom adapters/SCHEMA.md for canonical schema` + '\n'
  writeFileSync(migPath, migSql)
  console.log(`Created ${migPath}`)
}

function generateDrizzle(cwd: string, dialect: 'pg' | 'mysql') {
  const baseDir = join(cwd, 'drizzle')
  const schemaDir = join(baseDir, 'schema')
  const migrationsDir = join(baseDir, 'migrations')
  if (!existsSync(baseDir)) mkdirSync(baseDir)
  if (!existsSync(schemaDir)) mkdirSync(schemaDir)
  if (!existsSync(migrationsDir)) mkdirSync(migrationsDir)

  const schemaPath = join(schemaDir, 'rbac.ts')
  const isPg = dialect === 'pg'
  const importLine = isPg
    ? "import { pgTable, text, timestamp, jsonb, index, unique } from 'drizzle-orm/pg-core'"
    : "import { mysqlTable, varchar, datetime, json, index, unique } from 'drizzle-orm/mysql-core'"
  const idType = isPg ? 'text' : 'varchar'
  const str = isPg ? 'text' : 'varchar'
  const tsType = isPg ? 'timestamp' : 'datetime'
  const jsonType = isPg ? 'jsonb' : 'json'

  const schemaTs = `${importLine}\n\n// Keyloom RBAC schema (generated)\nexport const organizations = ${
    isPg ? 'pgTable' : 'mysqlTable'
  }('organizations', {\n  id: ${idType}('id').primaryKey(),\n  name: ${str}('name').notNull(),\n  slug: ${str}('slug').unique(),\n  createdAt: ${tsType}('created_at').defaultNow().notNull(),\n  updatedAt: ${tsType}('updated_at').defaultNow().notNull(),\n})\n\nexport const memberships = ${
    isPg ? 'pgTable' : 'mysqlTable'
  }('memberships', {\n  id: ${idType}('id').primaryKey(),\n  userId: ${str}('user_id').notNull(),\n  orgId: ${str}('org_id').notNull(),\n  role: ${str}('role').notNull(),\n  status: ${str}('status').default('active').notNull(),\n  createdAt: ${tsType}('created_at').defaultNow().notNull(),\n  updatedAt: ${tsType}('updated_at').defaultNow().notNull(),\n}, (t) => ({\n  u_user_org: unique('u_user_org').on(t.userId, t.orgId),\n  i_org: index('i_org').on(t.orgId),\n  i_user_org_role_status: index('i_user_org_role_status').on(t.userId, t.orgId, t.role, t.status),\n}))\n\nexport const invites = ${
    isPg ? 'pgTable' : 'mysqlTable'
  }('invites', {\n  id: ${idType}('id').primaryKey(),\n  orgId: ${str}('org_id').notNull(),\n  email: ${str}('email').notNull(),\n  role: ${str}('role').notNull(),\n  tokenHash: ${str}('token_hash').notNull(),\n  expiresAt: ${tsType}('expires_at').notNull(),\n  createdAt: ${tsType}('created_at').defaultNow().notNull(),\n  acceptedAt: ${tsType}('accepted_at'),\n}, (t) => ({\n  u_org_token: unique('u_org_token').on(t.orgId, t.tokenHash),\n  i_org: index('i_inv_org').on(t.orgId),\n  i_exp: index('i_inv_exp').on(t.expiresAt),\n}))\n\nexport const entitlements = ${
    isPg ? 'pgTable' : 'mysqlTable'
  }('entitlements', {\n  orgId: ${str}('org_id').primaryKey(),\n  plan: ${str}('plan'),\n  seats: ${
    isPg ? 'integer' : 'int'
  }('seats'),\n  features: ${jsonType}("features"),\n  limits: ${jsonType}("limits"),\n  validUntil: ${tsType}('valid_until'),\n})\n`

  writeFileSync(schemaPath, schemaTs)
  console.log(`Created ${schemaPath}`)

  const migPath = join(migrationsDir, `${tsStamp()}_rbac.sql`)
  const sql = isPg ? pgSql() : mysqlSql()
  writeFileSync(migPath, sql)
  console.log(`Created ${migPath}`)
}

function generatePostgres(cwd: string) {
  const dir = join(cwd, 'db', 'migrations')
  mkdirp(dir)
  const path = join(dir, `${tsStamp()}_rbac.sql`)
  writeFileSync(path, pgSql())
  console.log(`Created ${path}`)
}

function generateMysql(cwd: string) {
  const dir = join(cwd, 'db', 'migrations')
  mkdirp(dir)
  const path = join(dir, `${tsStamp()}_rbac.sql`)
  writeFileSync(path, mysqlSql())
  console.log(`Created ${path}`)
}

function generateMongo(cwd: string) {
  const dir = join(cwd, 'migrations', 'mongo')
  mkdirp(dir)
  const path = join(dir, `${tsStamp()}_rbac.js`)
  const js = `// Mongo RBAC indexes\n// Usage: mongo <uri> ${path
    .split('\\')
    .pop()}\n\ndb.createCollection('organizations')\n\ndb.organizations.createIndex({ slug: 1 }, { unique: true, sparse: true })\n\ndb.createCollection('memberships')\ndb.memberships.createIndex({ userId: 1, orgId: 1 }, { unique: true })\ndb.memberships.createIndex({ orgId: 1 })\ndb.memberships.createIndex({ userId: 1, orgId: 1, role: 1, status: 1 })\n\ndb.createCollection('invites')\ndb.invites.createIndex({ orgId: 1, tokenHash: 1 }, { unique: true })\ndb.invites.createIndex({ orgId: 1 })\ndb.invites.createIndex({ expiresAt: 1 })\n\ndb.createCollection('entitlements')\ndb.entitlements.createIndex({ orgId: 1 }, { unique: true })\n`
  writeFileSync(path, js)
  console.log(`Created ${path}`)
}

function mkdirp(path: string) {
  if (!existsSync(path)) mkdirSync(path, { recursive: true })
}

function pgSql() {
  return `-- Keyloom RBAC (PostgreSQL)\nCREATE TABLE IF NOT EXISTS organizations (\n  id text PRIMARY KEY,\n  name text NOT NULL,\n  slug text UNIQUE,\n  created_at timestamptz NOT NULL DEFAULT now(),\n  updated_at timestamptz NOT NULL DEFAULT now()\n);\n\nCREATE TABLE IF NOT EXISTS memberships (\n  id text PRIMARY KEY,\n  user_id text NOT NULL,\n  org_id text NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,\n  role text NOT NULL,\n  status text NOT NULL DEFAULT 'active',\n  created_at timestamptz NOT NULL DEFAULT now(),\n  updated_at timestamptz NOT NULL DEFAULT now(),\n  UNIQUE(user_id, org_id)\n);\nCREATE INDEX IF NOT EXISTS i_memberships_org ON memberships(org_id);\nCREATE INDEX IF NOT EXISTS i_memberships_user_org_role_status ON memberships(user_id, org_id, role, status);\n\nCREATE TABLE IF NOT EXISTS invites (\n  id text PRIMARY KEY,\n  org_id text NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,\n  email text NOT NULL,\n  role text NOT NULL,\n  token_hash text NOT NULL,\n  expires_at timestamptz NOT NULL,\n  created_at timestamptz NOT NULL DEFAULT now(),\n  accepted_at timestamptz,\n  UNIQUE(org_id, token_hash)\n);\nCREATE INDEX IF NOT EXISTS i_invites_org ON invites(org_id);\nCREATE INDEX IF NOT EXISTS i_invites_exp ON invites(expires_at);\n\nCREATE TABLE IF NOT EXISTS entitlements (\n  org_id text PRIMARY KEY REFERENCES organizations(id) ON DELETE CASCADE,\n  plan text,\n  seats integer,\n  features jsonb,\n  limits jsonb,\n  valid_until timestamptz\n);\n`
}

function mysqlSql() {
  return `-- Keyloom RBAC (MySQL)\nCREATE TABLE IF NOT EXISTS organizations (\n  id varchar(191) PRIMARY KEY,\n  name varchar(255) NOT NULL,\n  slug varchar(255) UNIQUE,\n  created_at datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,\n  updated_at datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP\n);\n\nCREATE TABLE IF NOT EXISTS memberships (\n  id varchar(191) PRIMARY KEY,\n  user_id varchar(191) NOT NULL,\n  org_id varchar(191) NOT NULL,\n  role varchar(191) NOT NULL,\n  status varchar(191) NOT NULL DEFAULT 'active',\n  created_at datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,\n  updated_at datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,\n  UNIQUE KEY u_user_org (user_id, org_id),\n  INDEX i_org (org_id),\n  INDEX i_user_org_role_status (user_id, org_id, role, status),\n  CONSTRAINT fk_memberships_org FOREIGN KEY (org_id) REFERENCES organizations(id) ON DELETE CASCADE\n);\n\nCREATE TABLE IF NOT EXISTS invites (\n  id varchar(191) PRIMARY KEY,\n  org_id varchar(191) NOT NULL,\n  email varchar(255) NOT NULL,\n  role varchar(191) NOT NULL,\n  token_hash varchar(255) NOT NULL,\n  expires_at datetime NOT NULL,\n  created_at datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,\n  accepted_at datetime DEFAULT NULL,\n  UNIQUE KEY u_org_token (org_id, token_hash),\n  INDEX i_inv_org (org_id),\n  INDEX i_inv_exp (expires_at),\n  CONSTRAINT fk_invites_org FOREIGN KEY (org_id) REFERENCES organizations(id) ON DELETE CASCADE\n);\n\nCREATE TABLE IF NOT EXISTS entitlements (\n  org_id varchar(191) PRIMARY KEY,\n  plan varchar(191) NULL,\n  seats int NULL,\n  features JSON NULL,\n  limits JSON NULL,\n  valid_until datetime NULL,\n  CONSTRAINT fk_entitlements_org FOREIGN KEY (org_id) REFERENCES organizations(id) ON DELETE CASCADE\n);\n`
}
