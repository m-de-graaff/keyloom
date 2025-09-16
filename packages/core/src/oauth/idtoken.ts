function b64urlToString(b64url: string): string {
  // Add padding if missing
  const pad = b64url.length % 4
  const b64 = (pad ? b64url + '='.repeat(4 - pad) : b64url).replace(/-/g, '+').replace(/_/g, '/')
  if (typeof Buffer !== 'undefined') {
    return Buffer.from(b64, 'base64').toString('utf8')
  }
  // Browser fallback
  const binary = atob(b64)
  let s = ''
  for (let i = 0; i < binary.length; i++) s += String.fromCharCode(binary.charCodeAt(i))
  return decodeURIComponent(escape(s))
}

export function parseIdToken(idToken: string): Record<string, any> {
  try {
    const parts = idToken.split('.')
    if (parts.length < 2) throw new Error('bad_jwt')
    const payload = JSON.parse(b64urlToString(parts[1]!))
    return payload
  } catch {
    return {}
  }
}
