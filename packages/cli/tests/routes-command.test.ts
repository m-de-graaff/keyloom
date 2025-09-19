import path from 'node:path'
import { afterEach, describe, expect, it, vi } from 'vitest'

const generateRoutes = vi.fn(async () => ({
  count: 3,
  outTs: '/tmp/routes.ts',
  outJson: '/tmp/routes.json',
}))

vi.mock('../src/lib/index', () => ({ generateRoutes }))

afterEach(() => {
  vi.clearAllMocks()
})

describe('routesCommand', () => {
  it('parses flags and logs summary', async () => {
    const { routesCommand } = await import('../src/commands/routes')
    const logs: string[] = []
    const logSpy = vi.spyOn(console, 'log').mockImplementation((msg?: unknown) => {
      logs.push(String(msg))
    })

    await routesCommand(['--out', 'routes.ts', '--outJson', 'routes.json', '--cwd', 'app'])

    expect(generateRoutes).toHaveBeenCalledWith({
      out: 'routes.ts',
      outJson: 'routes.json',
      cwd: path.resolve(process.cwd(), 'app'),
    })
    const success = logs.filter((l) => l.includes('✔'))
    expect(success).toEqual([
      '✔ Found 3 annotated routes',
      '✔ Wrote /tmp/routes.ts',
      '✔ Wrote /tmp/routes.json',
    ])

    logSpy.mockRestore()
  })

  it('uses defaults when flags omitted', async () => {
    const { routesCommand } = await import('../src/commands/routes')
    const logs: string[] = []
    const logSpy = vi.spyOn(console, 'log').mockImplementation((msg?: unknown) => {
      logs.push(String(msg))
    })

    await routesCommand([])

    expect(generateRoutes).toHaveBeenCalledWith({})
    const success = logs.filter((l) => l.includes('✔'))
    expect(success).toEqual(expect.arrayContaining([
      '\u2714 Found 3 annotated routes',
      '\u2714 Wrote /tmp/routes.ts',
      '\u2714 Wrote /tmp/routes.json',
    ]))

    logSpy.mockRestore()
  })
})
