export interface Aead {
  seal(plaintext: Uint8Array, aad?: Uint8Array): Promise<{ nonce: string; ct: string }>
  open(nonce: string, ct: string, aad?: Uint8Array): Promise<Uint8Array>
}
