/**
 * Organization management UI configuration options.
 * These types define how organization-related components and flows should be configured.
 */

/**
 * Available organization management views/pages
 */
export type OrganizationView =
  | 'overview'
  | 'settings'
  | 'members'
  | 'roles'
  | 'invitations'
  | 'api-keys'
  | 'billing'
  | 'usage'
  | 'audit-log'
  | 'integrations'
  | 'security'
  | 'delete-organization'

/**
 * Organization role configuration
 */
export interface OrganizationRoleConfig {
  /** Role identifier */
  id: string
  /** Display name for the role */
  name: string
  /** Role description */
  description?: string
  /** Whether this is a system role (cannot be deleted) */
  system?: boolean
  /** Role permissions */
  permissions?: string[]
  /** Role color for UI display */
  color?: string
  /** Whether this role can be assigned by non-owners */
  assignableByNonOwners?: boolean
}

/**
 * Member invitation configuration
 */
export interface MemberInvitationConfig {
  /** Whether invitations are enabled @default true */
  enabled?: boolean
  /** Available invitation methods */
  methods?: Array<'email' | 'link'>
  /** Invitation expiration time in hours @default 168 (7 days) */
  expirationHours?: number
  /** Whether to require approval for invitations @default false */
  requireApproval?: boolean
  /** Maximum pending invitations @default 50 */
  maxPendingInvitations?: number
  /** Default role for new members */
  defaultRole?: string
  /** Whether to send welcome emails @default true */
  sendWelcomeEmail?: boolean
}

/**
 * Organization billing configuration
 */
export interface OrganizationBillingConfig {
  /** Whether billing features are enabled @default false */
  enabled?: boolean
  /** Available billing plans */
  plans?: Array<{
    id: string
    name: string
    description?: string
    price: number
    currency: string
    interval: 'month' | 'year'
    features: string[]
  }>
  /** Whether to show usage metrics @default true */
  showUsage?: boolean
  /** Whether to allow plan changes @default true */
  allowPlanChanges?: boolean
}

/**
 * Organization UI input options (what developers configure)
 */
export interface OrganizationUIOptions {
  /** Base path for organization routes @default "/org" */
  basePath?: string

  /** Custom view paths relative to basePath */
  viewPaths?: Partial<Record<OrganizationView, string>>

  /** Organization creation configuration */
  creation?: {
    /** Whether organization creation is enabled @default true */
    enabled?: boolean
    /** Required fields for organization creation */
    requiredFields?: Array<'name' | 'slug' | 'description' | 'website'>
    /** Whether to require unique slugs @default true */
    requireUniqueSlug?: boolean
    /** Slug validation pattern */
    slugPattern?: RegExp
    /** Maximum organizations per user @default 10 */
    maxOrganizationsPerUser?: number
  }

  /** Organization settings configuration */
  settings?: {
    /** Editable organization fields */
    editableFields?: Array<'name' | 'slug' | 'description' | 'website' | 'logo'>
    /** Logo upload configuration */
    logo?: {
      /** Whether logo upload is enabled @default true */
      enabled?: boolean
      /** Maximum file size in bytes @default 2MB */
      maxSize?: number
      /** Allowed file formats @default ['jpg', 'jpeg', 'png', 'svg'] */
      allowedFormats?: string[]
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
  }

  /** Member management configuration */
  members?: {
    /** Whether member management is enabled @default true */
    enabled?: boolean
    /** Maximum members per organization @default 100 */
    maxMembers?: number
    /** Whether to show member activity @default true */
    showActivity?: boolean
    /** Whether to show member roles @default true */
    showRoles?: boolean
    /** Whether members can leave the organization @default true */
    allowLeave?: boolean
    /** Whether to show member join dates @default true */
    showJoinDates?: boolean
  }

  /** Role management configuration */
  roles?: {
    /** Whether custom roles are enabled @default true */
    enabled?: boolean
    /** Available system roles */
    systemRoles?: OrganizationRoleConfig[]
    /** Maximum custom roles per organization @default 20 */
    maxCustomRoles?: number
    /** Available permissions for roles */
    availablePermissions?: Array<{
      id: string
      name: string
      description?: string
      category?: string
    }>
  }

  /** Member invitation configuration */
  invitations?: MemberInvitationConfig

  /** API key management configuration */
  apiKeys?: {
    /** Whether organization API keys are enabled @default true */
    enabled?: boolean
    /** Maximum API keys per organization @default 20 */
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
  }

  /** Billing configuration */
  billing?: OrganizationBillingConfig

  /** Usage and analytics configuration */
  usage?: {
    /** Whether usage tracking is enabled @default false */
    enabled?: boolean
    /** Available usage metrics */
    metrics?: Array<{
      id: string
      name: string
      description?: string
      unit?: string
    }>
    /** Whether to show historical data @default true */
    showHistory?: boolean
    /** Data retention period in days @default 90 */
    retentionDays?: number
  }

  /** Audit log configuration */
  auditLog?: {
    /** Whether audit logging is enabled @default false */
    enabled?: boolean
    /** Events to log */
    events?: string[]
    /** Whether to show user information @default true */
    showUserInfo?: boolean
    /** Whether to show IP addresses @default false */
    showIpAddresses?: boolean
    /** Log retention period in days @default 90 */
    retentionDays?: number
  }

  /** Security configuration */
  security?: {
    /** Whether to enforce 2FA for all members @default false */
    enforce2FA?: boolean
    /** Whether to require SSO @default false */
    requireSSO?: boolean
    /** Session timeout in minutes @default 480 (8 hours) */
    sessionTimeout?: number
    /** Whether to log security events @default true */
    logSecurityEvents?: boolean
  }

  /** Organization deletion configuration */
  deletion?: {
    /** Whether organization deletion is enabled @default true */
    enabled?: boolean
    /** Who can delete organizations */
    allowedRoles?: string[]
    /** Confirmation requirements */
    confirmation?: {
      /** Whether to require typing organization name @default true */
      requireOrganizationName?: boolean
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
    layout?: 'tabs' | 'sidebar' | 'cards'
    /** Whether to show organization switcher @default true */
    showSwitcher?: boolean
  }

  /** Custom text overrides */
  text?: {
    /** Custom page titles */
    titles?: Partial<Record<OrganizationView, string>>
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
 * Resolved organization UI context (after processing options with defaults)
 */
export interface OrganizationUIContext {
  /** Resolved base path for organization routes */
  basePath: string

  /** Resolved view paths with all defaults applied */
  viewPaths: Record<OrganizationView, string>

  /** Resolved organization creation configuration */
  creation: {
    enabled: boolean
    requiredFields: Array<'name' | 'slug' | 'description' | 'website'>
    requireUniqueSlug: boolean
    slugPattern: RegExp
    maxOrganizationsPerUser: number
  }

  /** Resolved organization settings configuration */
  settings: {
    editableFields: Array<'name' | 'slug' | 'description' | 'website' | 'logo'>
    logo: {
      enabled: boolean
      maxSize: number
      allowedFormats: string[]
      processing: {
        width: number
        height: number
        quality: number
      }
    }
  }

  /** Resolved member management configuration */
  members: {
    enabled: boolean
    maxMembers: number
    showActivity: boolean
    showRoles: boolean
    allowLeave: boolean
    showJoinDates: boolean
  }

  /** Resolved role management configuration */
  roles: {
    enabled: boolean
    systemRoles: OrganizationRoleConfig[]
    maxCustomRoles: number
    availablePermissions: Array<{
      id: string
      name: string
      description?: string
      category?: string
    }>
  }

  /** Resolved invitation configuration */
  invitations: Required<MemberInvitationConfig>

  /** Resolved API key configuration */
  apiKeys: {
    enabled: boolean
    maxKeys: number
    scopes: Array<{
      id: string
      name: string
      description: string
      default?: boolean
    }>
    showUsage: boolean
  }

  /** Resolved billing configuration */
  billing: Required<OrganizationBillingConfig>

  /** Resolved usage configuration */
  usage: {
    enabled: boolean
    metrics: Array<{
      id: string
      name: string
      description?: string
      unit?: string
    }>
    showHistory: boolean
    retentionDays: number
  }

  /** Resolved audit log configuration */
  auditLog: {
    enabled: boolean
    events: string[]
    showUserInfo: boolean
    showIpAddresses: boolean
    retentionDays: number
  }

  /** Resolved security configuration */
  security: {
    enforce2FA: boolean
    requireSSO: boolean
    sessionTimeout: number
    logSecurityEvents: boolean
  }

  /** Resolved deletion configuration */
  deletion: {
    enabled: boolean
    allowedRoles: string[]
    confirmation: {
      requireOrganizationName: boolean
      confirmationText: string
    }
    gracePeriod: number
  }

  /** Resolved appearance settings */
  appearance: {
    className: string
    showIcons: boolean
    layout: 'tabs' | 'sidebar' | 'cards'
    showSwitcher: boolean
  }

  /** Resolved text overrides with defaults */
  text: {
    titles: Record<OrganizationView, string>
    sections: Record<string, string>
    buttons: Record<string, string>
    labels: Record<string, string>
    messages: Record<string, string>
  }
}

/**
 * Organization options context (simplified for auth provider)
 */
export interface OrganizationOptionsContext {
  /** Base path for organization routes */
  basePath: string
  /** View paths configuration */
  viewPaths: Record<OrganizationView, string>
  /** Custom roles configuration */
  customRoles?: OrganizationRoleConfig[]
}
