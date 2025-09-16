/**
 * Base64URL encoding/decoding utilities for JWT
 * Follows RFC 7515 specification for base64url encoding
 */

export function base64urlEncode(data: string | Uint8Array): string {
  let bytes: Uint8Array

  if (typeof data === 'string') {
    bytes = new TextEncoder().encode(data)
  } else {
    bytes = data
  }

  return Buffer.from(bytes).toString('base64url')
}

export function base64urlDecode(encoded: string): Uint8Array {
  return new Uint8Array(Buffer.from(encoded, 'base64url'))
}

export function base64urlDecodeToString(encoded: string): string {
  return new TextDecoder().decode(base64urlDecode(encoded))
}

/**
 * Encode an object to base64url JSON
 */
export function encodeJsonToBase64url(obj: unknown): string {
  return base64urlEncode(JSON.stringify(obj))
}

/**
 * Decode base64url to JSON object
 */
export function decodeBase64urlToJson<T = unknown>(encoded: string): T {
  return JSON.parse(base64urlDecodeToString(encoded))
}
