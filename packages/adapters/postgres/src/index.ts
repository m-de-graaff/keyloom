import type { Adapter } from "@keyloom/core";
import type {
  AdapterCapabilities,
  KeyloomAdapter,
} from "@keyloom/core/adapter-types";
import { normalizeEmail } from "@keyloom/core/adapter-types";
import { tokenHash } from "@keyloom/core";

/**
 * Lightweight PostgreSQL adapter that relies on an injected client with a `query(sql, params)` API.
 * No driver dependency is declared; pass your pg.Pool or a compatible wrapper at runtime.
 */
export interface PgClientLike {
  query: (
    sql: string,
    params?: unknown[]
  ) => Promise<{ rows: any[]; rowCount?: number }>;
}

export interface PostgresAdapterConfig {
  schema?: string;
  tablePrefix?: string;
  authSecret?: string;
}

function tbl(name: string, cfg?: PostgresAdapterConfig) {
  const base = cfg?.tablePrefix ? `${cfg.tablePrefix}_${name}` : name;
  return cfg?.schema ? `${cfg.schema}."${base}"` : `"${base}"`;
}

function caps(): AdapterCapabilities {
  return {
    transactions: true,
    json: true,
    ttlIndex: false,
    caseInsensitiveEmail: "citext",
    upsert: true,
    maxIdentifierLength: 63,
  };
}

export default function postgresAdapter(
  client: PgClientLike,
  cfg?: PostgresAdapterConfig
): KeyloomAdapter {
  const secret = cfg?.authSecret ?? process.env.AUTH_SECRET ?? "dev-secret";

  const base: Adapter = {
    // Users
    async createUser(data) {
      const email = data.email ? normalizeEmail(data.email) : null;
      const sql = `insert into ${tbl(
        "User",
        cfg
      )} (id, email, "emailVerified", name, image, "createdAt", "updatedAt")
                   values (gen_random_uuid()::text, $1, $2, $3, $4, now(), now())
                   returning *`;
      const r = await client.query(sql, [
        email,
        data.emailVerified ?? null,
        data.name ?? null,
        data.image ?? null,
      ]);
      return r.rows[0];
    },
    async getUser(id) {
      const r = await client.query(
        `select * from ${tbl("User", cfg)} where id=$1 limit 1`,
        [id]
      );
      return r.rows[0] ?? null;
    },
    async getUserByEmail(email) {
      const r = await client.query(
        `select * from ${tbl("User", cfg)} where email=$1 limit 1`,
        [normalizeEmail(email)]
      );
      return r.rows[0] ?? null;
    },
    async updateUser(id, data) {
      const fields: string[] = [];
      const values: any[] = [];
      let i = 1;
      if (data.email !== undefined) {
        fields.push(`email=$${i++}`);
        values.push(data.email ? normalizeEmail(data.email) : null);
      }
      if (data.emailVerified !== undefined) {
        fields.push(`"emailVerified"=$${i++}`);
        values.push(data.emailVerified);
      }
      if (data.name !== undefined) {
        fields.push(`name=$${i++}`);
        values.push(data.name);
      }
      if (data.image !== undefined) {
        fields.push(`image=$${i++}`);
        values.push(data.image);
      }
      fields.push(`"updatedAt"=now()`);
      const sql = `update ${tbl("User", cfg)} set ${fields.join(
        ", "
      )} where id=$${i} returning *`;
      const r = await client.query(sql, [...values, id]);
      return r.rows[0];
    },

    // Accounts (OAuth)
    async linkAccount(acc) {
      const sql = `insert into ${tbl(
        "Account",
        cfg
      )} (id, "userId", provider, "providerAccountId", access_token, refresh_token, token_type, scope, expires_at, id_token, session_state, "createdAt", "updatedAt")
                   values (gen_random_uuid()::text, $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, now(), now()) returning *`;
      const r = await client.query(sql, [
        acc.userId,
        acc.provider,
        acc.providerAccountId,
        (acc as any).accessToken ?? null,
        (acc as any).refreshToken ?? null,
        (acc as any).tokenType ?? null,
        (acc as any).scope ?? null,
        (acc as any).expiresAt ?? null,
        (acc as any).idToken ?? null,
        (acc as any).sessionState ?? null,
      ]);
      return r.rows[0];
    },
    async getAccountByProvider(provider, providerAccountId) {
      const r = await client.query(
        `select * from ${tbl(
          "Account",
          cfg
        )} where provider=$1 and "providerAccountId"=$2 limit 1`,
        [provider, providerAccountId]
      );
      return r.rows[0] ?? null;
    },

    // Sessions
    async createSession(s) {
      const sql = `insert into ${tbl(
        "Session",
        cfg
      )} (id, "userId", "expiresAt", "createdAt")
                   values (gen_random_uuid()::text, $1, $2, now()) returning *`;
      const r = await client.query(sql, [s.userId, s.expiresAt]);
      return r.rows[0];
    },
    async getSession(id) {
      const r = await client.query(
        `select * from ${tbl("Session", cfg)} where id=$1 limit 1`,
        [id]
      );
      return r.rows[0] ?? null;
    },
    async deleteSession(id) {
      await client.query(`delete from ${tbl("Session", cfg)} where id=$1`, [
        id,
      ]);
    },

    // Verification tokens (store hash at rest)
    async createVerificationToken(v) {
      const hash = await tokenHash(v.token, secret);
      const sql = `insert into ${tbl(
        "VerificationToken",
        cfg
      )} (identifier, "tokenHash", "expiresAt", "createdAt")
                   values ($1, $2, $3, now()) returning identifier, "expiresAt", "createdAt"`;
      const r = await client.query(sql, [v.identifier, hash, v.expiresAt]);
      const row = r.rows[0];
      return {
        id: `${row.identifier}:${hash}`,
        identifier: row.identifier,
        token: v.token,
        expiresAt: row.expiresAt,
        createdAt: row.createdAt,
        consumedAt: null,
      } as any;
    },
    async useVerificationToken(identifier, token) {
      const hash = await tokenHash(token, secret);
      const del = await client.query(
        `delete from ${tbl(
          "VerificationToken",
          cfg
        )} where identifier=$1 and "tokenHash"=$2 returning identifier, "expiresAt", "createdAt"`,
        [identifier, hash]
      );
      const row = del.rows[0];
      if (!row) return null;
      return {
        id: `${row.identifier}:${hash}`,
        identifier: row.identifier,
        token,
        expiresAt: row.expiresAt,
        createdAt: row.createdAt,
        consumedAt: null,
      } as any;
    },

    // Audit
    async appendAudit(event) {
      const sql = `insert into ${tbl(
        "AuditEvent",
        cfg
      )} (id, type, "userId", ip, "userAgent", timestamp, metadata)
                   values (gen_random_uuid()::text, $1, $2, $3, $4, $5, $6)`;
      await client.query(sql, [
        event.type,
        event.userId ?? null,
        (event as any).ip ?? null,
        (event as any).ua ?? null,
        event.at ?? new Date(),
        (event as any).meta ?? null,
      ]);
    },
  };

  const rbac = {
    async createOrganization() {
      throw new Error("RBAC not configured for raw postgres adapter");
    },
    async getOrganization() {
      return null;
    },
    async getOrganizationsByUser() {
      return [];
    },
    async addMember() {
      throw new Error("RBAC not configured for raw postgres adapter");
    },
    async updateMember() {
      throw new Error("RBAC not configured for raw postgres adapter");
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
      throw new Error("RBAC not configured for raw postgres adapter");
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
      throw new Error("Refresh tokens not configured for raw postgres adapter");
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
        await client.query(`select 1 as ok`);
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
