import { describe, expect, it } from 'vitest'
import postgresAdapter from '../src'

describe('postgres adapter placeholder', () => {
  it('throws not implemented error', () => {
    expect(() => postgresAdapter()).toThrowError('not implemented')
  })
})
