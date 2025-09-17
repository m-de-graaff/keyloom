import { describe, expect, it } from 'vitest'
import mongoAdapter from '../src'

describe('mongo adapter placeholder', () => {
  it('throws not implemented error', () => {
    expect(() => mongoAdapter()).toThrowError('not implemented')
  })
})
