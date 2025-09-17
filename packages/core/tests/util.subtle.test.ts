import { afterEach, describe, expect, it, vi } from 'vitest'

describe('subtle helper', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
    vi.resetModules()
  })

  it('exposes native subtle when available', async () => {
    const mod = await import('../src/util/subtle')
    expect(mod.subtle).toBe(globalThis.crypto?.subtle)
  })

  it('gracefully handles environments without crypto', async () => {
    vi.stubGlobal('crypto', undefined)
    vi.resetModules()
    const mod = await import('../src/util/subtle')
    expect(mod.subtle).toBeUndefined()
  })
})
