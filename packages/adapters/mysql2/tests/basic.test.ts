import { describe, expect, it } from 'vitest'
import mysqlAdapter from '../src'

describe('mysql2 adapter placeholder', () => {
  it('throws not implemented error', () => {
    expect(() => mysqlAdapter()).toThrowError('not implemented')
  })
})
