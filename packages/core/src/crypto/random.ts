export const randBytes = (len = 16) => {
  const buf = new Uint8Array(len)
  crypto.getRandomValues(buf)
  return buf
}
export const randToken = (len = 16) => Buffer.from(randBytes(len)).toString('base64url')
