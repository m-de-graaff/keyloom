import type { PasswordHasher } from './hash'
import { getDefaultPasswordHasherFromEnv } from './hash'

let __defaultHasher: PasswordHasher | null = null

/**
 * Returns a cached default PasswordHasher. On first call, selects using KEYLOOM_HASHER
 * (when provided) with graceful fallback. Subsequent calls return the same instance.
 */
export async function getDefaultHasherSingleton(): Promise<PasswordHasher> {
  if (!__defaultHasher) {
    __defaultHasher = await getDefaultPasswordHasherFromEnv()
  }
  return __defaultHasher
}

