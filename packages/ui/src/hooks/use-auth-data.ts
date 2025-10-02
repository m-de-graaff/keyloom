import { useState, useEffect, useCallback } from "react"
import { authDataCache, createCacheKey, isCacheExpired } from "../lib/auth-data-cache"

interface UseAuthDataOptions<T> {
  queryFn: () => Promise<T>
  cacheKey: string
  params?: Record<string, any>
  enabled?: boolean
  staleTime?: number
  refetchOnWindowFocus?: boolean
}

interface UseAuthDataResult<T> {
  data: T | null
  isPending: boolean
  isRefetching: boolean
  error: Error | null
  refetch: () => Promise<void>
}

/**
 * Generic hook for fetching auth data with caching
 * Provides automatic caching, deduplication, and background refetching
 */
export function useAuthData<T>({
  queryFn,
  cacheKey: baseCacheKey,
  params,
  enabled = true,
  staleTime = 5 * 60 * 1000, // 5 minutes
  refetchOnWindowFocus = true
}: UseAuthDataOptions<T>): UseAuthDataResult<T> {
  const cacheKey = createCacheKey(baseCacheKey, params)
  
  const [state, setState] = useState<{
    data: T | null
    isPending: boolean
    isRefetching: boolean
    error: Error | null
  }>(() => {
    const cached = authDataCache.get<T>(cacheKey)
    return {
      data: cached?.data ?? null,
      isPending: !cached && enabled,
      isRefetching: cached?.isRefetching ?? false,
      error: null
    }
  })

  const fetchData = useCallback(async (isRefetch = false) => {
    if (!enabled) return

    try {
      // Check for in-flight request to avoid duplicates
      const inFlightRequest = authDataCache.getInFlightRequest<T>(cacheKey)
      if (inFlightRequest) {
        const result = await inFlightRequest
        return result
      }

      // Set loading state
      if (isRefetch) {
        authDataCache.setRefetching(cacheKey, true)
        setState(prev => ({ ...prev, isRefetching: true, error: null }))
      } else {
        setState(prev => ({ ...prev, isPending: true, error: null }))
      }

      // Create and cache the request
      const request = queryFn()
      authDataCache.setInFlightRequest(cacheKey, request)

      const result = await request

      // Update cache and state
      authDataCache.set(cacheKey, result)
      authDataCache.removeInFlightRequest(cacheKey)
      
      setState({
        data: result,
        isPending: false,
        isRefetching: false,
        error: null
      })

      return result
    } catch (error) {
      const errorObj = error instanceof Error ? error : new Error(String(error))
      
      authDataCache.removeInFlightRequest(cacheKey)
      authDataCache.setRefetching(cacheKey, false)
      
      setState(prev => ({
        ...prev,
        isPending: false,
        isRefetching: false,
        error: errorObj
      }))

      throw errorObj
    }
  }, [queryFn, cacheKey, enabled])

  const refetch = useCallback(async () => {
    await fetchData(true)
  }, [fetchData])

  // Subscribe to cache changes
  useEffect(() => {
    const unsubscribe = authDataCache.subscribe(cacheKey, () => {
      const cached = authDataCache.get<T>(cacheKey)
      setState(prev => ({
        ...prev,
        data: cached?.data ?? null,
        isRefetching: cached?.isRefetching ?? false
      }))
    })

    return unsubscribe
  }, [cacheKey])

  // Initial fetch or refetch when enabled/params change
  useEffect(() => {
    if (!enabled) return

    const cached = authDataCache.get<T>(cacheKey)
    
    // Fetch if no cache or cache is expired
    if (!cached || isCacheExpired(cached, staleTime)) {
      fetchData()
    }
  }, [enabled, cacheKey, staleTime, fetchData])

  // Refetch on window focus
  useEffect(() => {
    if (!refetchOnWindowFocus || !enabled) return

    const handleFocus = () => {
      const cached = authDataCache.get<T>(cacheKey)
      if (cached && isCacheExpired(cached, staleTime)) {
        refetch()
      }
    }

    window.addEventListener('focus', handleFocus)
    return () => window.removeEventListener('focus', handleFocus)
  }, [refetchOnWindowFocus, enabled, cacheKey, staleTime, refetch])

  return {
    data: state.data,
    isPending: state.isPending,
    isRefetching: state.isRefetching,
    error: state.error,
    refetch
  }
}
