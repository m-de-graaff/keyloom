import { encodeJsonToBase64url } from './base64url'
import { getWebCryptoAlgorithm } from './header'
import type { Jwk, JwtClaims, JwtHeader } from './types'

/**
 * Sign a JWT using WebCrypto with Ed25519 or ES256
 */
export async function signJwt(
  header: JwtHeader,
  claims: JwtClaims,
  privateKey: CryptoKey,
): Promise<string> {
  // Encode header and payload
  const encodedHeader = encodeJsonToBase64url(header)
  const encodedPayload = encodeJsonToBase64url(claims)

  // Create the signing input
  const signingInput = `${encodedHeader}.${encodedPayload}`
  const signingInputBytes = new TextEncoder().encode(signingInput)

  // Get the appropriate algorithm for signing
  const algorithm = getWebCryptoAlgorithm(header.alg)

  // Sign the data
  const signatureBuffer = await crypto.subtle.sign(algorithm, privateKey, signingInputBytes)

  // Encode signature as base64url
  const signature = Buffer.from(signatureBuffer).toString('base64url')

  // Return the complete JWT
  return `${signingInput}.${signature}`
}

/**
 * Create a JWT signer for a specific key pair
 */
export function createJwtSigner(
  privateKey: CryptoKey,
  publicKey: CryptoKey,
  kid: string,
  alg: 'EdDSA' | 'ES256',
) {
  return {
    /**
     * Sign JWT claims with this key
     */
    async sign(claims: JwtClaims): Promise<string> {
      const header: JwtHeader = { alg, kid, typ: 'JWT' }
      return signJwt(header, claims, privateKey)
    },

    /**
     * Get the key ID
     */
    getKid(): string {
      return kid
    },

    /**
     * Get the algorithm
     */
    getAlgorithm(): 'EdDSA' | 'ES256' {
      return alg
    },

    /**
     * Export the public key as JWK
     */
    async exportPublicJwk(): Promise<Jwk> {
      const jwk = await crypto.subtle.exportKey('jwk', publicKey)
      return {
        ...jwk,
        kid,
        alg,
        use: 'sig',
      }
    },

    /**
     * Export the private key as JWK (for keystore persistence)
     */
    async exportPrivateJwk(): Promise<Jwk> {
      const jwk = await crypto.subtle.exportKey('jwk', privateKey)
      return {
        ...jwk,
        kid,
        alg,
        use: 'sig',
      }
    },
  }
}

/**
 * Sign a JWT with automatic header creation
 */
export async function signJwtWithKey(
  claims: JwtClaims,
  privateKey: CryptoKey,
  kid: string,
  alg: 'EdDSA' | 'ES256',
): Promise<string> {
  const header: JwtHeader = { alg, kid, typ: 'JWT' }
  return signJwt(header, claims, privateKey)
}
