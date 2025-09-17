import { describe, expect, it } from 'vitest'
import { prismaAdapter } from '../src'
import { prismaAdapter as prismaAdapterImpl } from '../src/prisma/index'

describe('adapters aggregation', () => {
  it('re-exports prisma adapter', () => {
    expect(prismaAdapter).toBe(prismaAdapterImpl)
  })
})
