import { getKeyGenParams } from './header'
import type { Jwk, JwtAlg } from './types'

/**
 * Generate a new key pair for JWT signing
 */
export async function generateKeyPair(alg: JwtAlg): Promise<{
  kid: string
  publicJwk: Jwk
  privateJwk: Jwk
}> {
  // Generate key pair using WebCrypto
  const keyGenParams = getKeyGenParams(alg)
  const { publicKey, privateKey } = (await crypto.subtle.generateKey(
    keyGenParams,
    true, // extractable
    ['sign', 'verify'],
  )) as CryptoKeyPair

  // Export keys as JWK
  const publicJwk = await crypto.subtle.exportKey('jwk', publicKey)
  const privateJwk = await crypto.subtle.exportKey('jwk', privateKey)

  // Generate a unique key ID
  const kid = crypto.randomUUID()

  // Add metadata to JWKs
  const enrichedPublicJwk: Jwk = {
    ...publicJwk,
    kid,
    alg,
    use: 'sig',
  }

  const enrichedPrivateJwk: Jwk = {
    ...privateJwk,
    kid,
    alg,
    use: 'sig',
  }

  return {
    kid,
    publicJwk: enrichedPublicJwk,
    privateJwk: enrichedPrivateJwk,
  }
}

/**
 * Import a private key from JWK
 */
export async function importPrivateKey(jwk: JsonWebKey, alg: JwtAlg): Promise<CryptoKey> {
  const keyGenParams = getKeyGenParams(alg)

  return crypto.subtle.importKey(
    'jwk',
    jwk,
    keyGenParams,
    false, // not extractable for security
    ['sign'],
  )
}

/**
 * Import a public key from JWK
 */
export async function importPublicKey(jwk: JsonWebKey, alg: JwtAlg): Promise<CryptoKey> {
  const keyGenParams = getKeyGenParams(alg)

  return crypto.subtle.importKey(
    'jwk',
    jwk,
    keyGenParams,
    false, // not extractable
    ['verify'],
  )
}

/**
 * Create a public JWKS (JSON Web Key Set) from an array of public JWKs
 */
export function createPublicJwks(publicJwks: Jwk[]): {
  keys: Jwk[]
} {
  // Filter out private key components and ensure only public parts are included
  const publicKeys = publicJwks.map((jwk) => {
    const { d, p, q, dp, dq, qi, ...publicParts } = jwk
    return publicParts
  })

  return { keys: publicKeys }
}

/**
 * Validate a JWK structure
 */
export function validateJwk(jwk: Jwk, alg: JwtAlg): boolean {
  if (!jwk.kid || !jwk.kty) {
    return false
  }

  switch (alg) {
    case 'EdDSA':
      return jwk.kty === 'OKP' && jwk.crv === 'Ed25519' && !!jwk.x
    case 'ES256':
      return jwk.kty === 'EC' && jwk.crv === 'P-256' && !!jwk.x && !!jwk.y
    default:
      return false
  }
}

/**
 * Extract public JWK from private JWK
 */
export function extractPublicJwk(privateJwk: Jwk): Jwk {
  const { d, p, q, dp, dq, qi, ...publicParts } = privateJwk
  return publicParts
}

/**
 * Check if a JWK contains private key material
 */
export function isPrivateJwk(jwk: Jwk): boolean {
  // Check for common private key components
  return !!(jwk.d || jwk.p || jwk.q)
}

/**
 * Generate a key pair and return both crypto keys and JWKs
 */
export async function generateKeyPairWithKeys(alg: JwtAlg): Promise<{
  kid: string
  publicKey: CryptoKey
  privateKey: CryptoKey
  publicJwk: Jwk
  privateJwk: Jwk
}> {
  const { kid, publicJwk, privateJwk } = await generateKeyPair(alg)

  const publicKey = await importPublicKey(publicJwk, alg)
  const privateKey = await importPrivateKey(privateJwk, alg)

  return {
    kid,
    publicKey,
    privateKey,
    publicJwk,
    privateJwk,
  }
}
