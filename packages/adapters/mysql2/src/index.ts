import type { Adapter } from "@keyloom/core";
import type {
  AdapterCapabilities,
  KeyloomAdapter,
} from "@keyloom/core/adapter-types";
import { normalizeEmail } from "@keyloom/core/adapter-types";
import { tokenHash } from "@keyloom/core";

export interface MySql2Like {
  // Should behave like mysql2/promise connection or pool
  query: (sql: string, params?: unknown[]) => Promise<any>;
}

export interface MySQLAdapterConfig {
  database?: string;
  tablePrefix?: string;
  authSecret?: string;
}

function tbl(name: string, cfg?: MySQLAdapterConfig) {
  const base = cfg?.tablePrefix ? `${cfg.tablePrefix}_${name}` : name;
  return cfg?.database ? `\`${cfg.database}\`.\`${base}\`` : `\`${base}\``;
}

function caps(): AdapterCapabilities {
  return {
    transactions: true,
    json: true,
    ttlIndex: false,
    caseInsensitiveEmail: false,
    upsert: true,
    maxIdentifierLength: 64,
  };
}

async function rows(res: any): Promise<any[]> {
  // mysql2 returns [rows, fields]
  if (Array.isArray(res) && Array.isArray(res[0])) return res[0];
  if (res?.rows) return res.rows;
  return res;
}

export default function mysql2Adapter(
  client: MySql2Like,
  cfg?: MySQLAdapterConfig
): KeyloomAdapter {
  const secret = cfg?.authSecret ?? process.env.AUTH_SECRET ?? "dev-secret";

  const base: Adapter = {
    async createUser(data) {
      const email = data.email ? normalizeEmail(data.email) : null;
      const sql = `insert into ${tbl(
        "User",
        cfg
      )} (id, email, emailVerified, name, image, createdAt, updatedAt)
                   values (UUID(), ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`;
      await client.query(sql, [
        email,
        data.emailVerified ?? null,
        data.name ?? null,
        data.image ?? null,
      ]);
      const [u] = await rows(
        await client.query(
          `select * from ${tbl("User", cfg)} where email=? limit 1`,
          [email]
        )
      );
      return u;
    },
    async getUser(id) {
      const r = await rows(
        await client.query(
          `select * from ${tbl("User", cfg)} where id=? limit 1`,
          [id]
        )
      );
      return r[0] ?? null;
    },
    async getUserByEmail(email) {
      const r = await rows(
        await client.query(
          `select * from ${tbl("User", cfg)} where email=? limit 1`,
          [normalizeEmail(email)]
        )
      );
      return r[0] ?? null;
    },
    async updateUser(id, data) {
      const fields: string[] = [];
      const values: any[] = [];
      if (data.email !== undefined) {
        fields.push("email=?");
        values.push(data.email ? normalizeEmail(data.email) : null);
      }
      if (data.emailVerified !== undefined) {
        fields.push("emailVerified=?");
        values.push(data.emailVerified);
      }
      if (data.name !== undefined) {
        fields.push("name=?");
        values.push(data.name);
      }
      if (data.image !== undefined) {
        fields.push("image=?");
        values.push(data.image);
      }
      fields.push("updatedAt=CURRENT_TIMESTAMP");
      await client.query(
        `update ${tbl("User", cfg)} set ${fields.join(", ")} where id=?`,
        [...values, id]
      );
      const r = await rows(
        await client.query(
          `select * from ${tbl("User", cfg)} where id=? limit 1`,
          [id]
        )
      );
      return r[0];
    },

    async linkAccount(acc) {
      const sql = `insert into ${tbl(
        "Account",
        cfg
      )} (id, userId, provider, providerAccountId, access_token, refresh_token, token_type, scope, expires_at, id_token, session_state, createdAt, updatedAt)
                   values (UUID(), ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`;
      await client.query(sql, [
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
      const r = await rows(
        await client.query(
          `select * from ${tbl(
            "Account",
            cfg
          )} where provider=? and providerAccountId=? limit 1`,
          [acc.provider, acc.providerAccountId]
        )
      );
      return r[0];
    },
    async getAccountByProvider(provider, providerAccountId) {
      const r = await rows(
        await client.query(
          `select * from ${tbl(
            "Account",
            cfg
          )} where provider=? and providerAccountId=? limit 1`,
          [provider, providerAccountId]
        )
      );
      return r[0] ?? null;
    },

    async createSession(s) {
      const sql = `insert into ${tbl(
        "Session",
        cfg
      )} (id, userId, expiresAt, createdAt) values (UUID(), ?, ?, CURRENT_TIMESTAMP)`;
      await client.query(sql, [s.userId, s.expiresAt]);
      const r = await rows(
        await client.query(
          `select * from ${tbl(
            "Session",
            cfg
          )} where userId=? order by createdAt desc limit 1`,
          [s.userId]
        )
      );
      return r[0];
    },
    async getSession(id) {
      const r = await rows(
        await client.query(
          `select * from ${tbl("Session", cfg)} where id=? limit 1`,
          [id]
        )
      );
      return r[0] ?? null;
    },
    async deleteSession(id) {
      await client.query(`delete from ${tbl("Session", cfg)} where id=?`, [id]);
    },

    async createVerificationToken(v) {
      const hash = await tokenHash(v.token, secret);
      const sql = `insert into ${tbl(
        "VerificationToken",
        cfg
      )} (identifier, tokenHash, expiresAt, createdAt) values (?, ?, ?, CURRENT_TIMESTAMP)`;
      await client.query(sql, [v.identifier, hash, v.expiresAt]);
      return {
        id: `${v.identifier}:${hash}`,
        identifier: v.identifier,
        token: v.token,
        expiresAt: v.expiresAt,
        createdAt: new Date(),
        consumedAt: null,
      } as any;
    },
    async useVerificationToken(identifier, token) {
      const hash = await tokenHash(token, secret);
      const r = await rows(
        await client.query(
          `select * from ${tbl(
            "VerificationToken",
            cfg
          )} where identifier=? and tokenHash=? limit 1`,
          [identifier, hash]
        )
      );
      if (!r[0]) return null;
      await client.query(
        `delete from ${tbl(
          "VerificationToken",
          cfg
        )} where identifier=? and tokenHash=?`,
        [identifier, hash]
      );
      const row = r[0];
      return {
        id: `${identifier}:${hash}`,
        identifier,
        token,
        expiresAt: row.expiresAt,
        createdAt: row.createdAt,
        consumedAt: null,
      } as any;
    },

    async appendAudit(event) {
      const sql = `insert into ${tbl(
        "AuditEvent",
        cfg
      )} (id, type, userId, ip, userAgent, timestamp, metadata) values (UUID(), ?, ?, ?, ?, ?, ?)`;
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
      throw new Error("RBAC not configured for raw mysql adapter");
    },
    async getOrganization() {
      return null;
    },
    async getOrganizationsByUser() {
      return [];
    },
    async addMember() {
      throw new Error("RBAC not configured for raw mysql adapter");
    },
    async updateMember() {
      throw new Error("RBAC not configured for raw mysql adapter");
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
      throw new Error("RBAC not configured for raw mysql adapter");
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
      throw new Error("Refresh tokens not configured for raw mysql adapter");
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
        await client.query("select 1");
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
