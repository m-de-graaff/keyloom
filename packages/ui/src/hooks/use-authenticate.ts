import { useContext, useEffect } from "react"
import { AuthUIContext } from "../lib/auth-ui-provider"
import type { AuthView } from "../types"

interface AuthenticateOptions {
  authView?: AuthView
  enabled?: boolean
}

/**
 * Hook to handle authentication requirements for protected routes
 * Automatically redirects to auth flow if user is not authenticated
 */
export function useAuthenticate(options?: AuthenticateOptions) {
  const { authView = "sign-in", enabled = true } = options ?? {}

  const {
    hooks: { useSession },
    basePath,
    viewPaths,
    replace
  } = useContext(AuthUIContext)

  const { data, isPending, error, refetch } = useSession()

  useEffect(() => {
    if (!enabled || isPending || data) return

    const currentUrl = new URL(window.location.href)
    const redirectTo =
      currentUrl.searchParams.get("redirectTo") ||
      window.location.href.replace(window.location.origin, "")

    const authPath = viewPaths.auth[authView]
    if (authPath) {
      replace(`${basePath}/${authPath}?redirectTo=${encodeURIComponent(redirectTo)}`)
    }
  }, [
    isPending,
    data,
    basePath,
    viewPaths,
    replace,
    authView,
    enabled
  ])

  return {
    data,
    user: data?.user,
    isPending,
    error,
    refetch,
    isAuthenticated: !!data?.user
  }
}
