/**
 * Centralized route/path management for Keyloom UI components.
 * Provides consistent path constants and types following Keyloom's kebab-case convention.
 */

import type { AuthView, AccountView, OrganizationView } from '../types'

/**
 * Default authentication view paths (kebab-case)
 */
export const DEFAULT_AUTH_PATHS: Record<AuthView, string> = {
  'sign-in': 'sign-in',
  'sign-up': 'sign-up',
  'forgot-password': 'forgot-password',
  'reset-password': 'reset-password',
  'verify-email': 'verify-email',
  'magic-link': 'magic-link',
  'two-factor-setup': 'two-factor-setup',
  'two-factor-verify': 'two-factor-verify',
  'accept-invitation': 'accept-invitation',
} as const

/**
 * Default account management view paths (kebab-case)
 */
export const DEFAULT_ACCOUNT_PATHS: Record<AccountView, string> = {
  profile: 'profile',
  security: 'security',
  'api-keys': 'api-keys',
  sessions: 'sessions',
  organizations: 'organizations',
  billing: 'billing',
  preferences: 'preferences',
  'data-export': 'data-export',
  'delete-account': 'delete-account',
} as const

/**
 * Default organization management view paths (kebab-case)
 */
export const DEFAULT_ORGANIZATION_PATHS: Record<OrganizationView, string> = {
  overview: 'overview',
  settings: 'settings',
  members: 'members',
  roles: 'roles',
  invitations: 'invitations',
  'api-keys': 'api-keys',
  billing: 'billing',
  usage: 'usage',
  'audit-log': 'audit-log',
  integrations: 'integrations',
  security: 'security',
  'delete-organization': 'delete-organization',
} as const

/**
 * Default base paths for different UI sections
 */
export const DEFAULT_BASE_PATHS = {
  /** Default base path for authentication routes @default "/auth" */
  auth: '/auth',
  /** Default base path for account management routes @default "/account" */
  account: '/account',
  /** Default base path for organization management routes @default "/org" */
  organization: '/org',
} as const

/**
 * Authentication view path configuration
 */
export interface AuthViewPaths {
  /** Base path for authentication routes */
  basePath: string
  /** Individual view paths */
  views: Record<AuthView, string>
}

/**
 * Account view path configuration
 */
export interface AccountViewPaths {
  /** Base path for account management routes */
  basePath: string
  /** Individual view paths */
  views: Record<AccountView, string>
}

/**
 * Organization view path configuration
 */
export interface OrganizationViewPaths {
  /** Base path for organization management routes */
  basePath: string
  /** Individual view paths */
  views: Record<OrganizationView, string>
}

/**
 * Complete view path configuration
 */
export interface ViewPathsConfig {
  /** Authentication paths */
  auth: AuthViewPaths
  /** Account management paths */
  account: AccountViewPaths
  /** Organization management paths */
  organization: OrganizationViewPaths
}

/**
 * Creates authentication view paths with custom base path and overrides.
 *
 * @param basePath - Base path for authentication routes
 * @param overrides - Custom path overrides for specific views
 * @returns Complete authentication view paths configuration
 *
 * @example
 * ```typescript
 * const authPaths = createAuthViewPaths('/auth', {
 *   'sign-in': 'login',
 *   'sign-up': 'register'
 * })
 * console.log(authPaths.views['sign-in']) // 'login'
 * ```
 */
export function createAuthViewPaths(
  basePath: string = DEFAULT_BASE_PATHS.auth,
  overrides: Partial<Record<AuthView, string>> = {},
): AuthViewPaths {
  return {
    basePath: basePath.startsWith('/') ? basePath : `/${basePath}`,
    views: { ...DEFAULT_AUTH_PATHS, ...overrides },
  }
}

/**
 * Creates account view paths with custom base path and overrides.
 *
 * @param basePath - Base path for account management routes
 * @param overrides - Custom path overrides for specific views
 * @returns Complete account view paths configuration
 *
 * @example
 * ```typescript
 * const accountPaths = createAccountViewPaths('/account', {
 *   'api-keys': 'keys',
 *   'data-export': 'export'
 * })
 * ```
 */
export function createAccountViewPaths(
  basePath: string = DEFAULT_BASE_PATHS.account,
  overrides: Partial<Record<AccountView, string>> = {},
): AccountViewPaths {
  return {
    basePath: basePath.startsWith('/') ? basePath : `/${basePath}`,
    views: { ...DEFAULT_ACCOUNT_PATHS, ...overrides },
  }
}

/**
 * Creates organization view paths with custom base path and overrides.
 *
 * @param basePath - Base path for organization management routes
 * @param overrides - Custom path overrides for specific views
 * @returns Complete organization view paths configuration
 *
 * @example
 * ```typescript
 * const orgPaths = createOrganizationViewPaths('/org', {
 *   'audit-log': 'logs',
 *   'delete-organization': 'delete'
 * })
 * ```
 */
export function createOrganizationViewPaths(
  basePath: string = DEFAULT_BASE_PATHS.organization,
  overrides: Partial<Record<OrganizationView, string>> = {},
): OrganizationViewPaths {
  return {
    basePath: basePath.startsWith('/') ? basePath : `/${basePath}`,
    views: { ...DEFAULT_ORGANIZATION_PATHS, ...overrides },
  }
}

/**
 * Creates complete view paths configuration with custom base paths and overrides.
 *
 * @param config - Configuration options for all view path sections
 * @returns Complete view paths configuration
 *
 * @example
 * ```typescript
 * const viewPaths = createViewPathsConfig({
 *   auth: {
 *     basePath: '/authentication',
 *     overrides: { 'sign-in': 'login' }
 *   },
 *   account: {
 *     basePath: '/profile',
 *     overrides: { 'api-keys': 'keys' }
 *   }
 * })
 * ```
 */
export function createViewPathsConfig(
  config: {
    auth?: {
      basePath?: string
      overrides?: Partial<Record<AuthView, string>>
    }
    account?: {
      basePath?: string
      overrides?: Partial<Record<AccountView, string>>
    }
    organization?: {
      basePath?: string
      overrides?: Partial<Record<OrganizationView, string>>
    }
  } = {},
): ViewPathsConfig {
  return {
    auth: createAuthViewPaths(config.auth?.basePath, config.auth?.overrides),
    account: createAccountViewPaths(config.account?.basePath, config.account?.overrides),
    organization: createOrganizationViewPaths(
      config.organization?.basePath,
      config.organization?.overrides,
    ),
  }
}

/**
 * Builds a complete URL path by combining base path and view path.
 *
 * @param basePath - Base path (e.g., '/auth')
 * @param viewPath - View path (e.g., 'sign-in')
 * @returns Complete URL path (e.g., '/auth/sign-in')
 *
 * @example
 * ```typescript
 * const fullPath = buildViewPath('/auth', 'sign-in')
 * console.log(fullPath) // '/auth/sign-in'
 *
 * const customPath = buildViewPath('/authentication', 'login')
 * console.log(customPath) // '/authentication/login'
 * ```
 */
export function buildViewPath(basePath: string, viewPath: string): string {
  const normalizedBasePath = basePath.startsWith('/') ? basePath : `/${basePath}`
  const normalizedViewPath = viewPath.startsWith('/') ? viewPath.slice(1) : viewPath

  // Remove trailing slashes and normalize multiple slashes
  const result = `${normalizedBasePath}/${normalizedViewPath}`
    .replace(/\/+/g, '/') // Replace multiple slashes with single slash
    .replace(/\/$/, '') // Remove trailing slash

  return result || '/'
}

/**
 * Extracts view name from a complete path.
 *
 * @param fullPath - Complete path (e.g., '/auth/sign-in')
 * @param basePath - Base path to remove (e.g., '/auth')
 * @returns View path (e.g., 'sign-in')
 *
 * @example
 * ```typescript
 * const viewPath = extractViewPath('/auth/sign-in', '/auth')
 * console.log(viewPath) // 'sign-in'
 * ```
 */
export function extractViewPath(fullPath: string, basePath: string): string {
  const normalizedBasePath = basePath.startsWith('/') ? basePath : `/${basePath}`
  const normalizedFullPath = fullPath.startsWith('/') ? fullPath : `/${fullPath}`

  if (normalizedFullPath.startsWith(normalizedBasePath)) {
    return normalizedFullPath.slice(normalizedBasePath.length).replace(/^\/+/, '')
  }

  return normalizedFullPath.replace(/^\/+/, '')
}

/**
 * Validates if a path follows Keyloom's kebab-case convention.
 *
 * @param path - Path to validate
 * @returns True if path is valid kebab-case
 *
 * @example
 * ```typescript
 * console.log(isValidViewPath('sign-in')) // true
 * console.log(isValidViewPath('signIn')) // false
 * console.log(isValidViewPath('sign_in')) // false
 * ```
 */
export function isValidViewPath(path: string): boolean {
  // Kebab-case pattern: lowercase letters, numbers, and hyphens only
  // Must start and end with alphanumeric character
  const kebabCasePattern = /^[a-z0-9]+(-[a-z0-9]+)*$/
  return kebabCasePattern.test(path)
}

/**
 * Converts a string to kebab-case for use as a view path.
 *
 * @param input - Input string to convert
 * @returns Kebab-case string
 *
 * @example
 * ```typescript
 * console.log(toKebabCase('signIn')) // 'sign-in'
 * console.log(toKebabCase('Sign Up')) // 'sign-up'
 * console.log(toKebabCase('API_KEYS')) // 'api-keys'
 * ```
 */
export function toKebabCase(input: string): string {
  return input
    .replace(/([a-z])([A-Z])/g, '$1-$2') // camelCase to kebab-case
    .replace(/[\s_]+/g, '-') // spaces and underscores to hyphens
    .replace(/[^a-z0-9\s_-]/gi, '-') // replace special characters with hyphens
    .toLowerCase()
    .replace(/[^a-z0-9-]/g, '') // remove remaining invalid characters
    .replace(/-+/g, '-') // collapse multiple hyphens
    .replace(/^-|-$/g, '') // remove leading/trailing hyphens
}

/**
 * Gets all available view paths for a specific section.
 *
 * @param section - The UI section ('auth', 'account', or 'organization')
 * @returns Array of available view paths for the section
 *
 * @example
 * ```typescript
 * const authViews = getAvailableViewPaths('auth')
 * console.log(authViews) // ['sign-in', 'sign-up', 'forgot-password', ...]
 * ```
 */
export function getAvailableViewPaths(section: 'auth' | 'account' | 'organization'): string[] {
  switch (section) {
    case 'auth':
      return Object.values(DEFAULT_AUTH_PATHS)
    case 'account':
      return Object.values(DEFAULT_ACCOUNT_PATHS)
    case 'organization':
      return Object.values(DEFAULT_ORGANIZATION_PATHS)
    default:
      return []
  }
}
