import type { Adapter } from './adapter'
import type { RbacAdapter } from './rbac'
import type { RefreshTokenStore } from './jwt'

/**
 * Adapter capability flags
 */
export interface AdapterCapabilities {
  /** Support for database transactions */
  transactions: boolean
  /** Support for JSON/JSONB fields */
  json: boolean | 'limited'
  /** Support for TTL indexes (automatic expiration) */
  ttlIndex: boolean
  /** Case-insensitive email handling */
  caseInsensitiveEmail: 'citext' | 'collation' | 'app-normalize'
  /** Support for upsert operations */
  upsert: boolean
  /** Maximum identifier length (for MySQL VARCHAR limits) */
  maxIdentifierLength?: number
}

/**
 * Adapter error codes for consistent error handling
 */
export const ADAPTER_ERRORS = {
  UNIQUE_VIOLATION: 'ADAPTER_UNIQUE_VIOLATION',
  NOT_FOUND: 'ADAPTER_NOT_FOUND',
  TXN_FAILED: 'ADAPTER_TXN_FAILED',
  CONNECTION_FAILED: 'ADAPTER_CONNECTION_FAILED',
  CONSTRAINT_VIOLATION: 'ADAPTER_CONSTRAINT_VIOLATION',
  INVALID_DATA: 'ADAPTER_INVALID_DATA'
} as const

export type AdapterErrorCode = typeof ADAPTER_ERRORS[keyof typeof ADAPTER_ERRORS]

/**
 * Adapter error class
 */
export class AdapterError extends Error {
  code: AdapterErrorCode
  originalError?: unknown

  constructor(code: AdapterErrorCode, message?: string, originalError?: unknown) {
    super(message ?? code)
    this.name = 'AdapterError'
    this.code = code
    this.originalError = originalError
  }
}

/**
 * Complete adapter interface combining all capabilities
 */
export interface KeyloomAdapter extends Adapter, RbacAdapter, RefreshTokenStore {
  /** Adapter capability flags */
  capabilities: AdapterCapabilities
  
  /** Optional cleanup method for expired tokens/sessions */
  cleanup?(): Promise<{ sessions: number; tokens: number; refreshTokens: number }>
  
  /** Optional health check method */
  healthCheck?(): Promise<{ status: 'healthy' | 'unhealthy'; details?: Record<string, unknown> }>
  
  /** Optional connection close method */
  close?(): Promise<void>
}

/**
 * Adapter factory function type
 */
export type AdapterFactory<TConfig = unknown> = (config: TConfig) => KeyloomAdapter

/**
 * Adapter metadata for registration
 */
export interface AdapterMetadata {
  name: string
  version: string
  description: string
  capabilities: AdapterCapabilities
  configSchema?: unknown // JSON schema for configuration validation
}

/**
 * Base adapter configuration
 */
export interface BaseAdapterConfig {
  /** Connection string or configuration object */
  connection?: string | Record<string, unknown>
  /** Connection pool settings */
  pool?: {
    min?: number
    max?: number
    idleTimeoutMs?: number
    acquireTimeoutMs?: number
  }
  /** Enable debug logging */
  debug?: boolean
  /** Custom table/collection name prefix */
  tablePrefix?: string
  /** Schema name (for databases that support schemas) */
  schema?: string
}

/**
 * Utility type for adapter-specific configuration
 */
export type AdapterConfig<T = Record<string, unknown>> = BaseAdapterConfig & T

/**
 * Email normalization utility
 */
export function normalizeEmail(email: string): string {
  return email.toLowerCase().trim()
}

/**
 * Generate consistent table/collection names
 */
export function getTableName(baseName: string, prefix?: string): string {
  return prefix ? `${prefix}_${baseName}` : baseName
}

/**
 * Utility for handling case-insensitive email queries
 */
export function prepareEmailForQuery(
  email: string, 
  capability: AdapterCapabilities['caseInsensitiveEmail']
): string {
  switch (capability) {
    case 'citext':
    case 'collation':
      return email // Database handles case-insensitivity
    case 'app-normalize':
    default:
      return normalizeEmail(email)
  }
}

/**
 * Standard error mapper interface
 */
export interface ErrorMapper {
  mapError(error: unknown): AdapterError | null
}

/**
 * Base error mapper with common patterns
 */
export abstract class BaseErrorMapper implements ErrorMapper {
  abstract mapError(error: unknown): AdapterError | null

  protected createUniqueViolationError(originalError: unknown, message?: string): AdapterError {
    return new AdapterError(
      ADAPTER_ERRORS.UNIQUE_VIOLATION,
      message || 'Unique constraint violation',
      originalError
    )
  }

  protected createNotFoundError(originalError: unknown, message?: string): AdapterError {
    return new AdapterError(
      ADAPTER_ERRORS.NOT_FOUND,
      message || 'Resource not found',
      originalError
    )
  }

  protected createTransactionError(originalError: unknown, message?: string): AdapterError {
    return new AdapterError(
      ADAPTER_ERRORS.TXN_FAILED,
      message || 'Transaction failed',
      originalError
    )
  }

  protected createConnectionError(originalError: unknown, message?: string): AdapterError {
    return new AdapterError(
      ADAPTER_ERRORS.CONNECTION_FAILED,
      message || 'Database connection failed',
      originalError
    )
  }
}

/**
 * Utility for consistent timestamp handling
 */
export function createTimestamp(): Date {
  return new Date()
}

/**
 * Utility for consistent ID generation
 */
export function generateId(): string {
  // Use the same ID generation as the core package
  return Math.random().toString(36).substring(2) + Date.now().toString(36)
}

/**
 * Transaction wrapper interface
 */
export interface TransactionContext {
  commit(): Promise<void>
  rollback(): Promise<void>
}

/**
 * Transaction wrapper utility
 */
export type TransactionCallback<T> = (ctx: TransactionContext) => Promise<T>

/**
 * Adapter registry for dynamic adapter loading
 */
export class AdapterRegistry {
  private static adapters = new Map<string, AdapterFactory>()
  private static metadata = new Map<string, AdapterMetadata>()

  static register<T>(
    name: string, 
    factory: AdapterFactory<T>, 
    metadata: AdapterMetadata
  ): void {
    this.adapters.set(name, factory)
    this.metadata.set(name, metadata)
  }

  static get(name: string): AdapterFactory | undefined {
    return this.adapters.get(name)
  }

  static getMetadata(name: string): AdapterMetadata | undefined {
    return this.metadata.get(name)
  }

  static list(): string[] {
    return Array.from(this.adapters.keys())
  }

  static listWithMetadata(): Array<{ name: string; metadata: AdapterMetadata }> {
    return Array.from(this.adapters.keys()).map(name => ({
      name,
      metadata: this.metadata.get(name)!
    }))
  }
}
