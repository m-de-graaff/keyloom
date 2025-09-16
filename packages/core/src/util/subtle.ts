// globalThis may or may not have crypto depending on runtime; narrow safely
const maybeCrypto: unknown = (globalThis as unknown as { crypto?: Crypto }).crypto
export const subtle = (maybeCrypto && typeof maybeCrypto === 'object'
  ? (maybeCrypto as Crypto).subtle
  : undefined) as unknown as SubtleCrypto
// In Node, ensure --experimental-global-webcrypto or use polyfill in server package later.
