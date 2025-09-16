import { ERR, KeyloomError } from '@keyloom/core'

type PrismaKnownError = { code?: string }

export function mapPrismaError(e: unknown) {
  const code = (e as PrismaKnownError).code
  if (code === 'P2002') {
    // unique constraint failed
    return new KeyloomError(ERR.ADAPTER_UNIQUE_VIOLATION, 'Unique constraint failed')
  }
  return e
}
