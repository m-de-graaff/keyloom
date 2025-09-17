import { describe, expect, it } from 'vitest'
import { b64urlDecode, b64urlEncode } from '../src/util/base64url'
import { safeEqual } from '../src/util/compare'
import { minutesFromNow } from '../src/util/time'

describe('util helpers', () => {
  it('round trips base64url encoding', () => {
    const data = new Uint8Array([1, 2, 3, 254])
    const encoded = b64urlEncode(data)
    expect(encoded).toBe('AQID_g')
    expect(b64urlDecode(encoded)).toEqual(data)
  })

  it('performs timing safe equality', () => {
    expect(safeEqual('abc', 'abc')).toBe(true)
    expect(safeEqual('abc', 'abd')).toBe(false)
    expect(safeEqual('abc', 'ab')).toBe(false)
  })

  it('computes minutes from now', () => {
    const future = minutesFromNow(5).getTime() - Date.now()
    expect(future).toBeGreaterThanOrEqual(5 * 60_000 - 10)
  })
})
