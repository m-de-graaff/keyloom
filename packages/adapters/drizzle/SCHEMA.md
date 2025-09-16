# Drizzle Schema for Keyloom

This document describes the database schema for the Keyloom Drizzle adapter, which supports PostgreSQL, MySQL, and SQLite.

## Multi-Database Support

The schema is designed to work across different database dialects:

- **PostgreSQL**: Full feature support with JSON columns, case-insensitive text (citext), and advanced indexing
- **MySQL**: Compatible with utf8mb4 charset, uses JSON columns where supported
- **SQLite**: Basic support with JSON stored as TEXT, application-level case normalization

## Core Tables

### User
Stores user account information.

```sql
CREATE TABLE "User" (
  "id" VARCHAR(191) PRIMARY KEY,
  "email" VARCHAR(191) UNIQUE,
  "emailVerified" TIMESTAMP,
  "name" VARCHAR(191),
  "image" TEXT,
  "createdAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
  "updatedAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL
);

CREATE INDEX "User_email_idx" ON "User"("email");
```

### Account
OAuth/social login account linkages.

```sql
CREATE TABLE "Account" (
  "id" VARCHAR(191) PRIMARY KEY,
  "userId" VARCHAR(191) NOT NULL REFERENCES "User"("id") ON DELETE CASCADE,
  "provider" VARCHAR(191) NOT NULL,
  "providerAccountId" VARCHAR(191) NOT NULL,
  "refresh_token" TEXT,
  "access_token" TEXT,
  "expires_at" INTEGER,
  "token_type" VARCHAR(191),
  "scope" VARCHAR(191),
  "id_token" TEXT,
  "session_state" VARCHAR(191),
  "createdAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
  "updatedAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL
);

CREATE UNIQUE INDEX "Account_provider_providerAccountId_key" ON "Account"("provider", "providerAccountId");
CREATE INDEX "Account_userId_idx" ON "Account"("userId");
```

### Session
Database sessions for cookie-based authentication.

```sql
CREATE TABLE "Session" (
  "id" VARCHAR(191) PRIMARY KEY,
  "userId" VARCHAR(191) NOT NULL REFERENCES "User"("id") ON DELETE CASCADE,
  "expiresAt" TIMESTAMP NOT NULL,
  "createdAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL
);

CREATE INDEX "Session_userId_idx" ON "Session"("userId");
CREATE INDEX "Session_expiresAt_idx" ON "Session"("expiresAt");
```

### VerificationToken
Email verification and password reset tokens.

```sql
CREATE TABLE "VerificationToken" (
  "identifier" VARCHAR(191) NOT NULL,
  "tokenHash" VARCHAR(191) NOT NULL,
  "expiresAt" TIMESTAMP NOT NULL,
  "createdAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
  PRIMARY KEY ("identifier", "tokenHash")
);

CREATE INDEX "VerificationToken_expiresAt_idx" ON "VerificationToken"("expiresAt");
```

### AuditEvent
Security and activity audit logging.

```sql
CREATE TABLE "AuditEvent" (
  "id" VARCHAR(191) PRIMARY KEY,
  "type" VARCHAR(191) NOT NULL,
  "userId" VARCHAR(191) REFERENCES "User"("id") ON DELETE SET NULL,
  "ip" VARCHAR(45),
  "userAgent" TEXT,
  "timestamp" TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
  "metadata" JSON
);

CREATE INDEX "AuditEvent_type_idx" ON "AuditEvent"("type");
CREATE INDEX "AuditEvent_userId_idx" ON "AuditEvent"("userId");
CREATE INDEX "AuditEvent_timestamp_idx" ON "AuditEvent"("timestamp");
```

## RBAC Tables

### Organization
Multi-tenant organizations.

```sql
CREATE TABLE "Organization" (
  "id" VARCHAR(191) PRIMARY KEY,
  "name" VARCHAR(191) NOT NULL,
  "slug" VARCHAR(191) UNIQUE,
  "createdAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
  "updatedAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL
);

CREATE INDEX "Organization_slug_idx" ON "Organization"("slug");
```

### Membership
User-organization relationships with roles.

```sql
CREATE TABLE "Membership" (
  "id" VARCHAR(191) PRIMARY KEY,
  "userId" VARCHAR(191) NOT NULL REFERENCES "User"("id") ON DELETE CASCADE,
  "orgId" VARCHAR(191) NOT NULL REFERENCES "Organization"("id") ON DELETE CASCADE,
  "role" VARCHAR(191) NOT NULL,
  "status" VARCHAR(191) NOT NULL DEFAULT 'active',
  "createdAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
  "updatedAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL
);

CREATE UNIQUE INDEX "Membership_userId_orgId_key" ON "Membership"("userId", "orgId");
CREATE INDEX "Membership_orgId_idx" ON "Membership"("orgId");
```

### Invite
Organization invitations.

```sql
CREATE TABLE "Invite" (
  "id" VARCHAR(191) PRIMARY KEY,
  "orgId" VARCHAR(191) NOT NULL REFERENCES "Organization"("id") ON DELETE CASCADE,
  "email" VARCHAR(191) NOT NULL,
  "role" VARCHAR(191) NOT NULL,
  "tokenHash" VARCHAR(191) NOT NULL,
  "expiresAt" TIMESTAMP NOT NULL,
  "acceptedAt" TIMESTAMP,
  "createdAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL
);

CREATE UNIQUE INDEX "Invite_orgId_tokenHash_key" ON "Invite"("orgId", "tokenHash");
CREATE INDEX "Invite_email_idx" ON "Invite"("email");
CREATE INDEX "Invite_expiresAt_idx" ON "Invite"("expiresAt");
```

### Entitlement
Organization feature entitlements and limits.

```sql
CREATE TABLE "Entitlement" (
  "id" VARCHAR(191) PRIMARY KEY,
  "orgId" VARCHAR(191) NOT NULL UNIQUE REFERENCES "Organization"("id") ON DELETE CASCADE,
  "plan" VARCHAR(191),
  "seats" INTEGER,
  "features" JSON,
  "limits" JSON,
  "validUntil" TIMESTAMP,
  "createdAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
  "updatedAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL
);
```

## JWT Tables

### RefreshToken
JWT refresh token management with family tracking.

```sql
CREATE TABLE "RefreshToken" (
  "id" VARCHAR(191) PRIMARY KEY,
  "familyId" VARCHAR(191) NOT NULL,
  "jti" VARCHAR(191) NOT NULL UNIQUE,
  "userId" VARCHAR(191) NOT NULL REFERENCES "User"("id") ON DELETE CASCADE,
  "sessionId" VARCHAR(191) REFERENCES "Session"("id") ON DELETE SET NULL,
  "tokenHash" VARCHAR(191) NOT NULL UNIQUE,
  "expiresAt" TIMESTAMP NOT NULL,
  "rotatedAt" TIMESTAMP,
  "revokedAt" TIMESTAMP,
  "parentJti" VARCHAR(191),
  "ip" VARCHAR(45),
  "userAgent" TEXT,
  "createdAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL
);

CREATE INDEX "RefreshToken_familyId_idx" ON "RefreshToken"("familyId");
CREATE INDEX "RefreshToken_userId_idx" ON "RefreshToken"("userId");
CREATE INDEX "RefreshToken_expiresAt_idx" ON "RefreshToken"("expiresAt");
CREATE INDEX "RefreshToken_tokenHash_idx" ON "RefreshToken"("tokenHash");
```

## Database-Specific Considerations

### PostgreSQL
- Use `citext` extension for case-insensitive email handling
- JSON columns have full query support
- Consider using `TIMESTAMPTZ` for timezone-aware timestamps

### MySQL
- Use `utf8mb4_unicode_ci` collation for case-insensitive email handling
- JSON columns available in MySQL 5.7+
- VARCHAR length limited to 191 characters for utf8mb4 indexes

### SQLite
- JSON stored as TEXT with limited query capabilities
- Case-insensitive email handling done at application level
- No foreign key constraints by default (enable with PRAGMA)

## Indexes and Performance

Key indexes for optimal performance:

1. **User lookups**: `User.email`
2. **Session management**: `Session.userId`, `Session.expiresAt`
3. **Account linking**: `Account.provider + providerAccountId`
4. **RBAC queries**: `Membership.userId + orgId`, `Membership.orgId`
5. **Token cleanup**: `VerificationToken.expiresAt`, `RefreshToken.expiresAt`
6. **Audit queries**: `AuditEvent.type`, `AuditEvent.userId`, `AuditEvent.timestamp`

## Migration Strategy

When migrating between databases:

1. Export data using Drizzle's migration tools
2. Adjust schema for target database dialect
3. Handle data type conversions (especially JSON columns)
4. Update application configuration for new dialect
5. Test thoroughly with contract test suite
