export const b64urlEncode = (u8: Uint8Array) => Buffer.from(u8).toString('base64url')
export const b64urlDecode = (s: string) => new Uint8Array(Buffer.from(s, 'base64url'))
