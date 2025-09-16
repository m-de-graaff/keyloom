import { promises as fs } from 'node:fs'
import { join } from 'node:path'
import {
  createDefaultRotationPolicy,
  createKeystore,
  type JwtAlg,
  type Keystore,
  needsRotation,
  type RotationPolicy,
  rotateKeystore,
  validateKeystore,
} from '@keyloom/core/jwt'

/**
 * Server-side keystore manager for JWT signing keys
 */
export class KeystoreManager {
  private keystore: Keystore | null = null
  private keystorePath: string | null = null
  private rotationPolicy: RotationPolicy
  private alg: JwtAlg

  constructor(keystorePath: string | null, alg: JwtAlg = 'EdDSA', rotationPolicy?: RotationPolicy) {
    this.keystorePath = keystorePath
    this.alg = alg
    this.rotationPolicy = rotationPolicy || createDefaultRotationPolicy()
  }

  /**
   * Initialize the keystore - load from disk or create new
   */
  async initialize(): Promise<void> {
    if (this.keystorePath) {
      try {
        await this.loadFromDisk()
      } catch (error) {
        console.warn(`Failed to load keystore from ${this.keystorePath}, creating new one:`, error)
        await this.createNew()
      }
    } else {
      // No persistence - create in-memory keystore
      await this.createNew()
    }

    // Check if rotation is needed
    if (this.keystore && needsRotation(this.keystore, this.rotationPolicy)) {
      console.log('Keystore rotation needed, rotating keys...')
      await this.rotate()
    }
  }

  /**
   * Get the current keystore
   */
  getKeystore(): Keystore {
    if (!this.keystore) {
      throw new Error('Keystore not initialized. Call initialize() first.')
    }
    return this.keystore
  }

  /**
   * Get the active signing key
   */
  getActiveKey(): {
    kid: string
    privateJwk: JsonWebKey
    publicJwk: JsonWebKey
  } {
    const keystore = this.getKeystore()
    return keystore.active
  }

  /**
   * Rotate the keystore keys
   */
  async rotate(): Promise<void> {
    if (!this.keystore) {
      throw new Error('Keystore not initialized')
    }

    console.log('Rotating keystore keys...')
    this.keystore = await rotateKeystore(this.keystore, this.alg, this.rotationPolicy)

    if (this.keystorePath) {
      await this.saveToDisk()
    }

    console.log(`Keystore rotated. New active key: ${this.keystore.active.kid}`)
  }

  /**
   * Force rotation (for testing or manual rotation)
   */
  async forceRotate(): Promise<void> {
    await this.rotate()
  }

  /**
   * Check if rotation is needed
   */
  needsRotation(): boolean {
    if (!this.keystore) return false
    return needsRotation(this.keystore, this.rotationPolicy)
  }

  /**
   * Get rotation policy
   */
  getRotationPolicy(): RotationPolicy {
    return this.rotationPolicy
  }

  /**
   * Update rotation policy
   */
  setRotationPolicy(policy: RotationPolicy): void {
    this.rotationPolicy = policy
  }

  /**
   * Create a new keystore
   */
  private async createNew(): Promise<void> {
    console.log('Creating new keystore...')
    this.keystore = await createKeystore(this.alg)

    if (this.keystorePath) {
      await this.saveToDisk()
    }

    console.log(`New keystore created with active key: ${this.keystore.active.kid}`)
  }

  /**
   * Load keystore from disk
   */
  private async loadFromDisk(): Promise<void> {
    if (!this.keystorePath) {
      throw new Error('No keystore path configured')
    }

    console.log(`Loading keystore from ${this.keystorePath}`)
    const data = await fs.readFile(this.keystorePath, 'utf-8')
    const parsed = JSON.parse(data)

    if (!validateKeystore(parsed)) {
      throw new Error('Invalid keystore format')
    }

    this.keystore = parsed
    console.log(`Keystore loaded with active key: ${this.keystore.active.kid}`)
  }

  /**
   * Save keystore to disk
   */
  private async saveToDisk(): Promise<void> {
    if (!this.keystorePath || !this.keystore) {
      return
    }

    // Ensure directory exists
    const dir = join(this.keystorePath, '..')
    await fs.mkdir(dir, { recursive: true })

    // Write keystore with proper formatting
    const data = JSON.stringify(this.keystore, null, 2)
    await fs.writeFile(this.keystorePath, data, 'utf-8')

    console.log(`Keystore saved to ${this.keystorePath}`)
  }

  /**
   * Get keystore statistics
   */
  getStats(): {
    activeKeyId: string
    activeKeyAge: number
    previousKeysCount: number
    needsRotation: boolean
    rotationPolicy: RotationPolicy
  } {
    const keystore = this.getKeystore()
    const activeCreatedAt = new Date(keystore.active.createdAt)
    const activeKeyAge = Math.floor(
      (Date.now() - activeCreatedAt.getTime()) / (1000 * 60 * 60 * 24),
    )

    return {
      activeKeyId: keystore.active.kid,
      activeKeyAge,
      previousKeysCount: keystore.previous.length,
      needsRotation: this.needsRotation(),
      rotationPolicy: this.rotationPolicy,
    }
  }
}

/**
 * Create a keystore manager from environment configuration
 */
export function createKeystoreManager(config: {
  jwksPath?: string
  alg?: JwtAlg
  rotationDays?: number
  overlapDays?: number
}): KeystoreManager {
  const rotationPolicy: RotationPolicy = {
    rotationDays: config.rotationDays || 90,
    overlapDays: config.overlapDays || 7,
  }

  return new KeystoreManager(config.jwksPath || null, config.alg || 'EdDSA', rotationPolicy)
}

/**
 * Global keystore manager instance (singleton pattern for server)
 */
let globalKeystoreManager: KeystoreManager | null = null

/**
 * Get or create the global keystore manager
 */
export function getKeystoreManager(config?: {
  jwksPath?: string
  alg?: JwtAlg
  rotationDays?: number
  overlapDays?: number
}): KeystoreManager {
  if (!globalKeystoreManager && config) {
    globalKeystoreManager = createKeystoreManager(config)
  }

  if (!globalKeystoreManager) {
    throw new Error('Keystore manager not initialized. Provide config on first call.')
  }

  return globalKeystoreManager
}

/**
 * Initialize the global keystore manager
 */
export async function initializeGlobalKeystore(config: {
  jwksPath?: string
  alg?: JwtAlg
  rotationDays?: number
  overlapDays?: number
}): Promise<KeystoreManager> {
  const manager = getKeystoreManager(config)
  await manager.initialize()
  return manager
}
