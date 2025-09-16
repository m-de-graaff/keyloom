import type { JwtAlg, JwtHeader } from './types'

/**
 * Create a JWT header with the specified algorithm and key ID
 */
export function createJwtHeader(alg: JwtAlg, kid: string): JwtHeader {
  return {
    alg,
    kid,
    typ: 'JWT'
  }
}

/**
 * Validate a JWT header
 */
export function validateJwtHeader(header: unknown): header is JwtHeader {
  if (!header || typeof header !== 'object') {
    return false
  }

  const h = header as Record<string, unknown>
  
  return (
    typeof h.alg === 'string' &&
    (h.alg === 'EdDSA' || h.alg === 'ES256') &&
    typeof h.kid === 'string' &&
    h.typ === 'JWT'
  )
}

/**
 * Get the WebCrypto algorithm parameters for a JWT algorithm
 */
export function getWebCryptoAlgorithm(alg: JwtAlg): AlgorithmIdentifier {
  switch (alg) {
    case 'EdDSA':
      return { name: 'Ed25519' }
    case 'ES256':
      return { name: 'ECDSA', hash: 'SHA-256' }
    default:
      throw new Error(`Unsupported JWT algorithm: ${alg}`)
  }
}

/**
 * Get the key generation parameters for a JWT algorithm
 */
export function getKeyGenParams(alg: JwtAlg): RsaHashedKeyGenParams | EcKeyGenParams | { name: string } {
  switch (alg) {
    case 'EdDSA':
      return { name: 'Ed25519' }
    case 'ES256':
      return { name: 'ECDSA', namedCurve: 'P-256' }
    default:
      throw new Error(`Unsupported JWT algorithm: ${alg}`)
  }
}
