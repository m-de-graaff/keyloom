function base64url(input: Uint8Array): string {
  if (typeof Buffer !== 'undefined') {
    return Buffer.from(input)
      .toString('base64')
      .replace(/=/g, '')
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
  }
  // Browser fallback (rare in this package)
  let str = ''
  for (let i = 0; i < input.length; i++) str += String.fromCharCode(input[i]!)
  const b64 = btoa(str)
  return b64.replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_')
}

export async function signEs256(data: string, pkcs8Pem: string): Promise<string> {
  const pkcs8 = pkcs8Pem
    .replace('-----BEGIN PRIVATE KEY-----', '')
    .replace('-----END PRIVATE KEY-----', '')
    .replace(/\s+/g, '')
  const keyData =
    typeof Buffer !== 'undefined'
      ? Buffer.from(pkcs8, 'base64')
      : Uint8Array.from(atob(pkcs8), (c) => c.charCodeAt(0))
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const subtle: SubtleCrypto = (globalThis as any).crypto?.subtle
  if (!subtle) throw new Error('webcrypto_unavailable')
  const key = await subtle.importKey(
    'pkcs8',
    keyData,
    { name: 'ECDSA', namedCurve: 'P-256' },
    false,
    ['sign'],
  )
  const sig = await subtle.sign(
    { name: 'ECDSA', hash: 'SHA-256' },
    key,
    new TextEncoder().encode(data),
  )
  return base64url(new Uint8Array(sig))
}

export async function makeAppleClientSecret(args: {
  clientId: string
  teamId: string
  keyId: string
  privateKey: string
  ttlSeconds?: number
}): Promise<string> {
  const now = Math.floor(Date.now() / 1000)
  const exp = now + (args.ttlSeconds ?? 10 * 60)
  const claims = {
    iss: args.teamId,
    iat: now,
    exp,
    aud: 'https://appleid.apple.com',
    sub: args.clientId,
  }
  const header = { alg: 'ES256', kid: args.keyId, typ: 'JWT' }
  const enc = (o: any) =>
    typeof Buffer !== 'undefined'
      ? Buffer.from(JSON.stringify(o)).toString('base64url')
      : btoa(unescape(encodeURIComponent(JSON.stringify(o))))
          .replace(/=/g, '')
          .replace(/\+/g, '-')
          .replace(/\//g, '_')
  const data = `${enc(header)}.${enc(claims)}`
  const sig = await signEs256(data, args.privateKey)
  return `${data}.${sig}`
}
