import type {
  Entitlements,
  Invite,
  Membership,
  Organization,
  RbacAdapter,
} from "../../rbac/types";
import type { ID } from "../../types";
import { newId } from "../../util/ids";
import { now } from "../../util/time";
import type { MemoryStore } from "./store";

export function memoryRbac(store: MemoryStore): RbacAdapter {
  return {
    async createOrganization(data: {
      name: string;
      slug?: string | null;
    }): Promise<Organization> {
      const id = newId();
      const dt = now();
      const org: Organization = {
        id,
        name: data.name,
        slug: data.slug ?? null,
        createdAt: dt,
        updatedAt: dt,
      };
      store.orgs.set(id, org);
      return org;
    },

    async getOrganization(id: ID) {
      return store.orgs.get(id) ?? null;
    },

    async getOrganizationsByUser(userId: ID) {
      const orgIds = new Set<ID>();
      for (const m of store.memberships.values()) {
        if (m.userId === userId && m.status === "active") orgIds.add(m.orgId);
      }
      return Array.from(orgIds)
        .map((oid) => store.orgs.get(oid)!)
        .filter(Boolean);
    },

    async addMember(data: {
      userId: ID;
      orgId: ID;
      role: string;
    }): Promise<Membership> {
      const key = `${data.userId}:${data.orgId}`;
      if (store.membershipByUserOrg.has(key)) {
        const existing = store.memberships.get(
          store.membershipByUserOrg.get(key)!
        )!;
        return existing;
      }
      const id = newId();
      const dt = now();
      const m: Membership = {
        id,
        userId: data.userId,
        orgId: data.orgId,
        role: data.role,
        status: "active",
        createdAt: dt,
        updatedAt: dt,
      };
      store.memberships.set(id, m);
      store.membershipByUserOrg.set(key, id);
      return m;
    },

    async updateMember(
      id: ID,
      data: Partial<Pick<Membership, "role" | "status">>
    ): Promise<Membership> {
      const prev = store.memberships.get(id);
      if (!prev) throw new Error("membership_not_found");

      // Last owner protection: prevent downgrading the last 'owner'
      const isDowngradeOwner =
        prev.role === "owner" &&
        typeof data.role !== "undefined" &&
        data.role !== "owner";
      if (isDowngradeOwner) {
        let ownerCount = 0;
        for (const m of store.memberships.values())
          if (
            m.orgId === prev.orgId &&
            m.role === "owner" &&
            m.status === "active"
          )
            ownerCount++;
        if (ownerCount <= 1) throw new Error("last_owner");
      }

      const next: Membership = { ...prev, ...data, updatedAt: now() };
      store.memberships.set(id, next);
      return next;
    },

    async removeMember(id: ID): Promise<void> {
      const prev = store.memberships.get(id);
      if (!prev) return;

      // Last owner protection: prevent removing the last 'owner'
      if (prev.role === "owner") {
        let ownerCount = 0;
        for (const m of store.memberships.values())
          if (
            m.orgId === prev.orgId &&
            m.role === "owner" &&
            m.status === "active"
          )
            ownerCount++;
        if (ownerCount <= 1) throw new Error("last_owner");
      }

      store.memberships.delete(id);
      store.membershipByUserOrg.delete(`${prev.userId}:${prev.orgId}`);
    },

    async getMembership(userId: ID, orgId: ID) {
      const mid = store.membershipByUserOrg.get(`${userId}:${orgId}`);
      return mid ? store.memberships.get(mid) ?? null : null;
    },

    async listMembers(orgId: ID) {
      const out: (Membership & { userEmail?: string | null })[] = [];
      for (const m of store.memberships.values())
        if (m.orgId === orgId) out.push({ ...m, userEmail: null });
      return out;
    },

    async createInvite(data: {
      orgId: ID;
      email: string;
      role: string;
      tokenHash: string;
      expiresAt: Date;
    }): Promise<Invite> {
      const id = newId();
      const inv: Invite = {
        id,
        orgId: data.orgId,
        email: data.email,
        role: data.role,
        tokenHash: data.tokenHash,
        expiresAt: data.expiresAt,
        createdAt: now(),
        acceptedAt: null,
      };
      store.invites.set(id, inv);
      store.inviteByOrgToken.set(`${data.orgId}:${data.tokenHash}`, id);
      return inv;
    },

    async getInviteByTokenHash(orgId: ID, tokenHash: string) {
      const id = store.inviteByOrgToken.get(`${orgId}:${tokenHash}`);
      return id ? store.invites.get(id) ?? null : null;
    },

    async consumeInvite(inviteId: ID) {
      const inv = store.invites.get(inviteId);
      if (!inv) return;
      store.invites.set(inviteId, { ...inv, acceptedAt: now() });
    },

    async getEntitlements(orgId: ID): Promise<Entitlements | null> {
      return store.entitlements.get(orgId) ?? null;
    },

    async setEntitlements(orgId: ID, ent: Entitlements): Promise<void> {
      store.entitlements.set(orgId, ent);
    },
  };
}
