/**
 * Tests for view path utility functions
 */

import { describe, it, expect } from 'vitest'
import {
  DEFAULT_AUTH_PATHS,
  DEFAULT_ACCOUNT_PATHS,
  DEFAULT_ORGANIZATION_PATHS,
  DEFAULT_BASE_PATHS,
  createAuthViewPaths,
  createAccountViewPaths,
  createOrganizationViewPaths,
  createViewPathsConfig,
  buildViewPath,
  extractViewPath,
  isValidViewPath,
  toKebabCase,
  getAvailableViewPaths,
} from './view-paths'

describe('default paths', () => {
  it('should have correct default auth paths', () => {
    expect(DEFAULT_AUTH_PATHS['sign-in']).toBe('sign-in')
    expect(DEFAULT_AUTH_PATHS['sign-up']).toBe('sign-up')
    expect(DEFAULT_AUTH_PATHS['forgot-password']).toBe('forgot-password')
    expect(DEFAULT_AUTH_PATHS['two-factor-setup']).toBe('two-factor-setup')
  })

  it('should have correct default account paths', () => {
    expect(DEFAULT_ACCOUNT_PATHS.profile).toBe('profile')
    expect(DEFAULT_ACCOUNT_PATHS.security).toBe('security')
    expect(DEFAULT_ACCOUNT_PATHS['api-keys']).toBe('api-keys')
    expect(DEFAULT_ACCOUNT_PATHS.organizations).toBe('organizations')
  })

  it('should have correct default organization paths', () => {
    expect(DEFAULT_ORGANIZATION_PATHS.overview).toBe('overview')
    expect(DEFAULT_ORGANIZATION_PATHS.settings).toBe('settings')
    expect(DEFAULT_ORGANIZATION_PATHS.members).toBe('members')
    expect(DEFAULT_ORGANIZATION_PATHS['audit-log']).toBe('audit-log')
  })

  it('should have correct default base paths', () => {
    expect(DEFAULT_BASE_PATHS.auth).toBe('/auth')
    expect(DEFAULT_BASE_PATHS.account).toBe('/account')
    expect(DEFAULT_BASE_PATHS.organization).toBe('/org')
  })
})

describe('createAuthViewPaths', () => {
  it('should create auth view paths with defaults', () => {
    const paths = createAuthViewPaths()
    
    expect(paths.basePath).toBe('/auth')
    expect(paths.views['sign-in']).toBe('sign-in')
    expect(paths.views['sign-up']).toBe('sign-up')
  })

  it('should create auth view paths with custom base path', () => {
    const paths = createAuthViewPaths('/authentication')
    
    expect(paths.basePath).toBe('/authentication')
    expect(paths.views['sign-in']).toBe('sign-in')
  })

  it('should create auth view paths with overrides', () => {
    const paths = createAuthViewPaths('/auth', {
      'sign-in': 'login',
      'sign-up': 'register',
    })
    
    expect(paths.basePath).toBe('/auth')
    expect(paths.views['sign-in']).toBe('login')
    expect(paths.views['sign-up']).toBe('register')
    expect(paths.views['forgot-password']).toBe('forgot-password') // unchanged
  })

  it('should normalize base path with leading slash', () => {
    const paths = createAuthViewPaths('auth')
    expect(paths.basePath).toBe('/auth')
  })
})

describe('createAccountViewPaths', () => {
  it('should create account view paths with defaults', () => {
    const paths = createAccountViewPaths()
    
    expect(paths.basePath).toBe('/account')
    expect(paths.views.profile).toBe('profile')
    expect(paths.views.security).toBe('security')
  })

  it('should create account view paths with overrides', () => {
    const paths = createAccountViewPaths('/account', {
      'api-keys': 'keys',
      'data-export': 'export',
    })
    
    expect(paths.views['api-keys']).toBe('keys')
    expect(paths.views['data-export']).toBe('export')
    expect(paths.views.profile).toBe('profile') // unchanged
  })
})

describe('createOrganizationViewPaths', () => {
  it('should create organization view paths with defaults', () => {
    const paths = createOrganizationViewPaths()
    
    expect(paths.basePath).toBe('/org')
    expect(paths.views.overview).toBe('overview')
    expect(paths.views.members).toBe('members')
  })

  it('should create organization view paths with overrides', () => {
    const paths = createOrganizationViewPaths('/organization', {
      'audit-log': 'logs',
      'delete-organization': 'delete',
    })
    
    expect(paths.basePath).toBe('/organization')
    expect(paths.views['audit-log']).toBe('logs')
    expect(paths.views['delete-organization']).toBe('delete')
  })
})

describe('createViewPathsConfig', () => {
  it('should create complete view paths config with defaults', () => {
    const config = createViewPathsConfig()
    
    expect(config.auth.basePath).toBe('/auth')
    expect(config.account.basePath).toBe('/account')
    expect(config.organization.basePath).toBe('/org')
  })

  it('should create view paths config with custom settings', () => {
    const config = createViewPathsConfig({
      auth: {
        basePath: '/authentication',
        overrides: { 'sign-in': 'login' },
      },
      account: {
        basePath: '/profile',
        overrides: { 'api-keys': 'keys' },
      },
      organization: {
        basePath: '/orgs',
        overrides: { members: 'team' },
      },
    })
    
    expect(config.auth.basePath).toBe('/authentication')
    expect(config.auth.views['sign-in']).toBe('login')
    expect(config.account.basePath).toBe('/profile')
    expect(config.account.views['api-keys']).toBe('keys')
    expect(config.organization.basePath).toBe('/orgs')
    expect(config.organization.views.members).toBe('team')
  })
})

describe('buildViewPath', () => {
  it('should build complete view paths', () => {
    expect(buildViewPath('/auth', 'sign-in')).toBe('/auth/sign-in')
    expect(buildViewPath('/account', 'profile')).toBe('/account/profile')
    expect(buildViewPath('/org', 'members')).toBe('/org/members')
  })

  it('should handle paths without leading slashes', () => {
    expect(buildViewPath('auth', 'sign-in')).toBe('/auth/sign-in')
    expect(buildViewPath('/auth', '/sign-in')).toBe('/auth/sign-in')
  })

  it('should normalize multiple slashes', () => {
    expect(buildViewPath('/auth/', '/sign-in')).toBe('/auth/sign-in')
    expect(buildViewPath('//auth//', '//sign-in//')).toBe('/auth/sign-in')
  })
})

describe('extractViewPath', () => {
  it('should extract view path from full path', () => {
    expect(extractViewPath('/auth/sign-in', '/auth')).toBe('sign-in')
    expect(extractViewPath('/account/profile', '/account')).toBe('profile')
    expect(extractViewPath('/org/members', '/org')).toBe('members')
  })

  it('should handle paths without base path', () => {
    expect(extractViewPath('/sign-in', '/auth')).toBe('sign-in')
    expect(extractViewPath('profile', '/account')).toBe('profile')
  })

  it('should handle paths with leading slashes', () => {
    expect(extractViewPath('auth/sign-in', 'auth')).toBe('sign-in')
    expect(extractViewPath('/auth/sign-in', 'auth')).toBe('sign-in')
  })
})

describe('isValidViewPath', () => {
  it('should validate correct kebab-case paths', () => {
    const validPaths = [
      'sign-in',
      'sign-up',
      'forgot-password',
      'two-factor-setup',
      'api-keys',
      'audit-log',
      'profile',
      'settings',
      'test123',
      'item-1',
    ]

    validPaths.forEach(path => {
      expect(isValidViewPath(path)).toBe(true)
    })
  })

  it('should reject invalid paths', () => {
    const invalidPaths = [
      'signIn', // camelCase
      'sign_up', // snake_case
      'Sign-In', // PascalCase
      'SIGN-IN', // UPPERCASE
      'sign-', // trailing hyphen
      '-sign', // leading hyphen
      'sign--in', // double hyphen
      'sign in', // space
      'sign@in', // special character
      '', // empty
    ]

    invalidPaths.forEach(path => {
      expect(isValidViewPath(path)).toBe(false)
    })
  })
})

describe('toKebabCase', () => {
  it('should convert camelCase to kebab-case', () => {
    expect(toKebabCase('signIn')).toBe('sign-in')
    expect(toKebabCase('forgotPassword')).toBe('forgot-password')
    expect(toKebabCase('twoFactorSetup')).toBe('two-factor-setup')
  })

  it('should convert PascalCase to kebab-case', () => {
    expect(toKebabCase('SignIn')).toBe('sign-in')
    expect(toKebabCase('ForgotPassword')).toBe('forgot-password')
  })

  it('should convert snake_case to kebab-case', () => {
    expect(toKebabCase('sign_in')).toBe('sign-in')
    expect(toKebabCase('forgot_password')).toBe('forgot-password')
    expect(toKebabCase('API_KEYS')).toBe('api-keys')
  })

  it('should convert spaces to kebab-case', () => {
    expect(toKebabCase('Sign In')).toBe('sign-in')
    expect(toKebabCase('Forgot Password')).toBe('forgot-password')
    expect(toKebabCase('Two Factor Setup')).toBe('two-factor-setup')
  })

  it('should handle mixed formats', () => {
    expect(toKebabCase('signIn_Form Page')).toBe('sign-in-form-page')
    expect(toKebabCase('API_Key Management')).toBe('api-key-management')
  })

  it('should remove invalid characters', () => {
    expect(toKebabCase('sign@in')).toBe('sign-in')
    expect(toKebabCase('sign#in')).toBe('sign-in')
    expect(toKebabCase('sign$in')).toBe('sign-in')
  })

  it('should handle edge cases', () => {
    expect(toKebabCase('')).toBe('')
    expect(toKebabCase('a')).toBe('a')
    expect(toKebabCase('A')).toBe('a')
    expect(toKebabCase('---')).toBe('')
    expect(toKebabCase('123')).toBe('123')
  })
})

describe('getAvailableViewPaths', () => {
  it('should return auth view paths', () => {
    const paths = getAvailableViewPaths('auth')
    
    expect(paths).toContain('sign-in')
    expect(paths).toContain('sign-up')
    expect(paths).toContain('forgot-password')
    expect(paths.length).toBeGreaterThan(5)
  })

  it('should return account view paths', () => {
    const paths = getAvailableViewPaths('account')
    
    expect(paths).toContain('profile')
    expect(paths).toContain('security')
    expect(paths).toContain('api-keys')
    expect(paths.length).toBeGreaterThan(5)
  })

  it('should return organization view paths', () => {
    const paths = getAvailableViewPaths('organization')
    
    expect(paths).toContain('overview')
    expect(paths).toContain('settings')
    expect(paths).toContain('members')
    expect(paths.length).toBeGreaterThan(5)
  })

  it('should return empty array for invalid section', () => {
    const paths = getAvailableViewPaths('invalid' as any)
    expect(paths).toEqual([])
  })
})
