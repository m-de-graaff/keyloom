type CacheEntry<T> = {
  data: T | undefined
  timestamp: number
  isRefetching: boolean
}

type Listener = () => void

class AuthDataCache {
  private cache = new Map<string, CacheEntry<any>>()
  private listeners = new Map<string, Set<Listener>>()
  private inFlight = new Map<string, Promise<any>>()

  subscribe(key: string, cb: Listener) {
    if (!this.listeners.has(key)) this.listeners.set(key, new Set())
    const set = this.listeners.get(key)!
    set.add(cb)
    return () => {
      set.delete(cb)
      if (set.size === 0) this.listeners.delete(key)
    }
  }

  private notify(key: string) {
    const set = this.listeners.get(key)
    if (set) for (const cb of set) cb()
  }

  get<T>(key: string): (CacheEntry<T> & { key: string }) | undefined {
    const entry = this.cache.get(key)
    if (!entry) return undefined
    return { key, ...(entry as CacheEntry<T>) }
  }

  set<T>(key: string, data: T | undefined) {
    const now = Date.now()
    const prev = this.cache.get(key)
    this.cache.set(key, {
      data,
      timestamp: prev?.timestamp ?? now,
      isRefetching: false,
    })
    this.notify(key)
  }

  clear(key: string) {
    this.cache.delete(key)
    this.notify(key)
  }

  setRefetching(key: string, v: boolean) {
    const prev = this.cache.get(key) ?? {
      data: undefined,
      timestamp: Date.now(),
      isRefetching: false,
    }
    this.cache.set(key, { ...prev, isRefetching: v })
    this.notify(key)
  }

  setInFlightRequest<T>(key: string, p: Promise<T>) {
    this.inFlight.set(key, p)
  }

  getInFlightRequest<T = any>(key: string): Promise<T> | undefined {
    return this.inFlight.get(key)
  }

  removeInFlightRequest(key: string) {
    this.inFlight.delete(key)
  }
}

export const authDataCache = new AuthDataCache()

// Export the class for testing or custom instances
export { AuthDataCache }

// Helper function to generate cache keys
export function createCacheKey(prefix: string, params?: Record<string, any>): string {
  if (!params || Object.keys(params).length === 0) {
    return prefix
  }

  const sortedParams = Object.keys(params)
    .sort()
    .map((key) => `${key}:${JSON.stringify(params[key])}`)
    .join('|')

  return `${prefix}:${sortedParams}`
}

// Cache expiration utilities
export function isCacheExpired(entry: CacheEntry<unknown>, maxAge: number): boolean {
  return Date.now() - entry.timestamp > maxAge
}

export function getCacheAge(entry: CacheEntry<unknown>): number {
  return Date.now() - entry.timestamp
}
