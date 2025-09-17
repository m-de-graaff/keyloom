// In-memory Drizzle-like DB harness for contract tests
// Supports a minimal subset used by the adapter implementation.
import type { Expr, Order, SQLToken } from './drizzle-mock'

function getColName(col: unknown): string | undefined {
  if (!col) return undefined
  const normalize = (s: string) => {
    const parts = s.split('.')
    const last = parts.length ? parts[parts.length - 1] : s
    return last.replace(/["`]/g, '')
  }
  const c = col as Record<string | symbol, unknown> & {
    name?: unknown
    columnName?: unknown
    _?: { name?: unknown }
  }
  if (typeof c.name === 'string') return normalize(c.name)
  if (typeof c.columnName === 'string') return normalize(c.columnName)
  const underscore = c._
  if (underscore && typeof underscore.name === 'string') return normalize(underscore.name)
  const symName =
    (c[Symbol.for('drizzle:name')] as unknown) ||
    (c[Symbol.for('drizzle:Name')] as unknown) ||
    (c[Symbol.for('drizzle:columnName')] as unknown)
  if (typeof symName === 'string') return normalize(symName)
  return undefined
}

function getValue(row: any, term: any): any {
  const name = getColName(term)
  if (!name) return term
  const colTable = (term && (term as any).table) || undefined
  // join-aware access
  if (row && row.__a && row.__b) {
    if (colTable && row.__refA === colTable) return row.__a[name]
    if (colTable && row.__refB === colTable) return row.__b[name]
    return row.__a[name] ?? row.__b[name]
  }
  return row?.[name]
}

function evalExpr(row: any, expr?: Expr): boolean {
  if (!expr) return true
  switch (expr.kind) {
    case 'eq': {
      const lv = getValue(row, expr.left)
      const rv = getValue(row, expr.right)
      if (lv !== undefined) return lv === rv
      // fallback: if column name resolution failed, try matching by value among fields
      const src = row && row.__a ? { ...(row.__a || {}), ...(row.__b || {}) } : row
      if (src && typeof src === 'object') {
        for (const v of Object.values(src)) {
          if (v === rv) return true
        }
      }
      return false
    }
    case 'lt':
      return getValue(row, expr.left) < getValue(row, expr.right)
    case 'and':
      return expr.exprs.every((e) => evalExpr(row, e))
    case 'isNull':
      return getValue(row, expr.col) == null
    case 'isNotNull':
      return getValue(row, expr.col) != null
    default:
      return true
  }
}

function byOrder(order?: Order) {
  if (!order) return undefined
  const dir = order.dir
  return (a: any, b: any) => {
    const av = getValue(a, order.col)
    const bv = getValue(b, order.col)
    if (av === bv) return 0
    const cmp = av < bv ? -1 : 1
    return dir === 'desc' ? -cmp : cmp
  }
}

function deepClone<T>(v: T): T {
  if (v instanceof Date) return new Date(v.getTime()) as any
  if (Array.isArray(v)) return v.map((x) => deepClone(x)) as any
  if (v && typeof v === 'object') {
    const out: any = {}
    for (const [k, val] of Object.entries(v as any)) out[k] = deepClone(val)
    return out
  }
  return v
}

function clone<T>(v: T): T {
  return deepClone(v)
}

function now() {
  return new Date()
}

export type Tables = ReturnType<typeof createTables>

function createTables() {
  return {
    users: [] as any[],
    accounts: [] as any[],
    sessions: [] as any[],
    verificationTokens: [] as any[],
    organizations: [] as any[],
    memberships: [] as any[],
    invites: [] as any[],
    entitlements: [] as any[],
    refreshTokens: [] as any[],
    auditLogs: [] as any[],
  }
}

function uniqueViolation(message = 'unique_violation') {
  const err: any = new Error(message)
  // keep pg-ish code for mapping utilities
  err.code = '23505'
  return err
}

function makeId(prefix: string, n: () => number) {
  return `${prefix}_${n()}`
}

export function createInMemoryDrizzle(schema?: any) {
  let id = 0
  const next = () => ++id

  let tables = createTables()
  const refMap = new WeakMap<any, any[]>()
  if (schema) {
    // Map actual schema table objects to our arrays
    if (schema.users) refMap.set(schema.users, tables.users)
    if (schema.accounts) refMap.set(schema.accounts, tables.accounts)
    if (schema.sessions) refMap.set(schema.sessions, tables.sessions)
    if (schema.verificationTokens) refMap.set(schema.verificationTokens, tables.verificationTokens)
    if (schema.auditEvents) refMap.set(schema.auditEvents, tables.auditLogs)
    if (schema.organizations) refMap.set(schema.organizations, tables.organizations)
    if (schema.memberships) refMap.set(schema.memberships, tables.memberships)
    if (schema.invites) refMap.set(schema.invites, tables.invites)
    if (schema.entitlements) refMap.set(schema.entitlements, tables.entitlements)
    if (schema.refreshTokens) refMap.set(schema.refreshTokens, tables.refreshTokens)
  }

  function tableByRef(ref: any) {
    const mapped = refMap.get(ref)
    if (mapped) return mapped
    // Fallbacks by known SQL table names
    const tname: string | undefined =
      (ref && (ref.name || (ref as any)?._.name || ref[Symbol.for('drizzle:name')])) || undefined
    switch (tname) {
      case 'User':
        return tables.users
      case 'Account':
        return tables.accounts
      case 'Session':
        return tables.sessions
      case 'VerificationToken':
        return tables.verificationTokens
      case 'Organization':
        return tables.organizations
      case 'Membership':
        return tables.memberships
      case 'Invite':
        return tables.invites
      case 'Entitlement':
        return tables.entitlements
      case 'RefreshToken':
        return tables.refreshTokens
      case 'AuditEvent':
        return tables.auditLogs
      default:
        throw new Error('Unknown table reference')
    }
  }

  function enforceUnique(tableName: keyof Tables, data: any) {
    const t = (tables as any)[tableName] as any[]
    switch (tableName) {
      case 'users':
        if (data.email && t.some((r) => r.email === data.email)) throw uniqueViolation()
        break
      case 'accounts':
        if (
          t.some(
            (r) => r.provider === data.provider && r.providerAccountId === data.providerAccountId,
          )
        )
          throw uniqueViolation()
        break
      case 'organizations':
        if (data.slug && t.some((r) => r.slug === data.slug)) throw uniqueViolation()
        break
      case 'memberships':
        if (t.some((r) => r.userId === data.userId && r.orgId === data.orgId))
          throw uniqueViolation()
        break
      case 'verificationTokens':
        if (t.some((r) => r.identifier === data.identifier && r.tokenHash === data.tokenHash))
          throw uniqueViolation()
        break
      case 'refreshTokens':
        if (t.some((r) => r.jti === data.jti || r.tokenHash === data.tokenHash))
          throw uniqueViolation()
        break
      default:
        break
    }
  }

  function apiFor(currentTables: Tables) {
    const api: any = {
      insert(tableRef: any) {
        const tbl = tableByRef(tableRef)
        let onConflict: { set?: any; target?: any } | undefined
        return {
          values(values: any | any[]) {
            const arr = Array.isArray(values) ? values : [values]
            const inserted: any[] = []
            for (const value of arr) {
              const row = { ...value }
              // reasonable defaults
              if (tbl === tables.users) row.id ||= makeId('user', next)
              if (tbl === tables.accounts) row.id ||= makeId('acc', next)
              if (tbl === tables.sessions) row.id ||= makeId('sess', next)
              if (tbl === tables.organizations) row.id ||= makeId('org', next)
              if (tbl === tables.memberships) row.id ||= makeId('mem', next)
              if (tbl === tables.invites) row.id ||= makeId('inv', next)
              if (tbl === tables.entitlements) row.id ||= makeId('ent', next)
              if (tbl === tables.verificationTokens) row.id ||= makeId('vt', next)
              row.createdAt ||= now()
              if (
                'updatedAt' in row ||
                tbl === tables.users ||
                tbl === tables.accounts ||
                tbl === tables.organizations ||
                tbl === tables.memberships ||
                tbl === tables.sessions
              )
                row.updatedAt = row.updatedAt || now()

              // onConflict upsert for entitlements (orgId unique in our contract)
              if (onConflict && tbl === tables.entitlements && onConflict.set) {
                const existing = currentTables.entitlements.find((e) => e.orgId === row.orgId)
                if (existing) {
                  Object.assign(existing, onConflict.set)
                  inserted.push(clone(existing))
                  continue
                }
              }

              // enforce uniques
              const tableName = Object.keys(currentTables).find(
                (k) => (currentTables as any)[k] === tbl,
              ) as keyof Tables
              enforceUnique(tableName, row)

              tbl.push(row)
              inserted.push(clone(row))
            }
            return {
              onConflictDoUpdate(_: any) {
                onConflict = _
                return this
              },
              returning() {
                return Promise.resolve(inserted.map(clone))
              },
            }
          },
        }
      },
      select(selection?: Record<string, any>) {
        let _from: any[] | null = null
        let _fromRef: any | null = null
        let _order: Order | undefined
        let _where: Expr | undefined
        let _joinTbl: any[] | null = null
        let _joinRef: any | null = null
        let _joinOn: Expr | undefined

        const run = () => {
          const baseRows = (_from ?? []) as any[]
          let rows: any[]

          if (_joinTbl) {
            const joined: any[] = []
            for (const a of baseRows) {
              for (const b of _joinTbl) {
                const pair = {
                  __a: a,
                  __b: b,
                  __refA: _fromRef,
                  __refB: _joinRef,
                }
                if (!_joinOn || evalExpr(pair, _joinOn)) joined.push(pair)
              }
            }
            rows = joined
          } else {
            rows = baseRows
          }

          // apply where after join
          if (_where) rows = rows.filter((r) => evalExpr(r, _where))

          // order
          const cmp = byOrder(_order)
          if (cmp) rows = [...rows].sort(cmp)

          // selection mapping
          if (selection && Object.keys(selection).length) {
            // handle count(*)
            const onlyCount = Object.values(selection).every((v) => (v as SQLToken)?.kind === 'sql')
            if (onlyCount) {
              return [{ count: rows.length }]
            }
            return rows.map((r) => {
              const out: any = {}
              for (const [k, v] of Object.entries(selection)) {
                const name = getColName(v)
                if (r && r.__a && r.__b && (v as any)?.table) {
                  const tbl = (v as any).table
                  if (tbl === r.__refA) out[k] = r.__a[name as string]
                  else if (tbl === r.__refB) out[k] = r.__b[name as string]
                  else out[k] = r.__a[name as string] ?? r.__b[name as string]
                } else {
                  out[k] = name
                    ? (r[name] ?? (r.__a ? (r.__a[name] ?? r.__b?.[name]) : undefined))
                    : undefined
                }
              }
              return out
            })
          }

          // no selection mapping: if join, merge shallow for consumer
          if (_joinTbl) {
            return rows.map((r) => ({ ...(r.__a || {}), ...(r.__b || {}) }))
          }

          return rows.map(clone)
        }

        const chain: any = {
          from(tableRef: any) {
            _from = tableByRef(tableRef)
            _fromRef = tableRef
            return chain
          },
          innerJoin(tableRef2: any, on: Expr) {
            _joinTbl = tableByRef(tableRef2)
            _joinRef = tableRef2
            _joinOn = on
            return chain
          },
          where(expr: Expr) {
            _where = expr
            return chain
          },
          orderBy(order: Order) {
            _order = order
            return chain
          },
          limit(n: number) {
            const res = run()
            return Promise.resolve(res.slice(0, n))
          },
          execute() {
            return Promise.resolve(run())
          },
          // biome-ignore lint/suspicious/noThenProperty: emulate Drizzle's thenable query builder so `await chain` works in tests
          then(resolve: (v: unknown) => void, reject?: (e: unknown) => void) {
            Promise.resolve(run()).then(
              resolve as (v: unknown) => void,
              reject as (e: unknown) => void,
            )
          },
        }
        return chain
      },
      update(tableRef: any) {
        const tbl = tableByRef(tableRef)
        let _where: Expr | undefined
        let _set: any = {}
        return {
          set(values: any) {
            _set = values
            return this
          },
          where(expr: Expr) {
            _where = expr
            const updated: any[] = []
            let count = 0
            for (const r of tbl) {
              if (evalExpr(r, _where)) {
                Object.assign(r, _set)
                if ('updatedAt' in r) {
                  const prev = r.updatedAt instanceof Date ? r.updatedAt.getTime() : undefined
                  const n = now().getTime()
                  const next = prev != null && n <= prev ? prev + 1 : n
                  r.updatedAt = new Date(next)
                }
                updated.push(clone(r))
                count++
              }
            }
            return {
              returning() {
                return Promise.resolve(updated)
              },
              get rowsAffected() {
                return count
              },
            }
          },
        }
      },
      delete(tableRef: any) {
        const tbl = tableByRef(tableRef)
        let _where: Expr | undefined
        const deleted: any[] = []
        return {
          where(expr: Expr) {
            _where = expr
            // delete matching
            for (let i = tbl.length - 1; i >= 0; i--) {
              const r = tbl[i]
              if (evalExpr(r, _where)) {
                deleted.push(clone(r))
                tbl.splice(i, 1)
              }
            }
            return {
              returning() {
                return Promise.resolve(deleted)
              },
              // non-returning variant used for rowsAffected
              get rowsAffected() {
                return deleted.length
              },
            }
          },
        }
      },
      transaction: async (fn: (tx: any) => any) => {
        // copy-on-write preserving Dates
        const snapshot: Tables = (globalThis as any).structuredClone
          ? (globalThis as any).structuredClone(tables)
          : (deepClone(tables) as Tables)
        const txApi = apiFor(snapshot)
        try {
          const res = await fn(txApi)
          tables = snapshot
          return res
        } catch (e) {
          // rollback (discard snapshot)
          return Promise.reject(e)
        }
      },
    }

    return api
  }

  return apiFor(tables)
}
