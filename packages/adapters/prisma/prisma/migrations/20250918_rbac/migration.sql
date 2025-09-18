-- RBAC & Organizations migration (PostgreSQL)
-- Create organizations, memberships, invites, entitlements

CREATE TABLE IF NOT EXISTS "Organization" (
  "id" TEXT PRIMARY KEY DEFAULT gen_random_uuid(),
  "name" TEXT NOT NULL,
  "slug" TEXT UNIQUE,
  "createdAt" TIMESTAMP NOT NULL DEFAULT NOW(),
  "updatedAt" TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS "Membership" (
  "id" TEXT PRIMARY KEY DEFAULT gen_random_uuid(),
  "userId" TEXT NOT NULL,
  "orgId" TEXT NOT NULL,
  "role" TEXT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'active',
  "createdAt" TIMESTAMP NOT NULL DEFAULT NOW(),
  "updatedAt" TIMESTAMP NOT NULL DEFAULT NOW(),
  CONSTRAINT "Membership_user_org_unique" UNIQUE("userId", "orgId"),
  CONSTRAINT "Membership_org_fkey" FOREIGN KEY ("orgId") REFERENCES "Organization"("id") ON DELETE CASCADE,
  CONSTRAINT "Membership_user_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS "Membership_org_idx" ON "Membership" ("orgId");
CREATE INDEX IF NOT EXISTS "Membership_comp_idx" ON "Membership" ("userId", "orgId", "role", "status");

CREATE TABLE IF NOT EXISTS "Invite" (
  "id" TEXT PRIMARY KEY DEFAULT gen_random_uuid(),
  "orgId" TEXT NOT NULL,
  "email" TEXT NOT NULL,
  "role" TEXT NOT NULL,
  "tokenHash" TEXT NOT NULL,
  "expiresAt" TIMESTAMP NOT NULL,
  "createdAt" TIMESTAMP NOT NULL DEFAULT NOW(),
  "acceptedAt" TIMESTAMP NULL,
  CONSTRAINT "Invite_org_fkey" FOREIGN KEY ("orgId") REFERENCES "Organization"("id") ON DELETE CASCADE,
  CONSTRAINT "Invite_tokenHash_unique_per_org" UNIQUE("orgId", "tokenHash")
);

CREATE INDEX IF NOT EXISTS "Invite_org_idx" ON "Invite" ("orgId");
CREATE INDEX IF NOT EXISTS "Invite_expires_idx" ON "Invite" ("expiresAt");

CREATE TABLE IF NOT EXISTS "Entitlement" (
  "orgId" TEXT PRIMARY KEY,
  "plan" TEXT NULL,
  "seats" INTEGER NULL,
  "features" JSONB NULL,
  "limits" JSONB NULL,
  "validUntil" TIMESTAMP NULL,
  CONSTRAINT "Entitlement_org_fkey" FOREIGN KEY ("orgId") REFERENCES "Organization"("id") ON DELETE CASCADE
);

-- Trigger to update updatedAt timestamp
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW."updatedAt" = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS set_org_updated_at ON "Organization";
CREATE TRIGGER set_org_updated_at
BEFORE UPDATE ON "Organization"
FOR EACH ROW EXECUTE PROCEDURE set_updated_at();

DROP TRIGGER IF EXISTS set_membership_updated_at ON "Membership";
CREATE TRIGGER set_membership_updated_at
BEFORE UPDATE ON "Membership"
FOR EACH ROW EXECUTE PROCEDURE set_updated_at();

