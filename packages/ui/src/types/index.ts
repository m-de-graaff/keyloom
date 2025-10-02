/**
 * Centralized type definitions for Keyloom UI components and configuration.
 *
 * This module provides comprehensive TypeScript types for configuring and customizing
 * Keyloom UI components. All types follow Keyloom's conventions:
 * - Input types use optional fields for developer configuration
 * - Context types use required fields for resolved/processed configuration
 * - JSDoc comments include @default values where applicable
 * - Naming follows Keyloom patterns (basePath, viewPaths, etc.)
 *
 * @example
 * ```typescript
 * import type { AuthUIOptions, AccountUIOptions } from '@keyloom/ui/types'
 *
 * const authConfig: AuthUIOptions = {
 *   basePath: '/auth',
 *   features: {
 *     signUp: true,
 *     forgotPassword: true
 *   }
 * }
 *
 * const accountConfig: AccountUIOptions = {
 *   basePath: '/account',
 *   profilePicture: {
 *     enabled: true,
 *     maxSize: 5 * 1024 * 1024 // 5MB
 *   }
 * }
 * ```
 */

// Re-export all authentication types
export type {
  AuthView,
  OAuthProviderUIConfig,
  AuthFieldConfig,
  AuthUIOptions,
  AuthUIContext,
  AvatarOptions,
  CaptchaOptions,
  CredentialsOptions,
  DeleteUserOptions,
  GenericOAuthOptions,
  SignUpOptions,
  SocialOptions,
  LinkComponent,
  RenderToast,
  LocalizationConfig,
  ViewPathsConfig,
  AuthHooks,
  AuthMutators,
} from './auth-options'

// Re-export all account management types
export type {
  AccountView,
  AccountFieldConfig,
  ApiKeyConfig,
  SessionConfig,
  AccountUIOptions,
  AccountUIContext,
  AccountOptionsContext,
} from './account-options'

// Re-export all organization management types
export type {
  OrganizationView,
  OrganizationRoleConfig,
  MemberInvitationConfig,
  OrganizationBillingConfig,
  OrganizationUIOptions,
  OrganizationUIContext,
  OrganizationOptionsContext,
} from './organization-options'

// Re-export all Gravatar integration types
export type {
  GravatarRating,
  GravatarDefault,
  GravatarFormat,
  GravatarUrlOptions,
  GravatarOptions,
  GravatarContext,
  GravatarImageInfo,
} from './gravatar-options'

// Re-export all theme and styling types
export type {
  ColorScheme,
  ComponentSize,
  BorderRadius,
  ColorPalette,
  TypographyConfig,
  SpacingConfig,
  ComponentStyling,
  AnimationConfig,
  ThemeOptions,
  ThemeContext,
} from './theme-options'

// Re-export existing types for backward compatibility
export type { FetchError } from './fetch-error'

// Import types for union types
import type { AuthView, AuthUIOptions, AuthUIContext } from './auth-options'
import type { AccountView, AccountUIOptions, AccountUIContext } from './account-options'
import type {
  OrganizationView,
  OrganizationUIOptions,
  OrganizationUIContext,
} from './organization-options'

/**
 * Union type of all available UI views across all domains
 */
export type AllUIViews = AuthView | AccountView | OrganizationView

/**
 * Union type of all UI input options
 */
export type AllUIOptions = AuthUIOptions | AccountUIOptions | OrganizationUIOptions

/**
 * Union type of all UI contexts (resolved configurations)
 */
export type AllUIContexts = AuthUIContext | AccountUIContext | OrganizationUIContext

/**
 * Base configuration interface that all UI options extend
 */
export interface BaseUIOptions {
  /** Base path for routes */
  basePath?: string
  /** Custom CSS classes */
  className?: string
  /** Custom text overrides */
  text?: Record<string, any>
}

/**
 * Base context interface that all UI contexts extend
 */
export interface BaseUIContext {
  /** Resolved base path for routes */
  basePath: string
  /** Resolved custom CSS classes */
  className: string
  /** Resolved text overrides with defaults */
  text: Record<string, any>
}

/**
 * Common field validation configuration
 */
export interface FieldValidation {
  /** Minimum length */
  minLength?: number
  /** Maximum length */
  maxLength?: number
  /** Validation pattern */
  pattern?: RegExp
  /** Custom validator function */
  customValidator?: (value: string) => string | null
}

/**
 * Common field configuration interface
 */
export interface BaseFieldConfig {
  /** Whether the field is visible */
  visible?: boolean
  /** Whether the field is required */
  required?: boolean
  /** Custom label text */
  label?: string
  /** Placeholder text */
  placeholder?: string
  /** Help text or description */
  helpText?: string
  /** Validation rules */
  validation?: FieldValidation
}

/**
 * Common image upload configuration
 */
export interface ImageUploadConfig {
  /** Whether image upload is enabled */
  enabled?: boolean
  /** Maximum file size in bytes */
  maxSize?: number
  /** Allowed file formats */
  allowedFormats?: string[]
  /** Image processing options */
  processing?: {
    /** Target width for resizing */
    width?: number
    /** Target height for resizing */
    height?: number
    /** Image quality (0-100) */
    quality?: number
  }
}

/**
 * Common confirmation configuration
 */
export interface ConfirmationConfig {
  /** Whether to require password confirmation */
  requirePassword?: boolean
  /** Whether to require typing a specific text */
  requireText?: boolean
  /** Custom confirmation text */
  confirmationText?: string
}

/**
 * Common pagination configuration
 */
export interface PaginationConfig {
  /** Items per page */
  pageSize?: number
  /** Whether to show page size selector */
  showPageSize?: boolean
  /** Available page size options */
  pageSizeOptions?: number[]
  /** Whether to show total count */
  showTotal?: boolean
}

/**
 * Common sorting configuration
 */
export interface SortingConfig {
  /** Default sort field */
  defaultField?: string
  /** Default sort direction */
  defaultDirection?: 'asc' | 'desc'
  /** Available sort fields */
  availableFields?: Array<{
    field: string
    label: string
  }>
}

/**
 * Common filtering configuration
 */
export interface FilteringConfig {
  /** Whether filtering is enabled */
  enabled?: boolean
  /** Available filter fields */
  fields?: Array<{
    field: string
    label: string
    type: 'text' | 'select' | 'date' | 'boolean'
    options?: Array<{ value: string; label: string }>
  }>
}

/**
 * Common table/list configuration
 */
export interface TableConfig {
  /** Pagination configuration */
  pagination?: PaginationConfig
  /** Sorting configuration */
  sorting?: SortingConfig
  /** Filtering configuration */
  filtering?: FilteringConfig
  /** Whether to show row selection */
  showSelection?: boolean
  /** Whether to show row actions */
  showActions?: boolean
}

/**
 * Utility type to make all properties of T required and non-nullable
 */
export type RequiredNonNullable<T> = {
  [P in keyof T]-?: NonNullable<T[P]>
}

/**
 * Utility type to make specific properties of T required
 */
export type RequiredFields<T, K extends keyof T> = T & Required<Pick<T, K>>

/**
 * Utility type to make specific properties of T optional
 */
export type OptionalFields<T, K extends keyof T> = Omit<T, K> & Partial<Pick<T, K>>

/**
 * Utility type for configuration with defaults applied
 */
export type WithDefaults<T, D> = RequiredNonNullable<T> & D
