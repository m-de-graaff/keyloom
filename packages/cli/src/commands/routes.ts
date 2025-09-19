import path from 'node:path'
import { generateRoutes } from '../lib/index.ts'
import { banner, section, step, ui, spinner } from '../lib/ui'


export async function routesCommand(args: string[]) {
  // Parse simple flags: --out, --outJson, --cwd
  const getFlag = (name: string) => {
    const i = args.indexOf(name)
    return i >= 0 ? args[i + 1] : undefined
  }
  const out = getFlag('--out')
  const outJson = getFlag('--outJson')
  const cwdFlag = getFlag('--cwd')

  const opts: { cwd?: string; out?: string; outJson?: string } = {}
  if (out) opts.out = out
  if (outJson) opts.outJson = outJson
  if (cwdFlag) opts.cwd = path.resolve(process.cwd(), cwdFlag)

  banner('Keyloom Routes')

  step(1, 3, 'Scan project')
  ui.info(`cwd: ${opts.cwd || process.cwd()}`)
  if (opts.out) ui.info(`out: ${opts.out}`)
  if (opts.outJson) ui.info(`outJson: ${opts.outJson}`)

  step(2, 3, 'Generate route manifest')
  const s = spinner('Analyzing files and writing outputs')
  let res: Awaited<ReturnType<typeof generateRoutes>>
  try {
    res = await generateRoutes(opts)
    s.succeed('Route manifest generated')
  } catch (e) {
    s.fail('Failed to generate routes manifest')
    ui.error((e as Error).message)
    return
  }

  step(3, 3, 'Summary')
  ui.success(`Found ${res.count} annotated routes`)
  ui.success(`Wrote ${res.outTs}`)
  ui.success(`Wrote ${res.outJson}`)
  section('Next steps')
  ui.info('Import and use routes.generated.ts in your project as needed')
}
