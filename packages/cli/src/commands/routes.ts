import path from 'node:path'
import { generateRoutes } from '../lib/index.js'

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

  const res = await generateRoutes(opts)
  console.log(`✔ Found ${res.count} annotated routes`)
  console.log(`✔ Wrote ${res.outTs}`)
  console.log(`✔ Wrote ${res.outJson}`)
}
