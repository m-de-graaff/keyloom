import { subtle } from '../util/subtle'

function toBase64Url(buf: ArrayBuffer): string {
  const bytes = new Uint8Array(buf)
  let binary = ''
  for (const b of bytes) binary += String.fromCharCode(b)
  const b64 = btoa(binary)
  return b64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '')
}

// Edge-safe HMAC-SHA-256 over the token using provided secret.
export async function tokenHash(token: string, secret: string): Promise<string> {
  const enc = new TextEncoder()
  const key = await subtle.importKey(
    'raw',
    enc.encode(secret) as BufferSource,
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  )
  const sig = await subtle.sign('HMAC', key, enc.encode(token) as BufferSource)
  return toBase64Url(sig)
}
