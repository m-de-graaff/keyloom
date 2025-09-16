import { aesGcmOpen, aesGcmSeal } from '../crypto/aead'

export type OAuthStatePayload = {
  p: string
  v: string
  r?: string
  m?: 'link' | 'login'
  t: number
}

export async function sealState(secret: Uint8Array, payload: OAuthStatePayload) {
  const text = new TextEncoder().encode(JSON.stringify(payload))
  return aesGcmSeal(secret, text)
}

export async function openState(secret: Uint8Array, nonce: string, ct: string): Promise<OAuthStatePayload> {
  const out = await aesGcmOpen(secret, nonce, ct)
  return JSON.parse(new TextDecoder().decode(out))
}

