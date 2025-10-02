"use client"

import { createContext, useMemo, useContext } from "react"
// Mock AuthClient type for now - will be replaced with actual import
interface AuthClient {
  useSession?: () => { data: any; isPending: boolean; error?: any }
  signIn?: {
    email?: (params: any) => Promise<any>
  }
  signUp?: {
    email?: (params: any) => Promise<any>
  }
  signOut?: (params?: any) => Promise<any>
  forgetPassword?: (params: any) => Promise<any>
  resetPassword?: (params: any) => Promise<any>
  verifyEmail?: (params: any) => Promise<any>
  sendVerificationEmail?: (params: any) => Promise<any>
  user?: {
    update?: (params: any) => Promise<any>
    changePassword?: (params: any) => Promise<any>
  }
  apiKey?: {
    delete?: (params: any) => Promise<any>
  }
  passkey?: {
    deletePasskey?: (params: any) => Promise<any>
  }
  [key: string]: any
}
import type {
  AuthUIOptions,
  AccountOptionsContext,
  OrganizationOptionsContext,
  AvatarOptions,
  CaptchaOptions,
  CredentialsOptions,
  DeleteUserOptions,
  GenericOAuthOptions,
  SignUpOptions,
  SocialOptions,
  AuthHooks,
  AuthMutators,
  LocalizationConfig,
  ViewPathsConfig,
  LinkComponent,
  RenderToast
} from "../types"

// Create context type for the provider
interface AuthUIProviderContextType {
  authClient: AuthClient
  basePath: string
  baseURL: string
  redirectTo: string
  changeEmail: boolean
  freshAge: number
  nameRequired: boolean
  avatar?: AvatarOptions | undefined
  account?: AccountOptionsContext | undefined
  organization?: OrganizationOptionsContext | undefined
  captcha?: CaptchaOptions | undefined
  credentials?: CredentialsOptions | undefined
  deleteUser?: DeleteUserOptions | undefined
  genericOAuth?: GenericOAuthOptions | undefined
  signUp?: SignUpOptions | undefined
  social?: SocialOptions | undefined
  hooks: AuthHooks
  mutators: AuthMutators
  localization: LocalizationConfig
  viewPaths: ViewPathsConfig
  toast?: RenderToast | undefined
  navigate: (href: string) => void
  replace: (href: string) => void
  Link: LinkComponent
}
import {
  ALL_ERROR_CODES
} from "../localization"

// Default implementations for framework-agnostic navigation
const DefaultLink: LinkComponent = ({ href, className, children, ...props }) => (
  <a className={className} href={href} {...props}>
    {children}
  </a>
)

const defaultNavigate = (href: string) => {
  window.location.href = href
}

const defaultReplace = (href: string) => {
  window.location.replace(href)
}

const defaultToast: RenderToast = ({ variant = "default", message }) => {
  // Simple console fallback if no toast library is available
  if (typeof window !== 'undefined') {
    console.log(`[${variant.toUpperCase()}] ${message}`)
  }
}

export const AuthUIProviderContext = createContext<AuthUIProviderContextType>(
  {} as unknown as AuthUIProviderContextType
)

export interface AuthUIProviderProps {
  children: React.ReactNode
  authClient: AuthClient
  Link?: LinkComponent
  navigate?: (href: string) => void
  replace?: (href: string) => void
  toast?: RenderToast
  // Auth options
  account?: boolean | any
  avatar?: boolean | AvatarOptions
  deleteUser?: boolean | DeleteUserOptions
  social?: boolean | SocialOptions
  genericOAuth?: boolean | GenericOAuthOptions
  basePath?: string
  baseURL?: string
  captcha?: CaptchaOptions
  redirectTo?: string
  credentials?: boolean | CredentialsOptions
  changeEmail?: boolean
  freshAge?: number
  hooks?: Partial<AuthHooks>
  mutators?: Partial<AuthMutators>
  localization?: LocalizationConfig
  nameRequired?: boolean
  organization?: boolean | any
  signUp?: boolean | SignUpOptions
  viewPaths?: ViewPathsConfig
}

export const AuthUIProvider = ({
  children,
  authClient: authClientProp,
  account: accountProp,
  avatar: avatarProp,
  deleteUser: deleteUserProp,
  social: socialProp,
  genericOAuth: genericOAuthProp,
  basePath = "/auth",
  baseURL = "",
  captcha,
  redirectTo = "/",
  credentials: credentialsProp,
  changeEmail = true,
  freshAge = 60 * 60 * 24,
  hooks: hooksProp,
  mutators: mutatorsProp,
  localization: localizationProp,
  nameRequired = true,
  organization: organizationProp,
  signUp: signUpProp = true,
  toast = defaultToast,
  viewPaths: viewPathsProp,
  navigate,
  replace,
  Link = DefaultLink,
  ...props
}: AuthUIProviderProps) => {
  const authClient = authClientProp as AuthClient

  // Simplified processing for now - will be enhanced later
  const avatar = avatarProp === true ? { extension: "png" as const, size: 128 } : avatarProp || undefined
  const account = accountProp === false ? undefined : {
    basePath: "/account",
    fields: ["image", "name"],
    viewPaths: {
      profile: "profile",
      security: "security",
      "api-keys": "api-keys",
      sessions: "sessions",
      billing: "billing",
      organizations: "organizations",
      "data-export": "data-export",
      "delete-account": "delete-account",
      preferences: "preferences"
    }
  }
  const organization = organizationProp === false ? undefined : {
    basePath: "/organization",
    viewPaths: {
      overview: "overview",
      members: "members",
      roles: "roles",
      invitations: "invitations",
      settings: "settings",
      security: "security",
      "api-keys": "api-keys",
      billing: "billing",
      usage: "usage",
      "audit-log": "audit-log",
      integrations: "integrations",
      "delete-organization": "delete-organization"
    }
  }
  const credentials = credentialsProp === false ? undefined : { enabled: true }
  const deleteUser = deleteUserProp === false ? undefined : { enabled: true }
  const social = socialProp === false ? undefined : { enabled: true }
  const genericOAuth = genericOAuthProp === false ? undefined : { enabled: true }
  const signUpOptions = signUpProp === false ? undefined : { enabled: true }

  // Simple view paths for now
  const viewPaths: ViewPathsConfig = {
    auth: {
      "sign-in": "sign-in",
      "sign-up": "sign-up",
      "forgot-password": "forgot-password",
      "reset-password": "reset-password",
      "verify-email": "verify-email",
      "magic-link": "magic-link",
      "two-factor-setup": "two-factor-setup",
      "two-factor-verify": "two-factor-verify",
      "accept-invitation": "accept-invitation"
    },
    account: account ? {
      profile: "profile",
      security: "security"
    } : undefined,
    organization: organization ? {
      overview: "overview",
      members: "members"
    } : undefined
  }

  // Process localization
  const localization = useMemo<LocalizationConfig>(() => {
    return {
      ...ALL_ERROR_CODES,
      ...localizationProp
    }
  }, [localizationProp])

  // Default mutators using authClient
  const defaultMutators = useMemo(() => {
    return {
      deleteApiKey: (params: any) => Promise.resolve(),
      deletePasskey: (params: any) => Promise.resolve(),
      updateProfile: (params: any) => Promise.resolve(),
      changePassword: (params: any) => Promise.resolve(),
      signIn: (params: any) => Promise.resolve(),
      signUp: (params: any) => Promise.resolve(),
      signOut: () => Promise.resolve(),
      forgotPassword: (params: any) => Promise.resolve(),
      resetPassword: (params: any) => Promise.resolve(),
      verifyEmail: (params: any) => Promise.resolve(),
      resendVerificationEmail: (params: any) => Promise.resolve()
    } as AuthMutators
  }, [authClient])

  // Default hooks using authClient
  const defaultHooks = useMemo(() => {
    return {
      useSession: authClient.useSession || (() => ({ data: null, isPending: false, error: null })),
      useListAccounts: () => ({ data: null, isPending: false, error: null }),
      useListApiKeys: () => ({ data: null, isPending: false, error: null }),
      useListPasskeys: () => ({ data: null, isPending: false, error: null }),
      useListOrganizations: () => ({ data: null, isPending: false, error: null }),
      useGetInvitation: () => ({ data: null, isPending: false, error: null })
    } as AuthHooks
  }, [authClient])

  // Merge custom hooks/mutators with defaults
  const hooks = useMemo(() => {
    return { ...defaultHooks, ...hooksProp }
  }, [defaultHooks, hooksProp])

  const mutators = useMemo(() => {
    return { ...defaultMutators, ...mutatorsProp }
  }, [defaultMutators, mutatorsProp])

  // Normalize paths (remove trailing slashes)
  const normalizedBaseURL = baseURL.endsWith("/") ? baseURL.slice(0, -1) : baseURL
  const normalizedBasePath = basePath.endsWith("/") ? basePath.slice(0, -1) : basePath

  const contextValue: AuthUIProviderContextType = {
    authClient,
    avatar,
    basePath: normalizedBasePath === "/" ? "" : normalizedBasePath,
    baseURL: normalizedBaseURL,
    captcha,
    redirectTo,
    changeEmail,
    credentials,
    deleteUser,
    freshAge,
    genericOAuth,
    hooks,
    mutators,
    localization,
    nameRequired,
    organization,
    account,
    signUp: signUpOptions,
    social,
    toast,
    navigate: navigate || defaultNavigate,
    replace: replace || navigate || defaultReplace,
    viewPaths,
    Link
  }

  return (
    <AuthUIProviderContext.Provider value={contextValue}>
      {children}
    </AuthUIProviderContext.Provider>
  )
}

export function useAuthUIContext(): AuthUIProviderContextType {
  const context = useContext(AuthUIProviderContext)
  if (!context) {
    throw new Error("useAuthUIContext must be used within an AuthUIProvider")
  }
  return context
}

