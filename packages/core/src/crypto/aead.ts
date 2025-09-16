export interface Aead {
  seal(plaintext: Uint8Array, aad?: Uint8Array): Promise<{ nonce: string; ct: string }>
  open(nonce: string, ct: string, aad?: Uint8Array): Promise<Uint8Array>
}

function toAb(u8: Uint8Array): ArrayBuffer {
  return u8.buffer.slice(u8.byteOffset, u8.byteOffset + u8.byteLength) as ArrayBuffer
}

export async function aesGcmSeal(keyBytes: Uint8Array, plaintext: Uint8Array, aad?: Uint8Array) {
  const key = await crypto.subtle.importKey('raw', toAb(keyBytes), 'AES-GCM', false, ['encrypt'])
  const iv = crypto.getRandomValues(new Uint8Array(12))
  const alg = aad
    ? ({ name: 'AES-GCM', iv, additionalData: aad } as AesGcmParams)
    : ({ name: 'AES-GCM', iv } as AesGcmParams)
  const ctBuf = await crypto.subtle.encrypt(alg, key, toAb(plaintext))
  return {
    nonce: Buffer.from(iv).toString('base64url'),
    ct: Buffer.from(new Uint8Array(ctBuf)).toString('base64url'),
  }
}

export async function aesGcmOpen(
  keyBytes: Uint8Array,
  nonce: string,
  ct: string,
  aad?: Uint8Array,
) {
  const key = await crypto.subtle.importKey('raw', toAb(keyBytes), 'AES-GCM', false, ['decrypt'])
  const iv = new Uint8Array(Buffer.from(nonce, 'base64url'))
  const ctu8 = new Uint8Array(Buffer.from(ct, 'base64url'))
  const alg = aad
    ? ({ name: 'AES-GCM', iv, additionalData: aad } as AesGcmParams)
    : ({ name: 'AES-GCM', iv } as AesGcmParams)
  const buf = await crypto.subtle.decrypt(alg, key, toAb(ctu8))
  return new Uint8Array(buf)
}
