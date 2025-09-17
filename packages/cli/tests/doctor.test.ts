import { afterEach, describe, expect, it } from 'vitest'
import { runDoctorChecks } from '../src/lib/doctor/checks'

afterEach(() => {
  process.env.AUTH_SECRET = undefined
})

describe('doctor checks', () => {
  it('reports missing auth secret', async () => {
    const results = await runDoctorChecks()
    expect(results).toEqual([
      {
        id: 'env:AUTH_SECRET',
        ok: false,
        message: 'AUTH_SECRET missing',
      },
    ])
  })

  it('reports present auth secret', async () => {
    process.env.AUTH_SECRET = 'test'
    const results = await runDoctorChecks()
    expect(results[0].ok).toBe(true)
    expect(results[0].message).toContain('present')
  })
})
