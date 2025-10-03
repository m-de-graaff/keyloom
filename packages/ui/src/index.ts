// Theme and UI components
export * as theme from "./theme/tokens";
export * from "./auth";
export * as components from "./components";
export * as primitives from "./primitives";
export * as org from "./org";
export * as rbac from "./rbac";
export * as icons from "./icons";

// Foundation modules (Phase 1) - export types explicitly to avoid conflicts
export type {
  // Auth types
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
  // Account types
  AccountView,
  AccountFieldConfig,
  ApiKeyConfig,
  SessionConfig,
  AccountUIOptions,
  AccountUIContext,
  AccountOptionsContext,
  // Organization types
  OrganizationView,
  OrganizationRoleConfig,
  MemberInvitationConfig,
  OrganizationBillingConfig,
  OrganizationUIOptions,
  OrganizationUIContext,
  OrganizationOptionsContext,
  // Gravatar types
  GravatarRating,
  GravatarDefault,
  GravatarFormat,
  GravatarUrlOptions,
  GravatarOptions,
  GravatarContext,
  GravatarImageInfo,
  // Theme types
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
  // Common types
  FieldValidation,
  BaseFieldConfig,
  // Utility types
  RequiredNonNullable,
  RequiredFields,
  OptionalFields,
  WithDefaults,
  // Union types
  AllUIViews,
  AllUIOptions,
  AllUIContexts,
  // Error types
  FetchError,
} from "./types";
export * from "./localization";
export * from "./lib";

// Legacy exports (to be removed in Phase 2)
export {
  AuthUIProvider,
  AuthUIProviderContext,
  useAuthUIContext,
} from "./lib/auth-ui-provider";
