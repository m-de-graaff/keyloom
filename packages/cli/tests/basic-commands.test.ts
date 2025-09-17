import { describe, expect, it, vi } from 'vitest'

const logOutput = () => {
  const lines: string[] = []
  const spy = vi.spyOn(console, 'log').mockImplementation((msg?: unknown) => {
    lines.push(String(msg))
  })
  return { lines, spy }
}

describe('basic commands', () => {
  it('initCommand logs scaffold notice', async () => {
    const { initCommand } = await import('../src/commands/init')
    const { lines, spy } = logOutput()
    await initCommand([])
    spy.mockRestore()
    expect(lines[0]).toContain('keyloom init')
  })

  it('migrateCommand logs placeholder', async () => {
    const { migrateCommand } = await import('../src/commands/migrate')
    const { lines, spy } = logOutput()
    await migrateCommand([])
    spy.mockRestore()
    expect(lines[0]).toContain('keyloom migrate')
  })

  it('doctorCommand logs placeholder', async () => {
    const { doctorCommand } = await import('../src/commands/doctor')
    const { lines, spy } = logOutput()
    await doctorCommand([])
    spy.mockRestore()
    expect(lines[0]).toContain('keyloom doctor')
  })
})
