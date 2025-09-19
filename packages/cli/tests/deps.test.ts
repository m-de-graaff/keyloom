import { describe, expect, it } from 'vitest'
import { resolveInitDeps } from '../src/lib/deps'

describe('resolveInitDeps', () => {
  it('collects adapter and provider deps without duplicates', async () => {
    const deps = resolveInitDeps({
      adapter: 'prisma',
      providers: ['github', 'google'],
      includeNextjs: true,
    })
    expect(deps).toEqual(expect.arrayContaining(['@prisma/client', 'prisma', '@keyloom/adapters']))
    // Providers are bundled under @keyloom/providers
    expect(deps).toEqual(expect.arrayContaining(['@keyloom/providers']))
    // Core and Next.js integration
    expect(deps).toEqual(expect.arrayContaining(['@keyloom/core', '@keyloom/nextjs']))
    // No duplicates
    expect(new Set(deps).size).toBe(deps.length)
  })
})
