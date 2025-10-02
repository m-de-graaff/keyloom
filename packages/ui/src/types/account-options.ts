/**
 * Account settings and management UI configuration options.
 * These types define how account-related components and flows should be configured.
 */

/**
 * Available account management views/pages
 */
export type AccountView =
  | 'profile'
  | 'security'
  | 'api-keys'
  | 'sessions'
  | 'organizations'
  | 'billing'
  | 'preferences'
  | 'data-export'
  | 'delete-account'

/**
 * Account profile field configuration
 */
export interface AccountFieldConfig {
  /** Whether the field is visible */
  visible?: boolean
  /** Whether the field is editable */
  editable?: boolean
  /** Whether the field is required */
  required?: boolean
  /** Custom label text */
  label?: string
  /** Placeholder text */
  placeholder?: string
  /** Help text or description */
  helpText?: string
  /** Custom validation rules */
  validation?: {
    minLength?: number
    maxLength?: number
    pattern?: RegExp
    customValidator?: (value: string) => string | null
  }
}

/**
 * API key configuration options
 */
export interface ApiKeyConfig {
  /** Whether API keys are enabled @default true */
  enabled?: boolean
  /** Maximum number of API keys per user @default 10 */
  maxKeys?: number
  /** Available scopes for API keys */
  scopes?: Array<{
    id: string
    name: string
    description: string
    default?: boolean
  }>
  /** Whether to show key usage statistics @default true */
  showUsage?: boolean
  /** Key expiration options */
  expiration?: {
    /** Available expiration periods in days */
    options?: number[]
    /** Default expiration period in days @default 365 */
    default?: number
    /** Whether keys can be set to never expire @default false */
    allowNeverExpire?: boolean
  }
}

/**
 * Session management configuration
 */
export interface SessionConfig {
  /** Whether session management is enabled @default true */
  enabled?: boolean
  /** Whether to show device information @default true */
  showDeviceInfo?: boolean
  /** Whether to show location information @default false */
  showLocation?: boolean
  /** Whether to show last activity @default true */
  showLastActivity?: boolean
  /** Whether users can revoke other sessions @default true */
  allowRevoke?: boolean
}

/**
 * Account UI input options (what developers configure)
 */
export interface AccountUIOptions {
  /** Base path for account routes @default "/account" */
  basePath?: string

  /** Custom view paths relative to basePath */
  viewPaths?: Partial<Record<AccountView, string>>

  /** Profile field configurations */
  profileFields?: {
    email?: AccountFieldConfig
    username?: AccountFieldConfig
    firstName?: AccountFieldConfig
    lastName?: AccountFieldConfig
    displayName?: AccountFieldConfig
    bio?: AccountFieldConfig
    website?: AccountFieldConfig
    location?: AccountFieldConfig
    company?: AccountFieldConfig
    jobTitle?: AccountFieldConfig
  }

  /** Profile picture configuration */
  profilePicture?: {
    /** Whether profile pictures are enabled @default true */
    enabled?: boolean
    /** Maximum file size in bytes @default 5MB */
    maxSize?: number
    /** Allowed file formats @default ['jpg', 'jpeg', 'png', 'webp'] */
    allowedFormats?: string[]
    /** Whether to enable Gravatar integration @default true */
    enableGravatar?: boolean
    /** Whether to allow custom uploads @default true */
    allowCustomUpload?: boolean
    /** Image processing options */
    processing?: {
      /** Target width for resizing @default 200 */
      width?: number
      /** Target height for resizing @default 200 */
      height?: number
      /** Image quality (0-100) @default 85 */
      quality?: number
    }
  }

  /** Security settings configuration */
  security?: {
    /** Password change configuration */
    passwordChange?: {
      /** Whether password change is enabled @default true */
      enabled?: boolean
      /** Whether current password is required @default true */
      requireCurrentPassword?: boolean
      /** Password strength requirements */
      requirements?: {
        minLength?: number
        requireUppercase?: boolean
        requireLowercase?: boolean
        requireNumbers?: boolean
        requireSymbols?: boolean
      }
    }

    /** Two-factor authentication configuration */
    twoFactor?: {
      /** Whether 2FA is enabled @default false */
      enabled?: boolean
      /** Available 2FA methods */
      methods?: Array<'totp' | 'sms' | 'email'>
      /** Whether 2FA is required @default false */
      required?: boolean
      /** Whether to show recovery codes @default true */
      showRecoveryCodes?: boolean
    }

    /** Account linking configuration */
    accountLinking?: {
      /** Whether account linking is enabled @default true */
      enabled?: boolean
      /** Available providers for linking */
      providers?: string[]
      /** Whether users can unlink accounts @default true */
      allowUnlink?: boolean
      /** Whether to require at least one auth method @default true */
      requireOneMethod?: boolean
    }
  }

  /** API key management configuration */
  apiKeys?: ApiKeyConfig

  /** Session management configuration */
  sessions?: SessionConfig

  /** Organization membership configuration */
  organizations?: {
    /** Whether organization features are enabled @default true */
    enabled?: boolean
    /** Whether users can create organizations @default true */
    allowCreate?: boolean
    /** Whether users can leave organizations @default true */
    allowLeave?: boolean
    /** Maximum organizations per user @default 10 */
    maxMemberships?: number
  }

  /** Data export and privacy configuration */
  dataExport?: {
    /** Whether data export is enabled @default true */
    enabled?: boolean
    /** Available export formats */
    formats?: Array<'json' | 'csv' | 'xml'>
    /** Whether to include organization data @default false */
    includeOrganizations?: boolean
  }

  /** Account deletion configuration */
  accountDeletion?: {
    /** Whether account deletion is enabled @default true */
    enabled?: boolean
    /** Confirmation requirements */
    confirmation?: {
      /** Whether to require password confirmation @default true */
      requirePassword?: boolean
      /** Whether to require typing account name @default false */
      requireAccountName?: boolean
      /** Custom confirmation text */
      confirmationText?: string
    }
    /** Grace period before permanent deletion (in days) @default 30 */
    gracePeriod?: number
  }

  /** UI customization */
  appearance?: {
    /** Custom CSS classes */
    className?: string
    /** Whether to show section icons @default true */
    showIcons?: boolean
    /** Layout style */
    layout?: 'tabs' | 'sidebar' | 'accordion'
  }

  /** Custom text overrides */
  text?: {
    /** Custom page titles */
    titles?: Partial<Record<AccountView, string>>
    /** Custom section labels */
    sections?: Record<string, string>
    /** Custom button labels */
    buttons?: Record<string, string>
    /** Custom field labels */
    labels?: Record<string, string>
    /** Custom messages */
    messages?: Record<string, string>
  }
}

/**
 * Resolved account UI context (after processing options with defaults)
 */
export interface AccountUIContext {
  /** Resolved base path for account routes */
  basePath: string

  /** Resolved view paths with all defaults applied */
  viewPaths: Record<AccountView, string>

  /** Resolved profile field configurations with defaults */
  profileFields: Record<string, Required<AccountFieldConfig>>

  /** Resolved profile picture configuration */
  profilePicture: {
    enabled: boolean
    maxSize: number
    allowedFormats: string[]
    enableGravatar: boolean
    allowCustomUpload: boolean
    processing: {
      width: number
      height: number
      quality: number
    }
  }

  /** Resolved security configuration */
  security: {
    passwordChange: {
      enabled: boolean
      requireCurrentPassword: boolean
      requirements: {
        minLength: number
        requireUppercase: boolean
        requireLowercase: boolean
        requireNumbers: boolean
        requireSymbols: boolean
      }
    }
    twoFactor: {
      enabled: boolean
      methods: Array<'totp' | 'sms' | 'email'>
      required: boolean
      showRecoveryCodes: boolean
    }
    accountLinking: {
      enabled: boolean
      providers: string[]
      allowUnlink: boolean
      requireOneMethod: boolean
    }
  }

  /** Resolved API key configuration */
  apiKeys: Required<ApiKeyConfig>

  /** Resolved session configuration */
  sessions: Required<SessionConfig>

  /** Resolved organization configuration */
  organizations: {
    enabled: boolean
    allowCreate: boolean
    allowLeave: boolean
    maxMemberships: number
  }

  /** Resolved data export configuration */
  dataExport: {
    enabled: boolean
    formats: Array<'json' | 'csv' | 'xml'>
    includeOrganizations: boolean
  }

  /** Resolved account deletion configuration */
  accountDeletion: {
    enabled: boolean
    confirmation: {
      requirePassword: boolean
      requireAccountName: boolean
      confirmationText: string
    }
    gracePeriod: number
  }

  /** Resolved appearance settings */
  appearance: {
    className: string
    showIcons: boolean
    layout: 'tabs' | 'sidebar' | 'accordion'
  }

  /** Resolved text overrides with defaults */
  text: {
    titles: Record<AccountView, string>
    sections: Record<string, string>
    buttons: Record<string, string>
    labels: Record<string, string>
    messages: Record<string, string>
  }
}

/**
 * Account options context (simplified for auth provider)
 */
export interface AccountOptionsContext {
  /** Base path for account routes */
  basePath: string
  /** Fields to display in account management */
  fields: string[]
  /** View paths configuration */
  viewPaths: Record<AccountView, string>
}
