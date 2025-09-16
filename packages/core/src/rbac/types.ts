import type { ID } from '../types'

export type Role = string
export type Permission = string

export type Organization = {
  id: ID
  name: string
  slug?: string | null
  createdAt: Date
  updatedAt: Date
}

export type MembershipStatus = 'invited' | 'active' | 'suspended'
export type Membership = {
  id: ID
  userId: ID
  orgId: ID
  role: Role
  status: MembershipStatus
  createdAt: Date
  updatedAt: Date
}

export type Invite = {
  id: ID
  orgId: ID
  email: string
  role: Role
  tokenHash: string
  expiresAt: Date
  acceptedAt?: Date | null
  createdAt: Date
}

export type Entitlements = {
  plan?: 'FREE' | 'PRO' | 'BUSINESS' | string
  seats?: number
  features?: Record<string, boolean>
  limits?: Record<string, number>
  validUntil?: Date | null
}

// Adapter extension (non-breaking): apps can narrow adapter to this shape when RBAC is enabled
export interface RbacAdapter {
  // Orgs
  createOrganization(data: { name: string; slug?: string | null }): Promise<Organization>
  getOrganization(id: ID): Promise<Organization | null>
  getOrganizationsByUser(userId: ID): Promise<Organization[]>

  // Memberships
  addMember(data: { userId: ID; orgId: ID; role: Role }): Promise<Membership>
  updateMember(
    id: ID,
    data: Partial<Pick<Membership, 'role' | 'status'>>,
  ): Promise<Membership>
  removeMember(id: ID): Promise<void>
  getMembership(userId: ID, orgId: ID): Promise<Membership | null>
  listMembers(orgId: ID): Promise<(Membership & { userEmail?: string | null })[]>

  // Invites
  createInvite(data: {
    orgId: ID
    email: string
    role: Role
    tokenHash: string
    expiresAt: Date
  }): Promise<Invite>
  getInviteByTokenHash(orgId: ID, tokenHash: string): Promise<Invite | null>
  consumeInvite(inviteId: ID): Promise<void>

  // Entitlements (optional)
  getEntitlements(orgId: ID): Promise<Entitlements | null>
  setEntitlements(orgId: ID, ent: Entitlements): Promise<void>
}

