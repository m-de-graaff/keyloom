export const randBytes = (len = 32) => {
  const buf = new Uint8Array(len)
  crypto.getRandomValues(buf)
  return buf
}
export const randToken = (len = 32) => Buffer.from(randBytes(len)).toString('base64url')
