export class KeyloomError extends Error {
  code: string
  constructor(code: string, message?: string) {
    super(message ?? code)
    this.name = 'KeyloomError'
    this.code = code
  }
}

export const ERR = {
  USER_NOT_FOUND: 'USER_NOT_FOUND',
  EMAIL_EXISTS: 'EMAIL_EXISTS',
  ACCOUNT_LINKED: 'ACCOUNT_LINKED',
  SESSION_NOT_FOUND: 'SESSION_NOT_FOUND',
  TOKEN_NOT_FOUND: 'TOKEN_NOT_FOUND',
  TOKEN_CONSUMED: 'TOKEN_CONSUMED',
  TOKEN_EXPIRED: 'TOKEN_EXPIRED',
  ADAPTER_UNIQUE_VIOLATION: 'ADAPTER_UNIQUE_VIOLATION',
} as const
