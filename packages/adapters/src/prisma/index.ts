import type {
  Account,
  Adapter,
  AuditEvent,
  ID,
  Session,
  User,
  VerificationToken,
} from "@keyloom/core";
// Keep types loose to avoid requiring generated Prisma client at build time
export type AnyPrismaClient = any;

// Minimal error mapping to keep nice messages without depending on Prisma types
function mapPrismaError(e: unknown) {
  const code = (e as { code?: string }).code;
  if (code === "P2002") {
    // unique constraint failed
    return new Error("Unique constraint failed");
  }
  return e;
}

// Trim leading and trailing hyphens without regex (avoids ReDoS concerns entirely)
function trimHyphens(input: string): string {
  let start = 0;
  let end = input.length - 1;
  // 45 is '-'
  while (start <= end && input.charCodeAt(start) === 45) start++;
  while (end >= start && input.charCodeAt(end) === 45) end--;
  return input.slice(start, end + 1);
}


export function prismaAdapter(prisma: AnyPrismaClient): Adapter & {
  // credentials extension:
  createCredential(userId: ID, hash: string): Promise<{ id: ID; userId: ID }>;
  getCredentialByUserId(
    userId: ID
  ): Promise<{ id: ID; userId: ID; hash: string } | null>;
  updateCredential(userId: ID, hash: string): Promise<void>;
  // RBAC extension (subset used by core)
  createOrganization?: (data: {
    name: string;
    slug?: string | null;
  }) => Promise<any>;
  getOrganization?: (id: ID) => Promise<any | null>;
  getOrganizationsByUser?: (userId: ID) => Promise<any[]>;
  addMember?: (data: { userId: ID; orgId: ID; role: string }) => Promise<any>;
  updateMember?: (
    id: ID,
    data: Partial<{ role: string; status: string }>
  ) => Promise<any>;
  removeMember?: (id: ID) => Promise<void>;
  getMembership?: (userId: ID, orgId: ID) => Promise<any | null>;
  listMembers?: (orgId: ID) => Promise<any[]>;
  createInvite?: (data: {
    orgId: ID;
    email: string;
    role: string;
    tokenHash: string;
    expiresAt: Date;
  }) => Promise<any>;
  getInviteByTokenHash?: (orgId: ID, tokenHash: string) => Promise<any | null>;
  consumeInvite?: (inviteId: ID) => Promise<void>;
  getEntitlements?: (orgId: ID) => Promise<any | null>;
  setEntitlements?: (orgId: ID, ent: any) => Promise<void>;
} {
  return {
    // Users
    async createUser(data: Partial<User>) {
      try {
        const u = await prisma.user.create({
          data: {
            email: (data as any).email ?? null,
            emailVerified: (data as any).emailVerified ?? null,
            name: (data as any).name ?? null,
            image: (data as any).image ?? null,
          },
        });
        return u as unknown as User;
      } catch (e) {
        throw mapPrismaError(e);
      }
    },
    async getUser(id: ID) {
      const u = await prisma.user.findUnique({ where: { id } });
      return (u as unknown as User | null) ?? null;
    },
    async getUserByEmail(email: string) {
      const u = await prisma.user.findUnique({ where: { email } });
      return (u as unknown as User | null) ?? null;
    },
    async updateUser(id: ID, data: Partial<User>) {
      try {
        const updateData: any = {};
        if (typeof (data as any).email !== "undefined")
          updateData.email = (data as any).email;
        if (typeof (data as any).emailVerified !== "undefined")
          updateData.emailVerified = (data as any).emailVerified;
        if (typeof (data as any).name !== "undefined")
          updateData.name = (data as any).name;
        if (typeof (data as any).image !== "undefined")
          updateData.image = (data as any).image;

        const u = await prisma.user.update({
          where: { id },
          data: updateData,
        });
        return u as unknown as User;
      } catch (e) {
        throw mapPrismaError(e);
      }
    },

    // Accounts
    async linkAccount(acc: Account) {
      try {
        const a = await prisma.account.create({
          data: {
            userId: acc.userId,
            provider: acc.provider,
            providerAccountId: acc.providerAccountId,
            accessToken: (acc as any).accessToken ?? null,
            refreshToken: (acc as any).refreshToken ?? null,
            tokenType: (acc as any).tokenType ?? null,
            scope: (acc as any).scope ?? null,
            expiresAt: (acc as any).expiresAt ?? null,
          },
        });
        return a as unknown as Account;
      } catch (e) {
        throw mapPrismaError(e);
      }
    },
    async getAccountByProvider(provider: string, providerAccountId: string) {
      const a = await prisma.account.findUnique({
        where: { provider_providerAccountId: { provider, providerAccountId } },
      });
      return (a as unknown as Account | null) ?? null;
    },

    // Sessions
    async createSession(s: Omit<Session, "id" | "createdAt" | "updatedAt">) {
      const sess = await prisma.session.create({
        data: {
          userId: s.userId,
          expiresAt: (s as any).expiresAt,
        },
      });
      return sess as unknown as Session;
    },
    async getSession(id: ID) {
      const sess = await prisma.session.findUnique({ where: { id } });
      return (sess as unknown as Session | null) ?? null;
    },
    async deleteSession(id: ID) {
      await prisma.session.delete({ where: { id } }).catch(() => {});
    },

    // Tokens
    async createVerificationToken(
      v: Omit<VerificationToken, "id" | "createdAt" | "consumedAt">
    ) {
      const vt = await prisma.verificationToken.create({
        data: {
          identifier: v.identifier,
          tokenHash: (v as any).tokenHash ?? (v as any).token,
          expiresAt: v.expiresAt,
        },
      });
      return {
        id: vt.id as ID,
        identifier: vt.identifier,
        token: (v as any).token ?? "***",
        expiresAt: vt.expiresAt,
        createdAt: vt.createdAt,
        consumedAt: vt.consumedAt ?? null,
      } as unknown as VerificationToken;
    },
    async useVerificationToken(identifier: string, tokenHashOrToken: string) {
      const vt = await prisma.verificationToken.findUnique({
        where: {
          identifier_tokenHash: { identifier, tokenHash: tokenHashOrToken },
        },
      });
      if (!vt) return null;
      await prisma.verificationToken.delete({
        where: {
          identifier_tokenHash: { identifier, tokenHash: tokenHashOrToken },
        },
      });
      return {
        id: vt.id as ID,
        identifier: vt.identifier,
        token: "***",
        expiresAt: vt.expiresAt,
        createdAt: vt.createdAt,
        consumedAt: vt.consumedAt ?? null,
      } as unknown as VerificationToken;
    },

    // Audit
    async appendAudit(event: AuditEvent) {
      await prisma.auditLog.create({
        data: {
          type: event.type,
          userId: event.userId ?? null,
          actorId: (event as any).actorId ?? null,
          ip: (event as any).ip ?? null,
          ua: (event as any).ua ?? null,
          at: event.at ?? new Date(),
          meta: (event.meta as unknown) ?? null,
        },
      });
    },

    // RBAC (best-effort implementation; requires corresponding Prisma schema)
    async createOrganization(data: { name: string; slug?: string | null }) {
      // Basic validation/sanitization
      const name = String(data.name ?? "").trim();
      if (!name || name.length > 128) throw new Error("invalid_name");
      let slug = data.slug ?? null;
      if (slug != null) {
        // Sanitize slug defensively: length bound first, normalize, collapse, trim (no regex trimming)
        slug = String(slug).toLowerCase();
        if (slug.length > 512) slug = slug.slice(0, 512);
        // Replace non slug-safe chars with hyphens and collapse runs
        slug = slug.replace(/[^a-z0-9-]+/g, "-");
        // Trim leading and trailing hyphens without regex to avoid any ReDoS risk
        slug = trimHyphens(slug);
        if (!slug || slug.length > 64) throw new Error("invalid_slug");
      }
      const org = await prisma.organization.create({
        data: { name, slug },
      });
      // Best-effort audit log
      try {
        await prisma.auditLog.create({
          data: {
            type: "org.created",
            userId: null,
            actorId: null,
            meta: { orgId: org.id },
          },
        });
      } catch {}
      return org;
    },
    async getOrganization(id: ID) {
      const org = await prisma.organization.findUnique({ where: { id } });
      return org ?? null;
    },
    async getOrganizationsByUser(userId: ID) {
      const memberships = await prisma.membership.findMany({
        where: { userId, status: "active" },
        select: { orgId: true },
      });
      const orgIds = Array.from(new Set(memberships.map((m: any) => m.orgId)));
      if (orgIds.length === 0) return [];
      const orgs = await prisma.organization.findMany({
        where: { id: { in: orgIds } },
      });
      return orgs;
    },
    async addMember(data: { userId: ID; orgId: ID; role: string }) {
      const existing = await prisma.membership
        .findUnique({
          where: { userId_orgId: { userId: data.userId, orgId: data.orgId } },
        })
        .catch(() => null);
      if (existing) return existing;
      const m = await prisma.membership.create({
        data: {
          userId: data.userId,
          orgId: data.orgId,
          role: String(data.role ?? "member").trim(),
          status: "active",
        },
      });
      try {
        await prisma.auditLog.create({
          data: {
            type: "org.member.added",
            userId: m.userId,
            actorId: null,
            meta: { orgId: m.orgId, role: m.role },
          },
        });
      } catch {}
      return m;
    },
    async updateMember(
      id: ID,
      data: Partial<{ role: string; status: string }>
    ) {
      const prev = await prisma.membership.findUnique({ where: { id } });
      if (!prev) throw new Error("membership_not_found");
      if (
        prev.role === "owner" &&
        typeof data.role !== "undefined" &&
        data.role !== "owner"
      ) {
        const ownerCount = await prisma.membership.count({
          where: { orgId: prev.orgId, role: "owner", status: "active" },
        });
        if (ownerCount <= 1) throw new Error("last_owner");
      }
      const updateData: any = { ...data };
      if (typeof updateData.role !== "undefined")
        updateData.role = String(updateData.role).trim();
      const m = await prisma.membership.update({
        where: { id },
        data: updateData,
      });
      try {
        await prisma.auditLog.create({
          data: {
            type: "org.member.updated",
            userId: m.userId,
            actorId: null,
            meta: { orgId: m.orgId, changes: data },
          },
        });
      } catch {}
      return m;
    },
    async removeMember(id: ID) {
      const prev = await prisma.membership.findUnique({ where: { id } });
      if (!prev) return;
      if (prev.role === "owner") {
        const ownerCount = await prisma.membership.count({
          where: { orgId: prev.orgId, role: "owner", status: "active" },
        });
        if (ownerCount <= 1) throw new Error("last_owner");
      }
      await prisma.membership.delete({ where: { id } });
      try {
        await prisma.auditLog.create({
          data: {
            type: "org.member.removed",
            userId: prev.userId,
            actorId: null,
            meta: { orgId: prev.orgId, role: prev.role },
          },
        });
      } catch {}
    },
    async getMembership(userId: ID, orgId: ID) {
      const m = await prisma.membership.findUnique({
        where: { userId_orgId: { userId, orgId } },
      });
      return m ?? null;
    },
    async listMembers(orgId: ID) {
      const members = await prisma.membership.findMany({ where: { orgId } });
      // Best-effort: add userEmail if join available; otherwise null
      return members.map((m: any) => ({
        ...m,
        userEmail: (m as any).user?.email ?? null,
      }));
    },
    async createInvite(data: {
      orgId: ID;
      email: string;
      role: string;
      tokenHash: string;
      expiresAt: Date;
    }) {
      const inv = await prisma.invite.create({
        data: {
          orgId: data.orgId,
          email: String(data.email).trim().toLowerCase(),
          role: String(data.role ?? "member").trim(),
          tokenHash: data.tokenHash,
          expiresAt: data.expiresAt,
        },
      });
      try {
        await prisma.auditLog.create({
          data: {
            type: "org.invite.created",
            userId: null,
            actorId: null,
            meta: { orgId: inv.orgId, email: inv.email, role: inv.role },
          },
        });
      } catch {}
      return inv;
    },
    async getInviteByTokenHash(orgId: ID, tokenHash: string) {
      const inv = await prisma.invite.findFirst({
        where: { orgId, tokenHash },
      });
      return inv ?? null;
    },
    async consumeInvite(inviteId: ID) {
      const inv = await prisma.invite
        .update({ where: { id: inviteId }, data: { acceptedAt: new Date() } })
        .catch(() => null);
      try {
        if (inv) {
          await prisma.auditLog.create({
            data: {
              type: "org.invite.accepted",
              userId: null,
              actorId: null,
              meta: { orgId: inv.orgId, email: inv.email },
            },
          });
        }
      } catch {}
    },
    async getEntitlements(orgId: ID) {
      const ent = await prisma.entitlement
        .findUnique({ where: { orgId } })
        .catch(() => null);
      return ent ?? null;
    },
    async setEntitlements(orgId: ID, ent: any) {
      await prisma.entitlement.upsert({
        where: { orgId },
        update: { ...ent },
        create: { orgId, ...ent },
      });
    },

    // Credentials extension
    async createCredential(userId: ID, hash: string) {
      const c = await prisma.credential.create({ data: { userId, hash } });
      return { id: c.id as ID, userId: c.userId as ID };
    },
    async getCredentialByUserId(userId: ID) {
      const c = await prisma.credential.findUnique({ where: { userId } });
      return c
        ? { id: c.id as ID, userId: c.userId as ID, hash: c.hash }
        : null;
    },
    async updateCredential(userId: ID, hash: string) {
      await prisma.credential.update({ where: { userId }, data: { hash } });
    },
  };
}

export { prismaAdapter as PrismaAdapter };
