/**
 * Organization and RBAC (Role-Based Access Control) error codes.
 * These errors are used for organization management, member operations, and permission handling.
 */
export const ORGANIZATION_ERROR_CODES = {
  /** Organization not found */
  ORGANIZATION_NOT_FOUND: "organization not found",
  
  /** Organization creation failed */
  ORGANIZATION_CREATION_FAILED: "failed to create organization",
  
  /** Organization update failed */
  ORGANIZATION_UPDATE_FAILED: "failed to update organization",
  
  /** Organization deletion failed */
  ORGANIZATION_DELETION_FAILED: "failed to delete organization",
  
  /** Organization name is required */
  ORGANIZATION_NAME_REQUIRED: "organization name is required",
  
  /** Organization name is too short */
  ORGANIZATION_NAME_TOO_SHORT: "organization name too short",
  
  /** Organization name is too long */
  ORGANIZATION_NAME_TOO_LONG: "organization name too long",
  
  /** Organization name already exists */
  ORGANIZATION_NAME_EXISTS: "organization name already exists",
  
  /** Organization slug is invalid */
  ORGANIZATION_SLUG_INVALID: "invalid organization slug",
  
  /** Organization slug already exists */
  ORGANIZATION_SLUG_EXISTS: "organization slug already exists",
  
  /** Organization logo upload failed */
  ORGANIZATION_LOGO_UPLOAD_FAILED: "failed to upload organization logo",
  
  /** Organization logo is too large */
  ORGANIZATION_LOGO_TOO_LARGE: "organization logo too large",
  
  /** Organization logo format is invalid */
  ORGANIZATION_LOGO_INVALID_FORMAT: "invalid organization logo format",
  
  /** Member not found in organization */
  MEMBER_NOT_FOUND: "member not found",
  
  /** Member invitation failed */
  MEMBER_INVITATION_FAILED: "failed to invite member",
  
  /** Member invitation already exists */
  MEMBER_INVITATION_EXISTS: "member invitation already exists",
  
  /** Member invitation has expired */
  MEMBER_INVITATION_EXPIRED: "member invitation expired",
  
  /** Invalid member invitation token */
  INVALID_INVITATION_TOKEN: "invalid invitation token",
  
  /** Member addition failed */
  MEMBER_ADD_FAILED: "failed to add member",
  
  /** Member removal failed */
  MEMBER_REMOVE_FAILED: "failed to remove member",
  
  /** Member role update failed */
  MEMBER_ROLE_UPDATE_FAILED: "failed to update member role",
  
  /** Cannot remove last owner */
  CANNOT_REMOVE_LAST_OWNER: "cannot remove last owner",
  
  /** Cannot change own role */
  CANNOT_CHANGE_OWN_ROLE: "cannot change own role",
  
  /** Insufficient permissions */
  INSUFFICIENT_PERMISSIONS: "insufficient permissions",
  
  /** Role not found */
  ROLE_NOT_FOUND: "role not found",
  
  /** Role creation failed */
  ROLE_CREATION_FAILED: "failed to create role",
  
  /** Role update failed */
  ROLE_UPDATE_FAILED: "failed to update role",
  
  /** Role deletion failed */
  ROLE_DELETION_FAILED: "failed to delete role",
  
  /** Role name is required */
  ROLE_NAME_REQUIRED: "role name is required",
  
  /** Role name already exists */
  ROLE_NAME_EXISTS: "role name already exists",
  
  /** Cannot delete system role */
  CANNOT_DELETE_SYSTEM_ROLE: "cannot delete system role",
  
  /** Permission not found */
  PERMISSION_NOT_FOUND: "permission not found",
  
  /** Permission denied */
  PERMISSION_DENIED: "permission denied",
  
  /** Invalid permission scope */
  INVALID_PERMISSION_SCOPE: "invalid permission scope",
  
  /** API key creation failed for organization */
  ORG_API_KEY_CREATION_FAILED: "failed to create organization api key",
  
  /** API key deletion failed for organization */
  ORG_API_KEY_DELETION_FAILED: "failed to delete organization api key",
  
  /** Organization API key limit exceeded */
  ORG_API_KEY_LIMIT_EXCEEDED: "organization api key limit exceeded",
  
  /** Organization settings update failed */
  ORG_SETTINGS_UPDATE_FAILED: "failed to update organization settings",
  
  /** Organization billing update failed */
  ORG_BILLING_UPDATE_FAILED: "failed to update organization billing",
  
  /** Organization subscription required */
  ORG_SUBSCRIPTION_REQUIRED: "organization subscription required",
  
  /** Organization member limit exceeded */
  ORG_MEMBER_LIMIT_EXCEEDED: "organization member limit exceeded",
  
  /** Organization feature not available */
  ORG_FEATURE_NOT_AVAILABLE: "organization feature not available",
  
  /** Organization is suspended */
  ORGANIZATION_SUSPENDED: "organization is suspended",
  
  /** Organization transfer failed */
  ORGANIZATION_TRANSFER_FAILED: "failed to transfer organization",
  
  /** Cannot transfer to same owner */
  CANNOT_TRANSFER_TO_SAME_OWNER: "cannot transfer to same owner",
} as const

/**
 * Type for organization error code keys
 */
export type OrganizationErrorCode = keyof typeof ORGANIZATION_ERROR_CODES

/**
 * Type for organization error messages
 */
export type OrganizationErrorMessage = typeof ORGANIZATION_ERROR_CODES[OrganizationErrorCode]
