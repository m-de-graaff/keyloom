import { describe, expect, it } from 'vitest'
import { ensureDeps } from '../src/lib/deps'

describe('ensureDeps', () => {
  it('collects adapter and provider deps without duplicates', async () => {
    const deps = await ensureDeps({
      adapter: 'prisma',
      providers: ['github', 'google'],
      packageManager: 'pnpm',
    })
    expect(deps).toEqual(expect.arrayContaining(['@prisma/client', 'prisma']))
    expect(deps).toEqual(expect.arrayContaining(['@keyloom/providers/github']))
    expect(new Set(deps).size).toBe(deps.length)
  })
})
