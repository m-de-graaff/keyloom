// Theme and UI components
export * as theme from './theme/tokens'
export * from './auth'
export * as components from './components'
export * as primitives from './primitives'
export * as org from './org'
export * as rbac from './rbac'
export * as icons from './icons'

// Foundation modules (Phase 1)
export * from './types'
export * from './localization'
export * from './lib'

// Legacy exports (to be removed in Phase 2)
export { AuthUIProvider, AuthUIProviderContext, useAuthUIContext } from './lib/auth-ui-provider'
