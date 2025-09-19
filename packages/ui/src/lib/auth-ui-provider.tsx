"use client"
import * as React from "react"

export type MinimalSession = { user?: { id?: string | null } | null }
export type QueryHookResult<T> = { data: T | null; isPending: boolean; error?: unknown }

export type AuthUIContextValue = {
  // App navigation helpers
  redirectTo: string
  replace: (href: string) => void

  // i18n
  localization: Record<string, string>
  dir?: "ltr" | "rtl"

  // Toaster
  toast: (opts: { variant?: "success" | "error" | "info"; message: string }) => void

  // Active org context (optional)
  organization?: { customRoles?: Array<{ role: string; label: string }> } | null

  // Hooks provided by the host app
  hooks: {
    useSession: () => { data: MinimalSession | null; isPending: boolean }
    // Example: useInvitation({ query: { id } })
    useInvitation?: (opts: any) => QueryHookResult<any>
  }

  // Auth client surface from host app (only methods used by components need to exist)
  authClient: {
    organization: {
      acceptInvitation: (opts: any) => Promise<any>
      rejectInvitation: (opts: any) => Promise<any>
    }
  }
}

export const AuthUIContext = React.createContext<AuthUIContextValue | null>(null)

export function AuthUIProvider({ children, value }: { children: React.ReactNode; value: AuthUIContextValue }) {
  return (
    <AuthUIContext.Provider value={value}>
      <div dir={value.dir ?? "ltr"}>{children}</div>
    </AuthUIContext.Provider>
  )
}

export function useAuthUIContext(): AuthUIContextValue {
  const ctx = React.useContext(AuthUIContext)
  if (!ctx) throw new Error("AuthUIContext not found. Wrap your tree in <AuthUIProvider value={...}>.")
  return ctx
}

