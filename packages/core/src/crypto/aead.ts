export interface Aead {
  seal(plaintext: Uint8Array, aad?: Uint8Array): Promise<{ nonce: string; ct: string }>
  open(nonce: string, ct: string, aad?: Uint8Array): Promise<Uint8Array>
}


export async function aesGcmSeal(keyBytes: Uint8Array, plaintext: Uint8Array, aad?: Uint8Array) {
  const key = await crypto.subtle.importKey('raw', keyBytes, 'AES-GCM', false, ['encrypt'])
  const iv = crypto.getRandomValues(new Uint8Array(12))
  const ct = await crypto.subtle.encrypt({ name: 'AES-GCM', iv, additionalData: aad }, key, plaintext)
  return { nonce: Buffer.from(iv).toString('base64url'), ct: Buffer.from(ct).toString('base64url') }
}

export async function aesGcmOpen(keyBytes: Uint8Array, nonce: string, ct: string, aad?: Uint8Array) {
  const key = await crypto.subtle.importKey('raw', keyBytes, 'AES-GCM', false, ['decrypt'])
  const iv = new Uint8Array(Buffer.from(nonce, 'base64url'))
  const buf = await crypto.subtle.decrypt(
    { name: 'AES-GCM', iv, additionalData: aad },
    key,
    Buffer.from(ct, 'base64url'),
  )
  return new Uint8Array(buf)
}
