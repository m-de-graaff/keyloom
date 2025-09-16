import path from 'node:path'
import { generateRoutes } from '../lib/routes-scan'

export async function routesCommand(args: string[]) {
  // Parse simple flags: --out, --outJson, --cwd
  const getFlag = (name: string) => {
    const i = args.indexOf(name)
    return i >= 0 ? args[i + 1] : undefined
  }
  const out = getFlag('--out')
  const outJson = getFlag('--outJson')
  const cwd = getFlag('--cwd')
  const res = await generateRoutes({ out, outJson, cwd: cwd ? path.resolve(process.cwd(), cwd) : undefined })
  console.log(`✔ Found ${res.count} annotated routes`)
  console.log(`✔ Wrote ${res.outTs}`)
  console.log(`✔ Wrote ${res.outJson}`)
}

