/**
 * Tests for validation utility functions
 */

import { describe, it, expect } from 'vitest'
import {
  validateEmail,
  validatePassword,
  validateUsername,
  validateField,
  validateFields,
  areAllValid,
  getFirstError,
  getAllErrors,
} from './validation-utils'

describe('validateEmail', () => {
  it('should validate correct email addresses', () => {
    const validEmails = [
      'test@example.com',
      'user.name@domain.co.uk',
      'user+tag@example.org',
      'firstname-lastname@example.com',
    ]

    validEmails.forEach((email) => {
      const result = validateEmail(email)
      expect(result.valid).toBe(true)
    })
  })

  it('should reject invalid email addresses', () => {
    const invalidEmails = [
      '',
      'invalid',
      '@example.com',
      'user@',
      'user..name@example.com',
      'user@example',
      'user@.example.com',
    ]

    invalidEmails.forEach((email) => {
      const result = validateEmail(email)
      expect(result.valid).toBe(false)
      expect(result.error).toBeDefined()
    })
  })

  it('should handle plus addressing option', () => {
    const email = 'user+tag@example.com'

    const allowResult = validateEmail(email, { allowPlusAddressing: true })
    expect(allowResult.valid).toBe(true)

    const disallowResult = validateEmail(email, { allowPlusAddressing: false })
    expect(disallowResult.valid).toBe(false)
    expect(disallowResult.error).toContain('plus addressing')
  })

  it('should handle domain whitelist', () => {
    const email = 'user@example.com'

    const allowedResult = validateEmail(email, { allowedDomains: ['example.com'] })
    expect(allowedResult.valid).toBe(true)

    const blockedResult = validateEmail(email, { allowedDomains: ['other.com'] })
    expect(blockedResult.valid).toBe(false)
    expect(blockedResult.error).toContain('domain not allowed')
  })

  it('should handle domain blacklist', () => {
    const email = 'user@spam.com'

    const result = validateEmail(email, { blockedDomains: ['spam.com'] })
    expect(result.valid).toBe(false)
    expect(result.error).toContain('domain not allowed')
  })

  it('should return metadata for valid emails', () => {
    const result = validateEmail('user+tag@example.com')

    expect(result.valid).toBe(true)
    expect(result.metadata?.localPart).toBe('user+tag')
    expect(result.metadata?.domain).toBe('example.com')
    expect(result.metadata?.hasPlusAddressing).toBe(true)
  })
})

describe('validatePassword', () => {
  it('should validate strong passwords', () => {
    const strongPasswords = ['MySecure123!', 'Complex@Phrase456', 'Strong#Code789$']

    strongPasswords.forEach((password) => {
      const result = validatePassword(password)
      expect(result.valid).toBe(true)
      expect(result.metadata?.strength).toBeGreaterThan(60)
    })
  })

  it('should reject weak passwords', () => {
    const weakPasswords = ['password', '123456', 'abc', 'PASSWORD', 'password123']

    weakPasswords.forEach((password) => {
      const result = validatePassword(password)
      expect(result.valid).toBe(false)
      expect(result.error).toBeDefined()
    })
  })

  it('should enforce length requirements', () => {
    const shortResult = validatePassword('Ab1!', { minLength: 8 })
    expect(shortResult.valid).toBe(false)
    expect(shortResult.error).toContain('at least 8 characters')

    const longPassword = 'A'.repeat(200)
    const longResult = validatePassword(longPassword, { maxLength: 128 })
    expect(longResult.valid).toBe(false)
    expect(longResult.error).toContain('no more than 128 characters')
  })

  it('should enforce character requirements', () => {
    const noUpperResult = validatePassword('lowercase123!', { requireUppercase: true })
    expect(noUpperResult.valid).toBe(false)
    expect(noUpperResult.error).toContain('uppercase letter')

    const noLowerResult = validatePassword('UPPERCASE123!', { requireLowercase: true })
    expect(noLowerResult.valid).toBe(false)
    expect(noLowerResult.error).toContain('lowercase letter')

    const noNumberResult = validatePassword('Password!', { requireNumbers: true })
    expect(noNumberResult.valid).toBe(false)
    expect(noNumberResult.error).toContain('number')

    const noSymbolResult = validatePassword('Password123', { requireSymbols: true })
    expect(noSymbolResult.valid).toBe(false)
    expect(noSymbolResult.error).toContain('special character')
  })

  it('should detect forbidden patterns', () => {
    const repeatedResult = validatePassword('Aaaa1234!', {
      forbiddenPatterns: [/(.)\1{2,}/],
    })
    expect(repeatedResult.valid).toBe(false)
    expect(repeatedResult.error).toContain('forbidden pattern')
  })

  it('should detect common passwords', () => {
    const commonResult = validatePassword('Password123!', {
      forbiddenPasswords: ['password123'],
    })
    expect(commonResult.valid).toBe(false)
    expect(commonResult.error).toContain('too common')
  })

  it('should return strength metadata', () => {
    const result = validatePassword('VeryStrong123!@#')

    expect(result.valid).toBe(true)
    expect(result.metadata?.strength).toBeGreaterThan(0)
    expect(result.metadata?.strengthLevel).toBeDefined()
  })
})

describe('validateUsername', () => {
  it('should validate correct usernames', () => {
    const validUsernames = ['john_doe', 'user123', 'test-user', 'username']

    validUsernames.forEach((username) => {
      const result = validateUsername(username)
      expect(result.valid).toBe(true)
    })
  })

  it('should reject invalid usernames', () => {
    const invalidUsernames = [
      '',
      'ab', // too short
      'user@name', // invalid character
      'user name', // space
      '_username', // starts with underscore
      'username_', // ends with underscore
    ]

    invalidUsernames.forEach((username) => {
      const result = validateUsername(username)
      expect(result.valid).toBe(false)
      expect(result.error).toBeDefined()
    })
  })

  it('should enforce length requirements', () => {
    const shortResult = validateUsername('ab', { minLength: 3 })
    expect(shortResult.valid).toBe(false)
    expect(shortResult.error).toContain('at least 3 characters')

    const longUsername = 'a'.repeat(50)
    const longResult = validateUsername(longUsername, { maxLength: 20 })
    expect(longResult.valid).toBe(false)
    expect(longResult.error).toContain('no more than 20 characters')
  })

  it('should handle character restrictions', () => {
    const underscoreResult = validateUsername('user_name', { allowUnderscore: false })
    expect(underscoreResult.valid).toBe(false)
    expect(underscoreResult.error).toContain('invalid characters')

    const dashResult = validateUsername('user-name', { allowDash: false })
    expect(dashResult.valid).toBe(false)
    expect(dashResult.error).toContain('invalid characters')

    const numberResult = validateUsername('user123', { allowNumbers: false })
    expect(numberResult.valid).toBe(false)
    expect(numberResult.error).toContain('invalid characters')
  })

  it('should require letters when specified', () => {
    const result = validateUsername('123456', { requireLetters: true })
    expect(result.valid).toBe(false)
    expect(result.error).toContain('at least one letter')
  })

  it('should reject forbidden usernames', () => {
    const result = validateUsername('admin', { forbiddenUsernames: ['admin'] })
    expect(result.valid).toBe(false)
    expect(result.error).toContain('not available')
  })
})

describe('validateField', () => {
  it('should validate field with basic requirements', () => {
    const result = validateField(
      'test',
      {
        minLength: 3,
        maxLength: 10,
      },
      'username',
    )

    expect(result.valid).toBe(true)
  })

  it('should validate field with pattern', () => {
    const validResult = validateField(
      'abc123',
      {
        pattern: /^[a-z0-9]+$/,
      },
      'code',
    )
    expect(validResult.valid).toBe(true)

    const invalidResult = validateField(
      'ABC123',
      {
        pattern: /^[a-z0-9]+$/,
      },
      'code',
    )
    expect(invalidResult.valid).toBe(false)
    expect(invalidResult.error).toContain('format is invalid')
  })

  it('should validate field with custom validator', () => {
    const validResult = validateField(
      'allowed',
      {
        customValidator: (value) => (value === 'forbidden' ? 'Not allowed' : null),
      },
      'value',
    )
    expect(validResult.valid).toBe(true)

    const invalidResult = validateField(
      'forbidden',
      {
        customValidator: (value) => (value === 'forbidden' ? 'Not allowed' : null),
      },
      'value',
    )
    expect(invalidResult.valid).toBe(false)
    expect(invalidResult.error).toBe('Not allowed')
  })
})

describe('validateFields', () => {
  it('should validate multiple fields', () => {
    const results = validateFields({
      email: {
        value: 'user@example.com',
        validation: { pattern: /\S+@\S+\.\S+/ },
      },
      password: {
        value: 'password123',
        validation: { minLength: 8 },
      },
    })

    expect(results.email.valid).toBe(true)
    expect(results.password.valid).toBe(true)
  })

  it('should return errors for invalid fields', () => {
    const results = validateFields({
      email: {
        value: 'invalid-email',
        validation: { pattern: /\S+@\S+\.\S+/ },
      },
      password: {
        value: 'short',
        validation: { minLength: 8 },
      },
    })

    expect(results.email.valid).toBe(false)
    expect(results.password.valid).toBe(false)
  })
})

describe('utility functions', () => {
  it('should check if all results are valid', () => {
    const validResults = {
      field1: { valid: true },
      field2: { valid: true },
    }
    expect(areAllValid(validResults)).toBe(true)

    const invalidResults = {
      field1: { valid: true },
      field2: { valid: false, error: 'Error' },
    }
    expect(areAllValid(invalidResults)).toBe(false)
  })

  it('should get first error', () => {
    const results = {
      field1: { valid: true },
      field2: { valid: false, error: 'First error' },
      field3: { valid: false, error: 'Second error' },
    }

    expect(getFirstError(results)).toBe('First error')

    const validResults = {
      field1: { valid: true },
      field2: { valid: true },
    }
    expect(getFirstError(validResults)).toBeNull()
  })

  it('should get all errors', () => {
    const results = {
      field1: { valid: true },
      field2: { valid: false, error: 'First error' },
      field3: { valid: false, error: 'Second error' },
    }

    const errors = getAllErrors(results)
    expect(errors).toEqual(['First error', 'Second error'])

    const validResults = {
      field1: { valid: true },
      field2: { valid: true },
    }
    expect(getAllErrors(validResults)).toEqual([])
  })
})
