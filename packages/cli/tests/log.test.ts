import { afterEach, describe, expect, it, vi } from 'vitest'
import { log } from '../src/lib/log'

afterEach(() => {
  vi.restoreAllMocks()
})

describe('log helper', () => {
  it('forwards info to console', () => {
    const spy = vi.spyOn(console, 'log').mockImplementation(() => {})
    log.info('hello')
    expect(spy).toHaveBeenCalledWith('hello')
  })

  it('formats success prefix', () => {
    const spy = vi.spyOn(console, 'log').mockImplementation(() => {})
    log.success('done')
    expect(spy).toHaveBeenCalledWith('✔ done')
  })
})
