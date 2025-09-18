import { describe, expect, it } from "vitest";
import { prismaAdapter } from "../src/prisma";
import type { ID } from "@keyloom/core";

function makeFakePrisma() {
  const orgs = new Map<ID, any>();
  const members = new Map<ID, any>();
  const invites = new Map<ID, any>();
  const entitlements = new Map<ID, any>();

  const gen = () => Math.random().toString(36).slice(2);
  const now = () => new Date();

  return {
    organization: {
      async create({ data }: any) {
        const id = gen();
        const o = {
          id,
          name: data.name,
          slug: data.slug ?? null,
          createdAt: now(),
          updatedAt: now(),
        };
        orgs.set(id, o);
        return o;
      },
      async findUnique({ where: { id } }: any) {
        return orgs.get(id) ?? null;
      },
      async findMany({
        where: {
          id: { in: ids },
        },
      }: any) {
        return ids.map((id: ID) => orgs.get(id)).filter(Boolean);
      },
    },
    membership: {
      async findMany({ where, select }: any) {
        const all = Array.from(members.values());
        const filtered = all.filter(
          (m) =>
            (!where?.orgId || m.orgId === where.orgId) &&
            (!where?.userId || m.userId === where.userId) &&
            (!where?.status || m.status === where.status) &&
            (!where?.role || m.role === where.role)
        );
        if (select?.orgId) return filtered.map((m) => ({ orgId: m.orgId }));
        return filtered;
      },
      async findUnique({ where }: any) {
        if (where?.id) return members.get(where.id) ?? null;
        if (where?.userId_orgId) {
          const { userId, orgId } = where.userId_orgId;
          return (
            Array.from(members.values()).find(
              (m) => m.userId === userId && m.orgId === orgId
            ) ?? null
          );
        }
        return null;
      },
      async count({ where }: any) {
        return (await this.findMany({ where })).length;
      },
      async create({ data }: any) {
        const id = gen();
        const m = { id, ...data, createdAt: now(), updatedAt: now() };
        members.set(id, m);
        return m;
      },
      async update({ where: { id }, data }: any) {
        const prev = members.get(id);
        const next = { ...prev, ...data, updatedAt: now() };
        members.set(id, next);
        return next;
      },
      async delete({ where: { id } }: any) {
        members.delete(id);
      },
    },
    invite: {
      async create({ data }: any) {
        const id = gen();
        const inv = { id, ...data, createdAt: now(), acceptedAt: null };
        invites.set(id, inv);
        return inv;
      },
      async findFirst({ where: { orgId, tokenHash } }: any) {
        return (
          Array.from(invites.values()).find(
            (i) => i.orgId === orgId && i.tokenHash === tokenHash
          ) ?? null
        );
      },
      async update({ where: { id }, data }: any) {
        const prev = invites.get(id);
        const next = { ...prev, ...data };
        invites.set(id, next);
        return next;
      },
    },
    entitlement: {
      async findUnique({ where: { orgId } }: any) {
        return entitlements.get(orgId) ?? null;
      },
      async upsert({ where: { orgId }, update, create }: any) {
        const exists = entitlements.get(orgId);
        const next = exists ? { ...exists, ...update } : { orgId, ...create };
        entitlements.set(orgId, next);
        return next;
      },
    },
  };
}

describe("Prisma adapter RBAC (mocked prisma)", () => {
  it("supports basic RBAC operations and last-owner protection", async () => {
    const prisma = makeFakePrisma();
    const a: any = prismaAdapter(prisma as any);

    const org = await a.createOrganization!({ name: "Acme" });
    const u1: ID = "u1";
    const u2: ID = "u2";

    const m1 = await a.addMember!({ userId: u1, orgId: org.id, role: "owner" });

    // Last owner cannot be removed
    await expect(a.removeMember!(m1.id)).rejects.toThrow("last_owner");

    // Add second owner, then update/remove
    const m2 = await a.addMember!({ userId: u2, orgId: org.id, role: "owner" });

    // Removing one of two owners should succeed
    await a.removeMember!(m2.id);

    // Downgrading the remaining (last) owner should now be prevented
    await expect(a.updateMember!(m1.id, { role: "member" })).rejects.toThrow(
      "last_owner"
    );

    // Invite & entitlement
    const inv = await a.createInvite!({
      orgId: org.id,
      email: "x@y.z",
      role: "member",
      tokenHash: "hash1",
      expiresAt: new Date(Date.now() + 60000),
    });
    const got = await a.getInviteByTokenHash!(org.id, "hash1");
    expect(got?.id).toBe(inv.id);
    await a.consumeInvite!(inv.id);

    await a.setEntitlements!(org.id, { plan: "pro", seats: 10 });
    const ent = await a.getEntitlements!(org.id);
    expect(ent?.plan).toBe("pro");
  });
});
