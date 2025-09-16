import type { KeyloomAdapter } from '@keyloom/core/adapter-types'

/**
 * Test helpers for adapter contract tests
 */

/**
 * Generate random email for testing
 */
export function randomEmail(): string {
  const timestamp = Date.now()
  const random = Math.random().toString(36).substring(2)
  return `test-${timestamp}-${random}@example.com`
}

/**
 * Generate random string
 */
export function randomString(length = 10): string {
  return Math.random().toString(36).substring(2, 2 + length)
}

/**
 * Generate random user data
 */
export function randomUser() {
  return {
    email: randomEmail(),
    name: `Test User ${randomString(5)}`,
    image: `https://example.com/avatar/${randomString(8)}.jpg`
  }
}

/**
 * Generate random organization data
 */
export function randomOrg() {
  const name = `Test Org ${randomString(5)}`
  return {
    name,
    slug: name.toLowerCase().replace(/\s+/g, '-')
  }
}

/**
 * Sleep utility for testing timing-sensitive operations
 */
export function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms))
}

/**
 * Get current timestamp
 */
export function now(): Date {
  return new Date()
}

/**
 * Get future timestamp
 */
export function futureDate(offsetMs = 60000): Date {
  return new Date(Date.now() + offsetMs)
}

/**
 * Get past timestamp
 */
export function pastDate(offsetMs = 60000): Date {
  return new Date(Date.now() - offsetMs)
}

/**
 * Test data cleanup utility
 */
export class TestDataManager {
  private adapter: KeyloomAdapter
  private createdUsers: string[] = []
  private createdOrgs: string[] = []
  private createdSessions: string[] = []

  constructor(adapter: KeyloomAdapter) {
    this.adapter = adapter
  }

  async createUser(data?: Partial<Parameters<KeyloomAdapter['createUser']>[0]>) {
    const userData = { ...randomUser(), ...data }
    const user = await this.adapter.createUser(userData)
    this.createdUsers.push(user.id)
    return user
  }

  async createOrg(data?: Partial<Parameters<KeyloomAdapter['createOrganization']>[0]>) {
    const orgData = { ...randomOrg(), ...data }
    const org = await this.adapter.createOrganization(orgData)
    this.createdOrgs.push(org.id)
    return org
  }

  async createSession(userId: string, expiresAt?: Date) {
    const session = await this.adapter.createSession({
      userId,
      expiresAt: expiresAt || futureDate()
    })
    this.createdSessions.push(session.id)
    return session
  }

  async cleanup() {
    // Clean up in reverse dependency order
    for (const sessionId of this.createdSessions) {
      try {
        await this.adapter.deleteSession(sessionId)
      } catch {
        // Ignore cleanup errors
      }
    }

    for (const orgId of this.createdOrgs) {
      try {
        // Note: This assumes we have a deleteOrganization method
        // If not available, we'll need to clean up manually
      } catch {
        // Ignore cleanup errors
      }
    }

    for (const userId of this.createdUsers) {
      try {
        // Note: This assumes we have a deleteUser method
        // If not available, users will be cleaned up by foreign key constraints
      } catch {
        // Ignore cleanup errors
      }
    }

    this.createdUsers = []
    this.createdOrgs = []
    this.createdSessions = []
  }
}

/**
 * Assertion helpers
 */
export function expectUser(user: any) {
  expect(user).toBeDefined()
  expect(user.id).toBeDefined()
  expect(typeof user.id).toBe('string')
  expect(user.createdAt).toBeInstanceOf(Date)
  expect(user.updatedAt).toBeInstanceOf(Date)
}

export function expectSession(session: any) {
  expect(session).toBeDefined()
  expect(session.id).toBeDefined()
  expect(typeof session.id).toBe('string')
  expect(session.userId).toBeDefined()
  expect(session.expiresAt).toBeInstanceOf(Date)
  expect(session.createdAt).toBeInstanceOf(Date)
}

export function expectAccount(account: any) {
  expect(account).toBeDefined()
  expect(account.id).toBeDefined()
  expect(account.userId).toBeDefined()
  expect(account.provider).toBeDefined()
  expect(account.providerAccountId).toBeDefined()
}

export function expectOrganization(org: any) {
  expect(org).toBeDefined()
  expect(org.id).toBeDefined()
  expect(org.name).toBeDefined()
  expect(org.createdAt).toBeInstanceOf(Date)
  expect(org.updatedAt).toBeInstanceOf(Date)
}

export function expectMembership(membership: any) {
  expect(membership).toBeDefined()
  expect(membership.id).toBeDefined()
  expect(membership.userId).toBeDefined()
  expect(membership.orgId).toBeDefined()
  expect(membership.role).toBeDefined()
  expect(membership.status).toBeDefined()
}

export function expectRefreshToken(token: any) {
  expect(token).toBeDefined()
  expect(token.familyId).toBeDefined()
  expect(token.jti).toBeDefined()
  expect(token.userId).toBeDefined()
  expect(token.tokenHash).toBeDefined()
  expect(token.expiresAt).toBeInstanceOf(Date)
}

/**
 * Error assertion helpers
 */
export function expectUniqueViolation(error: any) {
  expect(error.code).toBe('ADAPTER_UNIQUE_VIOLATION')
}

export function expectNotFound(result: any) {
  expect(result).toBeNull()
}

/**
 * Capability-aware test runner
 */
export function runIfCapable<T>(
  adapter: KeyloomAdapter,
  capability: keyof KeyloomAdapter['capabilities'],
  testFn: () => T
): T | void {
  if (adapter.capabilities[capability]) {
    return testFn()
  } else {
    console.log(`Skipping test - adapter does not support ${capability}`)
  }
}

/**
 * Transaction test helper
 */
export async function testWithTransaction<T>(
  adapter: KeyloomAdapter,
  testFn: () => Promise<T>
): Promise<T | void> {
  if (!adapter.capabilities.transactions) {
    console.log('Skipping transaction test - adapter does not support transactions')
    return
  }

  return testFn()
}

/**
 * Timing test helper
 */
export async function expectEventualConsistency<T>(
  testFn: () => Promise<T>,
  maxAttempts = 5,
  delayMs = 100
): Promise<T> {
  let lastError: unknown
  
  for (let i = 0; i < maxAttempts; i++) {
    try {
      return await testFn()
    } catch (error) {
      lastError = error
      if (i < maxAttempts - 1) {
        await sleep(delayMs)
      }
    }
  }
  
  throw lastError
}
