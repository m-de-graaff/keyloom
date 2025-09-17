import { afterEach, describe, expect, it, vi } from 'vitest'

const routesCommand = vi.fn()
const initCommand = vi.fn()
const migrateCommand = vi.fn()
const doctorCommand = vi.fn()

vi.mock('../src/commands/routes', () => ({ routesCommand }))
vi.mock('../src/commands/init', () => ({ initCommand }))
vi.mock('../src/commands/migrate', () => ({ migrateCommand }))
vi.mock('../src/commands/doctor', () => ({ doctorCommand }))

async function loadRun() {
  const mod = await import('../src/index')
  return mod.run
}

afterEach(() => {
  vi.clearAllMocks()
})

describe('cli run', () => {
  it('dispatches routes command with remaining args', async () => {
    const run = await loadRun()
    await run(['node', 'keyloom', 'routes', '--out', 'out.ts'])
    expect(routesCommand).toHaveBeenCalledWith(['--out', 'out.ts'])
  })

  it('dispatches init command', async () => {
    const run = await loadRun()
    await run(['node', 'keyloom', 'init'])
    expect(initCommand).toHaveBeenCalledTimes(1)
  })

  it('dispatches migrate command', async () => {
    const run = await loadRun()
    await run(['node', 'keyloom', 'migrate', '--dry'])
    expect(migrateCommand).toHaveBeenCalledWith(['--dry'])
  })

  it('dispatches doctor command', async () => {
    const run = await loadRun()
    await run(['node', 'keyloom', 'doctor', '--json'])
    expect(doctorCommand).toHaveBeenCalledWith(['--json'])
  })

  it('prints usage and exits with 0 when no command', async () => {
    const logs: string[] = []
    const logSpy = vi.spyOn(console, 'log').mockImplementation((msg?: unknown) => {
      logs.push(String(msg))
    })
    const exitSpy = vi
      .spyOn(process, 'exit')
      .mockImplementation(((code?: number) => {
        throw new Error(`exit:${code ?? 0}`)
      }) as never)

    const run = await loadRun()
    try {
      await run(['node', 'keyloom'])
    } catch (err) {
      expect((err as Error).message).toBe('exit:0')
    }

    expect(logs[0]).toContain('keyloom CLI')
    exitSpy.mockRestore()
    logSpy.mockRestore()
  })

  it('prints usage and exits with 1 for unknown command', async () => {
    const logs: string[] = []
    const logSpy = vi.spyOn(console, 'log').mockImplementation((msg?: unknown) => {
      logs.push(String(msg))
    })
    const exitSpy = vi
      .spyOn(process, 'exit')
      .mockImplementation(((code?: number) => {
        throw new Error(`exit:${code ?? 0}`)
      }) as never)

    const run = await loadRun()
    try {
      await run(['node', 'keyloom', 'unknown'])
    } catch (err) {
      expect((err as Error).message).toBe('exit:1')
    }

    expect(logs[0]).toContain('keyloom CLI')
    exitSpy.mockRestore()
    logSpy.mockRestore()
  })
})
