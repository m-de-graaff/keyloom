import type { Adapter } from "@keyloom/core";
import type {
  AdapterCapabilities,
  KeyloomAdapter,
} from "@keyloom/core/adapter-types";
import { normalizeEmail } from "@keyloom/core/adapter-types";
import { tokenHash } from "@keyloom/core";
import { randomUUID } from "node:crypto";

export interface CollectionLike {
  findOne: (filter: any) => Promise<any | null>;
  insertOne: (doc: any) => Promise<any>;
  updateOne: (filter: any, update: any) => Promise<any>;
  deleteOne: (filter: any) => Promise<any>;
}
export interface DbLike {
  collection: (name: string) => CollectionLike;
}

export interface MongoAdapterConfig {
  collectionPrefix?: string;
  authSecret?: string;
}

function coll(name: string, cfg?: MongoAdapterConfig) {
  return cfg?.collectionPrefix ? `${cfg.collectionPrefix}_${name}` : name;
}

function caps(): AdapterCapabilities {
  return {
    transactions: false,
    json: true,
    ttlIndex: true,
    caseInsensitiveEmail: false,
    upsert: true,
    maxIdentifierLength: 255,
  };
}

export default function mongoAdapter(
  db: DbLike,
  cfg?: MongoAdapterConfig
): KeyloomAdapter {
  const secret = cfg?.authSecret ?? process.env.AUTH_SECRET ?? "dev-secret";

  const Users = () => db.collection(coll("User", cfg));
  const Accounts = () => db.collection(coll("Account", cfg));
  const Sessions = () => db.collection(coll("Session", cfg));
  const Tokens = () => db.collection(coll("VerificationToken", cfg));
  const Audit = () => db.collection(coll("AuditEvent", cfg));

  const base: Adapter = {
    async createUser(data) {
      const doc = {
        id: randomUUID(),
        email: data.email ? normalizeEmail(data.email) : null,
        emailVerified: data.emailVerified ?? null,
        name: data.name ?? null,
        image: data.image ?? null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      await Users().insertOne(doc);
      return doc as any;
    },
    async getUser(id) {
      return (await Users().findOne({ id })) ?? null;
    },
    async getUserByEmail(email) {
      return (await Users().findOne({ email: normalizeEmail(email) })) ?? null;
    },
    async updateUser(id, data) {
      const $set: any = { updatedAt: new Date() };
      if (data.email !== undefined)
        $set.email = data.email ? normalizeEmail(data.email) : null;
      if (data.emailVerified !== undefined)
        $set.emailVerified = data.emailVerified;
      if (data.name !== undefined) $set.name = data.name;
      if (data.image !== undefined) $set.image = data.image;
      await Users().updateOne({ id }, { $set });
      return (await Users().findOne({ id })) as any;
    },

    async linkAccount(acc) {
      const doc = { ...acc, id: randomUUID() };
      await Accounts().insertOne(doc);
      return doc as any;
    },
    async getAccountByProvider(provider, providerAccountId) {
      return (
        (await Accounts().findOne({ provider, providerAccountId })) ?? null
      );
    },

    async createSession(s) {
      const doc = {
        id: randomUUID(),
        userId: s.userId,
        expiresAt: s.expiresAt,
        createdAt: new Date(),
      };
      await Sessions().insertOne(doc);
      return doc as any;
    },
    async getSession(id) {
      return (await Sessions().findOne({ id })) ?? null;
    },
    async deleteSession(id) {
      await Sessions().deleteOne({ id });
    },

    async createVerificationToken(v) {
      const hash = await tokenHash(v.token, secret);
      const doc = {
        identifier: v.identifier,
        tokenHash: hash,
        expiresAt: v.expiresAt,
        createdAt: new Date(),
      };
      await Tokens().insertOne(doc);
      return {
        id: `${v.identifier}:${hash}`,
        identifier: v.identifier,
        token: v.token,
        expiresAt: v.expiresAt,
        createdAt: doc.createdAt,
        consumedAt: null,
      } as any;
    },
    async useVerificationToken(identifier, token) {
      const hash = await tokenHash(token, secret);
      const vt = await Tokens().findOne({ identifier, tokenHash: hash });
      if (!vt) return null;
      await Tokens().deleteOne({ identifier, tokenHash: hash });
      return {
        id: `${identifier}:${hash}`,
        identifier,
        token,
        expiresAt: vt.expiresAt,
        createdAt: vt.createdAt,
        consumedAt: null,
      } as any;
    },

    async appendAudit(event) {
      const doc = {
        id: randomUUID(),
        type: event.type,
        userId: event.userId ?? null,
        ip: (event as any).ip ?? null,
        userAgent: (event as any).ua ?? null,
        timestamp: event.at ?? new Date(),
        metadata: (event as any).meta ?? null,
      };
      await Audit().insertOne(doc);
    },
  };

  const rbac = {
    async createOrganization() {
      throw new Error("RBAC not configured for raw mongo adapter");
    },
    async getOrganization() {
      return null;
    },
    async getOrganizationsByUser() {
      return [];
    },
    async addMember() {
      throw new Error("RBAC not configured for raw mongo adapter");
    },
    async updateMember() {
      throw new Error("RBAC not configured for raw mongo adapter");
    },
    async removeMember() {
      /* noop */
    },
    async getMembership() {
      return null;
    },
    async listMembers() {
      return [];
    },
    async createInvite() {
      throw new Error("RBAC not configured for raw mongo adapter");
    },
    async getInviteByTokenHash() {
      return null;
    },
    async consumeInvite() {
      /* noop */
    },
    async getEntitlements() {
      return null;
    },
    async setEntitlements() {
      /* noop */
    },
  };

  const refreshStore = {
    async save() {
      throw new Error("Refresh tokens not configured for raw mongo adapter");
    },
    async findByHash() {
      return null;
    },
    async markRotated() {
      /* noop */
    },
    async revokeFamily() {
      /* noop */
    },
    async createChild() {
      /* noop */
    },
    async cleanupExpired() {
      return 0;
    },
    async isFamilyRevoked() {
      return false;
    },
    async getFamily() {
      return [];
    },
  };

  return Object.assign(base, rbac, refreshStore, {
    capabilities: caps(),
    async healthCheck() {
      try {
        await Users().findOne({});
        return { status: "healthy" as const };
      } catch (e: any) {
        return {
          status: "unhealthy" as const,
          details: { error: String(e?.message ?? e) },
        };
      }
    },
  });
}
