import { 
  AdapterError, 
  ADAPTER_ERRORS, 
  BaseErrorMapper 
} from '@keyloom/core/adapter-types'

/**
 * Drizzle error mapper following cross-adapter principles
 */
export class DrizzleErrorMapper extends BaseErrorMapper {
  mapError(error: unknown): AdapterError | null {
    const err = error as any

    // Handle PostgreSQL errors (via node-postgres)
    if (err.code) {
      switch (err.code) {
        case '23505': // unique_violation
          return this.createUniqueViolationError(error, 'Unique constraint violation')
        
        case '23503': // foreign_key_violation
          return new AdapterError(
            ADAPTER_ERRORS.CONSTRAINT_VIOLATION,
            'Foreign key constraint violation',
            error
          )
        
        case '23502': // not_null_violation
        case '23514': // check_violation
          return new AdapterError(
            ADAPTER_ERRORS.INVALID_DATA,
            'Data validation failed',
            error
          )
        
        case '08000': // connection_exception
        case '08003': // connection_does_not_exist
        case '08006': // connection_failure
          return this.createConnectionError(error, 'Database connection failed')
        
        case '40001': // serialization_failure
        case '40P01': // deadlock_detected
          return this.createTransactionError(error, 'Transaction failed due to conflict')
      }
    }

    // Handle MySQL errors
    if (err.errno) {
      switch (err.errno) {
        case 1062: // ER_DUP_ENTRY
          return this.createUniqueViolationError(error, 'Duplicate entry')
        
        case 1452: // ER_NO_REFERENCED_ROW_2
          return new AdapterError(
            ADAPTER_ERRORS.CONSTRAINT_VIOLATION,
            'Foreign key constraint fails',
            error
          )
        
        case 1048: // ER_BAD_NULL_ERROR
        case 1264: // ER_WARN_DATA_OUT_OF_RANGE
          return new AdapterError(
            ADAPTER_ERRORS.INVALID_DATA,
            'Invalid data provided',
            error
          )
        
        case 2003: // CR_CONN_HOST_ERROR
        case 2013: // CR_SERVER_LOST
          return this.createConnectionError(error, 'MySQL connection failed')
        
        case 1213: // ER_LOCK_DEADLOCK
          return this.createTransactionError(error, 'Deadlock detected')
      }
    }

    // Handle SQLite errors
    if (err.message && typeof err.message === 'string') {
      const message = err.message.toLowerCase()
      
      if (message.includes('unique constraint failed') || message.includes('unique')) {
        return this.createUniqueViolationError(error, 'Unique constraint failed')
      }
      
      if (message.includes('foreign key constraint failed')) {
        return new AdapterError(
          ADAPTER_ERRORS.CONSTRAINT_VIOLATION,
          'Foreign key constraint failed',
          error
        )
      }
      
      if (message.includes('not null constraint failed')) {
        return new AdapterError(
          ADAPTER_ERRORS.INVALID_DATA,
          'NOT NULL constraint failed',
          error
        )
      }
      
      if (message.includes('database is locked') || message.includes('busy')) {
        return this.createTransactionError(error, 'Database is busy')
      }
    }

    // Handle Drizzle-specific errors
    if (err.name === 'DrizzleError') {
      return new AdapterError(
        ADAPTER_ERRORS.QUERY_FAILED,
        err.message || 'Drizzle query failed',
        error
      )
    }

    // Unknown error, return null to let it bubble up
    return null
  }
}

const errorMapper = new DrizzleErrorMapper()

/**
 * Map Drizzle/database errors to AdapterError
 */
export function mapError(error: unknown): AdapterError | unknown {
  return errorMapper.mapError(error) || error
}

/**
 * Wrap a database operation with error mapping
 */
export async function withErrorMapping<T>(operation: () => Promise<T>): Promise<T> {
  try {
    return await operation()
  } catch (error) {
    const mappedError = mapError(error)
    if (mappedError instanceof AdapterError) {
      throw mappedError
    }
    throw error
  }
}
