import { ERR, KeyloomError } from '@keyloom/core'
import {
  AdapterError,
  ADAPTER_ERRORS,
  BaseErrorMapper
} from '@keyloom/core/adapter-types'

type PrismaKnownError = {
  code?: string
  message?: string
  meta?: Record<string, unknown>
}

/**
 * Prisma error mapper following cross-adapter principles
 */
export class PrismaErrorMapper extends BaseErrorMapper {
  mapError(error: unknown): AdapterError | null {
    const prismaError = error as PrismaKnownError
    const code = prismaError.code
    const message = prismaError.message

    switch (code) {
      case 'P2002':
        // Unique constraint violation
        return this.createUniqueViolationError(error, 'Unique constraint violation')

      case 'P2025':
        // Record not found
        return this.createNotFoundError(error, 'Record not found')

      case 'P2034':
        // Transaction failed
        return this.createTransactionError(error, 'Transaction failed due to write conflict')

      case 'P1001':
      case 'P1002':
      case 'P1008':
      case 'P1017':
        // Connection errors
        return this.createConnectionError(error, 'Database connection failed')

      case 'P2003':
        // Foreign key constraint violation
        return new AdapterError(
          ADAPTER_ERRORS.CONSTRAINT_VIOLATION,
          'Foreign key constraint violation',
          error
        )

      case 'P2006':
      case 'P2007':
      case 'P2008':
      case 'P2009':
      case 'P2010':
      case 'P2011':
      case 'P2012':
      case 'P2013':
      case 'P2014':
        // Data validation errors
        return new AdapterError(
          ADAPTER_ERRORS.INVALID_DATA,
          message || 'Invalid data provided',
          error
        )

      default:
        // Unknown Prisma error, return null to let it bubble up
        return null
    }
  }
}

const errorMapper = new PrismaErrorMapper()

/**
 * Legacy error mapping function for backward compatibility
 */
export function mapPrismaError(e: unknown) {
  const mappedError = errorMapper.mapError(e)
  if (mappedError) {
    // Convert to legacy KeyloomError for backward compatibility
    if (mappedError.code === ADAPTER_ERRORS.UNIQUE_VIOLATION) {
      return new KeyloomError(ERR.ADAPTER_UNIQUE_VIOLATION, mappedError.message)
    }
    // For other errors, throw the AdapterError directly
    return mappedError
  }
  return e
}

/**
 * Modern error mapping function
 */
export function mapError(error: unknown): AdapterError | unknown {
  return errorMapper.mapError(error) || error
}
