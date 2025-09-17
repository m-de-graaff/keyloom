import { describe, expect, it } from 'vitest'

import {
  AdapterError,
  AdapterRegistry,
  BaseErrorMapper,
  getTableName,
  normalizeEmail,
  prepareEmailForQuery,
  createTimestamp,
  generateId,
} from '../src/adapter-types'

describe('adapter type utilities', () => {
  it('normalizes and trims email addresses', () => {
    expect(normalizeEmail(' Foo@Example.COM  ')).toBe('foo@example.com')
  })

  it('creates table names with optional prefixes', () => {
    expect(getTableName('users')).toBe('users')
    expect(getTableName('users', 'keyloom')).toBe('keyloom_users')
  })

  it('prepares email queries based on capability', () => {
    expect(prepareEmailForQuery('MiXeD@Example.com', 'citext')).toBe('MiXeD@Example.com')
    expect(prepareEmailForQuery('MiXeD@Example.com', 'collation')).toBe('MiXeD@Example.com')
    expect(prepareEmailForQuery('MiXeD@Example.com', 'app-normalize')).toBe('mixed@example.com')
  })

  it('exposes consistent adapter errors', () => {
    const err = new AdapterError('ADAPTER_NOT_FOUND', 'missing', { foo: 'bar' })
    expect(err).toBeInstanceOf(Error)
    expect(err.name).toBe('AdapterError')
    expect(err.code).toBe('ADAPTER_NOT_FOUND')
    expect(err.message).toBe('missing')
    expect(err.originalError).toEqual({ foo: 'bar' })
  })

  it('provides helper constructors on BaseErrorMapper', () => {
    class MyMapper extends BaseErrorMapper {
      mapError() {
        return null
      }

      unique(message?: string) {
        return this.createUniqueViolationError(new Error('dup'), message)
      }

      notFound(message?: string) {
        return this.createNotFoundError(new Error('missing'), message)
      }

      txn(message?: string) {
        return this.createTransactionError(new Error('txn'), message)
      }

      connection(message?: string) {
        return this.createConnectionError(new Error('conn'), message)
      }
    }

    const mapper = new MyMapper()
    expect(mapper.unique().code).toBe('ADAPTER_UNIQUE_VIOLATION')
    expect(mapper.notFound().code).toBe('ADAPTER_NOT_FOUND')
    expect(mapper.txn().code).toBe('ADAPTER_TXN_FAILED')
    expect(mapper.connection().code).toBe('ADAPTER_CONNECTION_FAILED')
    expect(mapper.unique('custom').message).toBe('custom')
  })

  it('registers adapters and returns metadata', () => {
    const name = `adapter-${crypto.randomUUID()}`
    const metadata = {
      name,
      version: '1.0.0',
      description: 'test adapter',
      capabilities: {
        transactions: true,
        json: true,
        ttlIndex: false,
        caseInsensitiveEmail: 'citext',
        upsert: true,
      },
    }

    const factory = () => ({ capabilities: metadata.capabilities }) as any

    AdapterRegistry.register(name, factory, metadata)

    expect(AdapterRegistry.get(name)).toBe(factory)
    expect(AdapterRegistry.getMetadata(name)).toEqual(metadata)
    expect(AdapterRegistry.list()).toContain(name)
    expect(AdapterRegistry.listWithMetadata()).toContainEqual({ name, metadata })
  })

  it('creates timestamps and ids using helpers', () => {
    const before = Date.now()
    const ts = createTimestamp()
    const after = Date.now()

    expect(ts.getTime()).toBeGreaterThanOrEqual(before)
    expect(ts.getTime()).toBeLessThanOrEqual(after + 1)

    const ids = new Set(Array.from({ length: 10 }, () => generateId()))
    expect(ids.size).toBe(10)
    for (const id of ids) {
      expect(typeof id).toBe('string')
      expect(id.length).toBeGreaterThan(0)
    }
  })
})
