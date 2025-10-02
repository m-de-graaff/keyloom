/**
 * Authentication UI configuration options.
 * These types define how authentication flows and components should be configured and displayed.
 */

/**
 * Available authentication views/pages
 */
export type AuthView =
  | 'sign-in'
  | 'sign-up'
  | 'forgot-password'
  | 'reset-password'
  | 'verify-email'
  | 'magic-link'
  | 'two-factor-setup'
  | 'two-factor-verify'
  | 'accept-invitation'

/**
 * OAuth provider configuration for UI display
 */
export interface OAuthProviderUIConfig {
  /** Provider identifier (e.g., 'google', 'github') */
  id: string
  /** Display name for the provider */
  name: string
  /** Icon component or icon name */
  icon?: string | any
  /** Custom button text override */
  buttonText?: string
  /** Whether this provider is enabled */
  enabled?: boolean
  /** Custom styling classes */
  className?: string
}

/**
 * Authentication form field configuration
 */
export interface AuthFieldConfig {
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
  /** Custom validation rules */
  validation?: {
    minLength?: number
    maxLength?: number
    pattern?: RegExp
    customValidator?: (value: string) => string | null
  }
}

/**
 * Authentication UI input options (what developers configure)
 */
export interface AuthUIOptions {
  /** Base path for authentication routes @default "/auth" */
  basePath?: string

  /** Custom view paths relative to basePath */
  viewPaths?: Partial<Record<AuthView, string>>

  /** Redirect URLs */
  redirects?: {
    /** Where to redirect after successful sign in @default "/" */
    afterSignIn?: string
    /** Where to redirect after successful sign up @default "/" */
    afterSignUp?: string
    /** Where to redirect after sign out @default "/auth/sign-in" */
    afterSignOut?: string
    /** Where to redirect if authentication is required @default "/auth/sign-in" */
    signInRequired?: string
  }

  /** OAuth providers configuration */
  providers?: {
    /** List of enabled OAuth providers */
    oauth?: OAuthProviderUIConfig[]
    /** Whether to show provider icons @default true */
    showIcons?: boolean
    /** Whether to show provider names @default true */
    showNames?: boolean
    /** Custom provider button styling */
    buttonStyle?: 'default' | 'outline' | 'ghost'
  }

  /** Form field configurations */
  fields?: {
    email?: AuthFieldConfig
    username?: AuthFieldConfig
    password?: AuthFieldConfig
    confirmPassword?: AuthFieldConfig
    firstName?: AuthFieldConfig
    lastName?: AuthFieldConfig
    displayName?: AuthFieldConfig
  }

  /** Feature toggles */
  features?: {
    /** Enable sign up functionality @default true */
    signUp?: boolean
    /** Enable forgot password functionality @default true */
    forgotPassword?: boolean
    /** Enable magic link authentication @default false */
    magicLink?: boolean
    /** Enable two-factor authentication @default false */
    twoFactor?: boolean
    /** Enable email verification @default true */
    emailVerification?: boolean
    /** Enable remember me option @default true */
    rememberMe?: boolean
  }

  /** UI customization */
  appearance?: {
    /** Application name/title */
    appName?: string
    /** Application logo URL or component */
    logo?: string | any
    /** Custom branding colors */
    colors?: {
      primary?: string
      secondary?: string
      accent?: string
    }
    /** Custom CSS classes */
    className?: string
    /** Whether to show Keyloom branding @default true */
    showBranding?: boolean
  }

  /** Terms and privacy links */
  legal?: {
    /** Terms of service URL */
    termsUrl?: string
    /** Privacy policy URL */
    privacyUrl?: string
    /** Whether to require acceptance @default false */
    requireAcceptance?: boolean
  }

  /** Custom text overrides */
  text?: {
    /** Custom page titles */
    titles?: Partial<Record<AuthView, string>>
    /** Custom button labels */
    buttons?: {
      signIn?: string
      signUp?: string
      forgotPassword?: string
      resetPassword?: string
      sendMagicLink?: string
      verifyEmail?: string
      resendVerification?: string
      backToSignIn?: string
    }
    /** Custom form labels */
    labels?: {
      email?: string
      username?: string
      password?: string
      confirmPassword?: string
      firstName?: string
      lastName?: string
      displayName?: string
      rememberMe?: string
    }
    /** Custom messages */
    messages?: {
      signInSuccess?: string
      signUpSuccess?: string
      passwordResetSent?: string
      emailVerificationSent?: string
      magicLinkSent?: string
    }
  }
}

/**
 * Resolved authentication UI context (after processing options with defaults)
 */
export interface AuthUIContext {
  /** Resolved base path for authentication routes */
  basePath: string

  /** Resolved view paths with all defaults applied */
  viewPaths: Record<AuthView, string>

  /** Resolved redirect URLs with defaults */
  redirects: {
    afterSignIn: string
    afterSignUp: string
    afterSignOut: string
    signInRequired: string
  }

  /** Resolved provider configuration */
  providers: {
    oauth: OAuthProviderUIConfig[]
    showIcons: boolean
    showNames: boolean
    buttonStyle: 'default' | 'outline' | 'ghost'
  }

  /** Resolved field configurations with defaults */
  fields: Record<string, Required<AuthFieldConfig>>

  /** Resolved feature flags with defaults */
  features: {
    signUp: boolean
    forgotPassword: boolean
    magicLink: boolean
    twoFactor: boolean
    emailVerification: boolean
    rememberMe: boolean
  }

  /** Resolved appearance settings */
  appearance: {
    appName: string
    logo?: string | any
    colors: {
      primary: string
      secondary: string
      accent: string
    }
    className: string
    showBranding: boolean
  }

  /** Resolved legal settings */
  legal: {
    termsUrl?: string
    privacyUrl?: string
    requireAcceptance: boolean
  }

  /** Resolved text overrides with defaults */
  text: {
    titles: Record<AuthView, string>
    buttons: Record<string, string>
    labels: Record<string, string>
    messages: Record<string, string>
  }
}

/**
 * Avatar/profile image options
 */
export interface AvatarOptions {
  /** Whether avatar upload is enabled */
  upload?: boolean
  /** Whether avatar deletion is enabled */
  delete?: boolean
  /** Image file extension (default: 'png') */
  extension?: 'png' | 'jpg' | 'jpeg' | 'webp'
  /** Avatar size in pixels (default: 128) */
  size?: number
}

/**
 * Captcha configuration options
 */
export interface CaptchaOptions {
  /** Captcha provider */
  provider?: 'google-recaptcha-v3' | 'hcaptcha' | 'turnstile'
  /** Site key for the captcha service */
  siteKey?: string
  /** Whether captcha is enabled */
  enabled?: boolean
}

/**
 * Credentials authentication options
 */
export interface CredentialsOptions {
  /** Whether credentials auth is enabled */
  enabled?: boolean
  /** Custom validation rules */
  validation?: {
    email?: boolean
    username?: boolean
    password?: {
      minLength?: number
      requireUppercase?: boolean
      requireLowercase?: boolean
      requireNumbers?: boolean
      requireSymbols?: boolean
    }
  }
}

/**
 * User deletion options
 */
export interface DeleteUserOptions {
  /** Whether user deletion is enabled */
  enabled?: boolean
  /** Confirmation text required */
  confirmationText?: string
  /** Custom warning message */
  warningMessage?: string
}

/**
 * Generic OAuth provider options
 */
export interface GenericOAuthOptions {
  /** Whether generic OAuth is enabled */
  enabled?: boolean
  /** Custom provider configurations */
  providers?: OAuthProviderUIConfig[]
}

/**
 * Sign up flow options
 */
export interface SignUpOptions {
  /** Whether sign up is enabled */
  enabled?: boolean
  /** Fields to collect during sign up */
  fields?: ('name' | 'username' | 'email' | 'password')[]
  /** Whether email verification is required */
  requireEmailVerification?: boolean
  /** Terms of service URL */
  termsOfServiceUrl?: string
  /** Privacy policy URL */
  privacyPolicyUrl?: string
}

/**
 * Social authentication options
 */
export interface SocialOptions {
  /** Whether social auth is enabled */
  enabled?: boolean
  /** Social provider configurations */
  providers?: OAuthProviderUIConfig[]
}

/**
 * Link component type for framework-agnostic navigation
 */
export interface LinkComponent {
  (props: {
    href: string
    className?: string
    children: React.ReactNode
    [key: string]: any
  }): React.ReactElement
}

/**
 * Toast notification renderer
 */
export interface RenderToast {
  (options: {
    variant?: 'default' | 'success' | 'error' | 'warning' | 'info'
    message: string
  }): void
}

/**
 * Localization configuration
 */
export interface LocalizationConfig {
  [key: string]: string
}

/**
 * View paths configuration
 */
export interface ViewPathsConfig {
  auth: Record<AuthView, string>
  account?: Record<string, string> | undefined
  organization?: Record<string, string> | undefined
}

/**
 * Authentication hooks interface
 */
export interface AuthHooks {
  useSession: () => { data: any; isPending: boolean; error?: any }
  useListAccounts?: () => { data: any; isPending: boolean; error?: any }
  useListApiKeys?: () => { data: any; isPending: boolean; error?: any }
  useListPasskeys?: () => { data: any; isPending: boolean; error?: any }
  useListOrganizations?: () => { data: any; isPending: boolean; error?: any }
  useGetInvitation?: () => { data: any; isPending: boolean; error?: any }
  useInvitation?: () => { data: any; isPending: boolean; error?: any }
}

/**
 * Authentication mutators interface
 */
export interface AuthMutators {
  signIn?: (params: any) => Promise<any>
  signUp?: (params: any) => Promise<any>
  signOut?: () => Promise<any>
  forgotPassword?: (params: any) => Promise<any>
  resetPassword?: (params: any) => Promise<any>
  verifyEmail?: (params: any) => Promise<any>
  resendVerificationEmail?: (params: any) => Promise<any>
  updateProfile?: (params: any) => Promise<any>
  changePassword?: (params: any) => Promise<any>
  deleteApiKey?: (params: any) => Promise<any>
  deletePasskey?: (params: any) => Promise<any>
}
