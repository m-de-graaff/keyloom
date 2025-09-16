import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import type { KeyloomAdapter } from '@keyloom/core/adapter-types'
import {
  TestDataManager,
  randomEmail,
  randomOrg,
  futureDate,
  expectOrganization,
  expectMembership,
  expectUniqueViolation,
  expectNotFound
} from './helpers'

/**
 * RBAC adapter contract tests
 * These tests must pass for all adapter implementations that support RBAC
 */
export function createRbacContractTests(createAdapter: () => KeyloomAdapter) {
  describe('RBAC Contract Tests', () => {
    let adapter: KeyloomAdapter
    let testData: TestDataManager

    beforeEach(async () => {
      adapter = createAdapter()
      testData = new TestDataManager(adapter)
    })

    afterEach(async () => {
      await testData.cleanup()
      if (adapter.close) {
        await adapter.close()
      }
    })

    describe('Organization Management', () => {
      it('should create an organization', async () => {
        const orgData = randomOrg()
        const org = await adapter.createOrganization(orgData)

        expectOrganization(org)
        expect(org.name).toBe(orgData.name)
        expect(org.slug).toBe(orgData.slug)
      })

      it('should retrieve organization by ID', async () => {
        const org = await testData.createOrg()
        const retrieved = await adapter.getOrganization(org.id)

        expect(retrieved).toEqual(org)
      })

      it('should retrieve organization by slug', async () => {
        const org = await testData.createOrg()
        const retrieved = await adapter.getOrganizationBySlug(org.slug!)

        expect(retrieved).toEqual(org)
      })

      it('should return null for non-existent organization', async () => {
        const result = await adapter.getOrganization('non-existent-id')
        expectNotFound(result)
      })

      it('should update organization', async () => {
        const org = await testData.createOrg()
        const updateData = {
          name: 'Updated Organization Name'
        }

        const updated = await adapter.updateOrganization(org.id, updateData)

        expect(updated.name).toBe(updateData.name)
        expect(updated.updatedAt.getTime()).toBeGreaterThan(org.updatedAt.getTime())
      })

      it('should enforce unique slug constraint', async () => {
        const slug = 'unique-org-slug'
        await testData.createOrg({ slug })

        await expect(
          testData.createOrg({ slug })
        ).rejects.toThrow()
      })

      it('should list user organizations', async () => {
        const user = await testData.createUser()
        const org1 = await testData.createOrg()
        const org2 = await testData.createOrg()

        // Add user to organizations
        await adapter.addMember(org1.id, user.id, 'member')
        await adapter.addMember(org2.id, user.id, 'admin')

        const orgs = await adapter.getUserOrganizations(user.id)

        expect(orgs).toHaveLength(2)
        expect(orgs.map(o => o.id)).toContain(org1.id)
        expect(orgs.map(o => o.id)).toContain(org2.id)
      })
    })

    describe('Membership Management', () => {
      it('should add a member to organization', async () => {
        const user = await testData.createUser()
        const org = await testData.createOrg()

        const membership = await adapter.addMember(org.id, user.id, 'member')

        expectMembership(membership)
        expect(membership.userId).toBe(user.id)
        expect(membership.orgId).toBe(org.id)
        expect(membership.role).toBe('member')
        expect(membership.status).toBe('active')
      })

      it('should retrieve membership', async () => {
        const user = await testData.createUser()
        const org = await testData.createOrg()

        const membership = await adapter.addMember(org.id, user.id, 'admin')
        const retrieved = await adapter.getMembership(user.id, org.id)

        expect(retrieved).toEqual(membership)
      })

      it('should return null for non-existent membership', async () => {
        const user = await testData.createUser()
        const org = await testData.createOrg()

        const result = await adapter.getMembership(user.id, org.id)
        expectNotFound(result)
      })

      it('should update member role', async () => {
        const user = await testData.createUser()
        const org = await testData.createOrg()

        await adapter.addMember(org.id, user.id, 'member')
        const updated = await adapter.updateMemberRole(org.id, user.id, 'admin')

        expect(updated.role).toBe('admin')
        expect(updated.updatedAt).toBeInstanceOf(Date)
      })

      it('should remove member from organization', async () => {
        const user = await testData.createUser()
        const org = await testData.createOrg()

        await adapter.addMember(org.id, user.id, 'member')
        await adapter.removeMember(org.id, user.id)

        const membership = await adapter.getMembership(user.id, org.id)
        expectNotFound(membership)
      })

      it('should list organization members', async () => {
        const user1 = await testData.createUser()
        const user2 = await testData.createUser()
        const org = await testData.createOrg()

        await adapter.addMember(org.id, user1.id, 'admin')
        await adapter.addMember(org.id, user2.id, 'member')

        const members = await adapter.getOrganizationMembers(org.id)

        expect(members).toHaveLength(2)
        expect(members.map(m => m.userId)).toContain(user1.id)
        expect(members.map(m => m.userId)).toContain(user2.id)
      })

      it('should enforce unique user-org membership', async () => {
        const user = await testData.createUser()
        const org = await testData.createOrg()

        await adapter.addMember(org.id, user.id, 'member')

        await expect(
          adapter.addMember(org.id, user.id, 'admin')
        ).rejects.toThrow()
      })
    })

    describe('Invitation Management', () => {
      it('should create an invitation', async () => {
        const org = await testData.createOrg()
        const email = randomEmail()

        const invite = await adapter.createInvite({
          orgId: org.id,
          email,
          role: 'member',
          tokenHash: 'hashed-token',
          expiresAt: futureDate()
        })

        expect(invite.orgId).toBe(org.id)
        expect(invite.email).toBe(email)
        expect(invite.role).toBe('member')
        expect(invite.tokenHash).toBe('hashed-token')
        expect(invite.acceptedAt).toBeNull()
      })

      it('should retrieve invitation by token', async () => {
        const org = await testData.createOrg()
        const tokenHash = 'unique-token-hash'

        const invite = await adapter.createInvite({
          orgId: org.id,
          email: randomEmail(),
          role: 'member',
          tokenHash,
          expiresAt: futureDate()
        })

        const retrieved = await adapter.getInviteByToken(org.id, tokenHash)
        expect(retrieved).toEqual(invite)
      })

      it('should accept an invitation', async () => {
        const user = await testData.createUser()
        const org = await testData.createOrg()
        const tokenHash = 'invitation-token'

        const invite = await adapter.createInvite({
          orgId: org.id,
          email: user.email!,
          role: 'member',
          tokenHash,
          expiresAt: futureDate()
        })

        const result = await adapter.acceptInvite(org.id, tokenHash, user.id)

        expect(result.membership.userId).toBe(user.id)
        expect(result.membership.orgId).toBe(org.id)
        expect(result.membership.role).toBe('member')
        expect(result.invite.acceptedAt).toBeInstanceOf(Date)
      })

      it('should list organization invitations', async () => {
        const org = await testData.createOrg()

        await adapter.createInvite({
          orgId: org.id,
          email: randomEmail(),
          role: 'member',
          tokenHash: 'token1',
          expiresAt: futureDate()
        })

        await adapter.createInvite({
          orgId: org.id,
          email: randomEmail(),
          role: 'admin',
          tokenHash: 'token2',
          expiresAt: futureDate()
        })

        const invites = await adapter.getOrganizationInvites(org.id)
        expect(invites).toHaveLength(2)
      })

      it('should revoke an invitation', async () => {
        const org = await testData.createOrg()
        const tokenHash = 'revoke-token'

        await adapter.createInvite({
          orgId: org.id,
          email: randomEmail(),
          role: 'member',
          tokenHash,
          expiresAt: futureDate()
        })

        await adapter.revokeInvite(org.id, tokenHash)

        const invite = await adapter.getInviteByToken(org.id, tokenHash)
        expectNotFound(invite)
      })
    })

    describe('Entitlement Management', () => {
      it('should set organization entitlement', async () => {
        const org = await testData.createOrg()
        const entitlementData = {
          plan: 'pro',
          seats: 10,
          features: { analytics: true, api: true },
          limits: { requests: 10000, storage: 100 },
          validUntil: futureDate()
        }

        const entitlement = await adapter.setEntitlement(org.id, entitlementData)

        expect(entitlement.orgId).toBe(org.id)
        expect(entitlement.plan).toBe(entitlementData.plan)
        expect(entitlement.seats).toBe(entitlementData.seats)
        expect(entitlement.features).toEqual(entitlementData.features)
        expect(entitlement.limits).toEqual(entitlementData.limits)
      })

      it('should retrieve organization entitlement', async () => {
        const org = await testData.createOrg()
        const entitlementData = {
          plan: 'enterprise',
          seats: 50,
          validUntil: futureDate()
        }

        await adapter.setEntitlement(org.id, entitlementData)
        const retrieved = await adapter.getEntitlement(org.id)

        expect(retrieved?.plan).toBe(entitlementData.plan)
        expect(retrieved?.seats).toBe(entitlementData.seats)
      })

      it('should update existing entitlement', async () => {
        const org = await testData.createOrg()

        await adapter.setEntitlement(org.id, {
          plan: 'basic',
          seats: 5
        })

        const updated = await adapter.setEntitlement(org.id, {
          plan: 'pro',
          seats: 15
        })

        expect(updated.plan).toBe('pro')
        expect(updated.seats).toBe(15)
      })

      it('should return null for non-existent entitlement', async () => {
        const org = await testData.createOrg()
        const result = await adapter.getEntitlement(org.id)
        expectNotFound(result)
      })
    })
  })
}
