/**
 * Adapter contract tests
 * 
 * This package provides a comprehensive test suite that all Keyloom adapters
 * must pass to ensure consistent behavior across different database implementations.
 * 
 * Usage:
 * ```typescript
 * import { runAdapterContractTests } from '@keyloom/adapters/_contracts'
 * import { createMyAdapter } from './my-adapter'
 * 
 * runAdapterContractTests(() => createMyAdapter(testConfig))
 * ```
 */

import type { KeyloomAdapter } from '@keyloom/core/adapter-types'
import { createAdapterContractTests } from './adapter.contract.test'
import { createRbacContractTests } from './rbac.contract.test'
import { createRefreshContractTests } from './refresh.contract.test'

export * from './helpers'

/**
 * Run all contract tests for an adapter
 */
export function runAdapterContractTests(createAdapter: () => KeyloomAdapter) {
  createAdapterContractTests(createAdapter)
  createRbacContractTests(createAdapter)
  createRefreshContractTests(createAdapter)
}

/**
 * Run only core adapter tests (users, accounts, sessions, tokens, audit)
 */
export function runCoreAdapterTests(createAdapter: () => KeyloomAdapter) {
  createAdapterContractTests(createAdapter)
}

/**
 * Run only RBAC tests (organizations, memberships, invites, entitlements)
 */
export function runRbacTests(createAdapter: () => KeyloomAdapter) {
  createRbacContractTests(createAdapter)
}

/**
 * Run only refresh token tests (JWT refresh token management)
 */
export function runRefreshTokenTests(createAdapter: () => KeyloomAdapter) {
  createRefreshContractTests(createAdapter)
}

/**
 * Validate adapter capabilities
 */
export function validateAdapterCapabilities(adapter: KeyloomAdapter): {
  valid: boolean
  errors: string[]
} {
  const errors: string[] = []
  const capabilities = adapter.capabilities

  // Validate capability structure
  if (typeof capabilities.transactions !== 'boolean') {
    errors.push('capabilities.transactions must be a boolean')
  }

  if (typeof capabilities.json !== 'boolean' && capabilities.json !== 'limited') {
    errors.push('capabilities.json must be boolean or "limited"')
  }

  if (typeof capabilities.ttlIndex !== 'boolean') {
    errors.push('capabilities.ttlIndex must be a boolean')
  }

  if (!['citext', 'collation', 'app-normalize'].includes(capabilities.caseInsensitiveEmail)) {
    errors.push('capabilities.caseInsensitiveEmail must be "citext", "collation", or "app-normalize"')
  }

  if (typeof capabilities.upsert !== 'boolean') {
    errors.push('capabilities.upsert must be a boolean')
  }

  if (capabilities.maxIdentifierLength !== undefined && 
      (typeof capabilities.maxIdentifierLength !== 'number' || capabilities.maxIdentifierLength <= 0)) {
    errors.push('capabilities.maxIdentifierLength must be a positive number if specified')
  }

  return {
    valid: errors.length === 0,
    errors
  }
}

/**
 * Test adapter method availability
 */
export function validateAdapterMethods(adapter: KeyloomAdapter): {
  valid: boolean
  missing: string[]
  optional: string[]
} {
  const required = [
    // Core adapter methods
    'createUser', 'getUser', 'getUserByEmail', 'updateUser',
    'linkAccount', 'getAccountByProvider',
    'createSession', 'getSession', 'deleteSession',
    'createVerificationToken', 'useVerificationToken',
    'appendAudit',
    
    // RBAC methods
    'createOrganization', 'getOrganization', 'getOrganizationBySlug', 'updateOrganization',
    'getUserOrganizations', 'addMember', 'getMembership', 'updateMemberRole',
    'removeMember', 'getOrganizationMembers', 'createInvite', 'getInviteByToken',
    'acceptInvite', 'getOrganizationInvites', 'revokeInvite',
    'setEntitlement', 'getEntitlement',
    
    // Refresh token methods
    'save', 'findByHash', 'markRotated', 'revokeFamily', 'createChild',
    'cleanupExpired', 'isFamilyRevoked', 'getFamily'
  ]

  const optional = [
    'cleanup', 'healthCheck', 'close'
  ]

  const missing = required.filter(method => typeof (adapter as any)[method] !== 'function')
  const missingOptional = optional.filter(method => typeof (adapter as any)[method] !== 'function')

  return {
    valid: missing.length === 0,
    missing,
    optional: missingOptional
  }
}

/**
 * Comprehensive adapter validation
 */
export function validateAdapter(adapter: KeyloomAdapter): {
  valid: boolean
  capabilities: ReturnType<typeof validateAdapterCapabilities>
  methods: ReturnType<typeof validateAdapterMethods>
} {
  const capabilities = validateAdapterCapabilities(adapter)
  const methods = validateAdapterMethods(adapter)

  return {
    valid: capabilities.valid && methods.valid,
    capabilities,
    methods
  }
}

/**
 * Generate adapter test report
 */
export function generateAdapterReport(adapter: KeyloomAdapter): string {
  const validation = validateAdapter(adapter)
  
  let report = '# Adapter Validation Report\n\n'
  
  report += `**Overall Status:** ${validation.valid ? '✅ VALID' : '❌ INVALID'}\n\n`
  
  report += '## Capabilities\n\n'
  report += `- Transactions: ${adapter.capabilities.transactions ? '✅' : '❌'}\n`
  report += `- JSON Support: ${adapter.capabilities.json === true ? '✅ Full' : adapter.capabilities.json === 'limited' ? '⚠️ Limited' : '❌ None'}\n`
  report += `- TTL Index: ${adapter.capabilities.ttlIndex ? '✅' : '❌'}\n`
  report += `- Case Insensitive Email: ${adapter.capabilities.caseInsensitiveEmail}\n`
  report += `- Upsert Support: ${adapter.capabilities.upsert ? '✅' : '❌'}\n`
  
  if (adapter.capabilities.maxIdentifierLength) {
    report += `- Max Identifier Length: ${adapter.capabilities.maxIdentifierLength}\n`
  }
  
  if (validation.capabilities.errors.length > 0) {
    report += '\n**Capability Errors:**\n'
    validation.capabilities.errors.forEach(error => {
      report += `- ❌ ${error}\n`
    })
  }
  
  report += '\n## Methods\n\n'
  
  if (validation.methods.missing.length > 0) {
    report += '**Missing Required Methods:**\n'
    validation.methods.missing.forEach(method => {
      report += `- ❌ ${method}\n`
    })
    report += '\n'
  }
  
  if (validation.methods.optional.length > 0) {
    report += '**Missing Optional Methods:**\n'
    validation.methods.optional.forEach(method => {
      report += `- ⚠️ ${method}\n`
    })
    report += '\n'
  }
  
  if (validation.methods.missing.length === 0) {
    report += '✅ All required methods implemented\n\n'
  }
  
  // Optional features
  report += '## Optional Features\n\n'
  report += `- Health Check: ${adapter.healthCheck ? '✅' : '❌'}\n`
  report += `- Cleanup: ${adapter.cleanup ? '✅' : '❌'}\n`
  report += `- Connection Close: ${adapter.close ? '✅' : '❌'}\n`
  
  return report
}
