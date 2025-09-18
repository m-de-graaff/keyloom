-- Seed sample data for RBAC testing (PostgreSQL)
-- Assumes base User table exists

INSERT INTO "Organization" (id, name, slug)
VALUES
  ('org_demo_1', 'Acme Inc', 'acme'),
  ('org_demo_2', 'Beta LLC', 'beta')
ON CONFLICT (id) DO NOTHING;

-- Create two users if they don't exist
INSERT INTO "User" (id, email, name)
VALUES
  ('user_demo_1', 'owner@acme.test', 'Owner One'),
  ('user_demo_2', 'member@acme.test', 'Member Two')
ON CONFLICT (id) DO NOTHING;

-- Memberships
INSERT INTO "Membership" (id, userId, orgId, role, status)
VALUES
  ('mem_demo_1', 'user_demo_1', 'org_demo_1', 'owner', 'active'),
  ('mem_demo_2', 'user_demo_2', 'org_demo_1', 'member', 'active')
ON CONFLICT (id) DO NOTHING;

-- Entitlements
INSERT INTO "Entitlement" (orgId, plan, seats, features)
VALUES
  ('org_demo_1', 'pro', 10, '{"sso":true,"api":true}')
ON CONFLICT ("orgId") DO UPDATE SET plan = EXCLUDED.plan, seats = EXCLUDED.seats, features = EXCLUDED.features;

