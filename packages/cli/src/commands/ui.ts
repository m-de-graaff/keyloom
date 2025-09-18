import { existsSync, readFileSync, writeFileSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { ensureDir, writeFileSafe } from '../lib/fs'

export async function uiCommand(args: string[]) {
  const sub = args[0]
  if (!sub) return printUsage()
  if (sub === 'add') {
    const what = args[1]
    switch (what) {
      case 'sign-in': return addSignIn()
      case 'user-button': return addUserButton()
      case 'org': return addOrg()
      default: return printUsage()
    }
  }
  if (sub === 'setup') return setup()
  return printUsage()
}

function printUsage() {
  console.log('Usage: keyloom ui <setup|add ...>')
  console.log('  keyloom ui setup                 # add Tailwind preset + CSS vars import')
  console.log('  keyloom ui add sign-in           # scaffold sign-in page')
  console.log('  keyloom ui add user-button       # scaffold user button component')
  console.log('  keyloom ui add org               # scaffold org switcher + members/invites pages')
}

function addSignIn() {
  const path = join(process.cwd(), 'app', '(auth)', 'sign-in', 'page.tsx')
  const code = `"use client"\nimport { SignInForm, Providers } from '@keyloom/ui/auth'\nimport { Card } from '@keyloom/ui/components/card'\n\nexport const metadata = { title: 'Sign in' }\n\nexport default function Page() {\n  return (\n    <div className=\"min-h-dvh grid place-items-center p-6\">\n      <Card className=\"w-full max-w-md p-6 space-y-6\">\n        <h1 className=\"text-2xl font-semibold\">Welcome back</h1>\n        <Providers callbackUrl=\"/dashboard\" />\n        <div className=\"relative\">\n          <div className=\"absolute inset-0 flex items-center\">\n            <span className=\"w-full border-t\" />\n          </div>\n          <div className=\"relative flex justify-center text-xs uppercase\">\n            <span className=\"bg-background px-2 text-muted-foreground\">or</span>\n          </div>\n        </div>\n        <SignInForm redirectTo=\"/dashboard\" />\n      </Card>\n    </div>\n  )\n}\n`
  const res = writeFileSafe(path, code, { onExists: 'skip' })
  console.log(res.skipped ? `Skipped (exists): ${res.path}` : `Created: ${res.path}`)
}

function addUserButton() {
  const path = join(process.cwd(), 'components', 'user-button.tsx')
  const code = `"use client"\nexport { UserButton } from '@keyloom/ui/auth'\n`
  const res = writeFileSafe(path, code, { onExists: 'skip' })
  console.log(res.skipped ? `Skipped (exists): ${res.path}` : `Created: ${res.path}`)
}

function addOrg() {
  const topbarPath = join(process.cwd(), 'components', 'org-switcher.tsx')
  const topbar = `"use client"\nimport { OrgSwitcher } from '@keyloom/ui/org'\n\nexport function TopbarOrgSwitcher({ orgs, activeOrgId, onChange }: { orgs: Array<{id: string; name: string}>, activeOrgId?: string, onChange?: (orgId: string) => void }) {\n  return (\n    <OrgSwitcher orgs={orgs} activeOrgId={activeOrgId} onChange={onChange} />\n  )\n}\n`
  const res1 = writeFileSafe(topbarPath, topbar, { onExists: 'skip' })
  console.log(res1.skipped ? `Skipped (exists): ${res1.path}` : `Created: ${res1.path}`)

  const membersPath = join(process.cwd(), 'app', 'orgs', 'members', 'page.tsx')
  const members = `"use client"\nimport { MembersTable } from '@keyloom/ui/org'\n\nexport default function Page() {\n  // Fetch your members via /api/orgs and /api/members endpoints\n  const members: any[] = []\n  return <div className=\"p-6\"><MembersTable members={members} /></div>\n}\n`
  const res2 = writeFileSafe(membersPath, members, { onExists: 'skip' })
  console.log(res2.skipped ? `Skipped (exists): ${res2.path}` : `Created: ${res2.path}`)

  const invitesPath = join(process.cwd(), 'app', 'orgs', 'invites', 'page.tsx')
  const invites = `"use client"\nimport { InviteMemberDialog } from '@keyloom/ui/org'\n\nexport default function Page() {\n  return <div className=\"p-6\"><InviteMemberDialog orgId=\"YOUR_ORG_ID\" /></div>\n}\n`
  const res3 = writeFileSafe(invitesPath, invites, { onExists: 'skip' })
  console.log(res3.skipped ? `Skipped (exists): ${res3.path}` : `Created: ${res3.path}`)
}

function setup() {
  const cwd = process.cwd()
  // Tailwind config
  const twPaths = ['tailwind.config.cjs', 'tailwind.config.js', 'tailwind.config.ts'].map(p => join(cwd, p))
  const twPath = twPaths.find(p => existsSync(p))
  if (twPath) {
    const src = readFileSync(twPath, 'utf8')
    let out = src
    if (!/keyloom\)\s*;/.test(src) && !/require\('\@keyloom\/ui\/theme\/tailwind-preset.cjs'\)/.test(src)) {
      out = `const keyloom = require('@keyloom/ui/theme/tailwind-preset.cjs');\n` + out
    }
    if (!/presets\s*:\s*\[.*keyloom/.test(out)) {
      out = out.replace(/module\.exports\s*=\s*\{/, (m) => `${m}\n  presets: [keyloom],`)
    }
    if (out !== src) writeFileSync(twPath, out, 'utf8')
    console.log(`Updated Tailwind config: ${twPath}`)
  } else {
    console.log('No tailwind.config.* found; please add the preset manually:')
    console.log("const keyloom = require('@keyloom/ui/theme/tailwind-preset.cjs'); module.exports = { presets: [keyloom] }")
  }

  // Add CSS import
  const cssCandidates = [join(cwd, 'app', 'globals.css'), join(cwd, 'src', 'app', 'globals.css'), join(cwd, 'styles', 'globals.css')]
  const cssPath = cssCandidates.find(p => existsSync(p))
  if (cssPath) {
    const css = readFileSync(cssPath, 'utf8')
    if (!/@keyloom\/ui\/theme\/css-vars\.css/.test(css)) {
      writeFileSync(cssPath, `@import '@keyloom/ui/theme/css-vars.css';\n` + css, 'utf8')
      console.log(`Prepended CSS variables import: ${cssPath}`)
    } else {
      console.log('CSS variables import already present')
    }
  } else {
    const fallback = join(cwd, 'styles', 'globals.css')
    ensureDir(dirname(fallback))
    writeFileSync(fallback, `@import '@keyloom/ui/theme/css-vars.css';\n`, 'utf8')
    console.log(`Created ${fallback} with CSS variables import`)
  }

  // providers.config.ts scaffold
  const providersCfg = join(cwd, 'providers.config.ts')
  if (!existsSync(providersCfg)) {
    const code = `// Configure OAuth provider visibility / labels for <Providers />\nexport const providers = [\n  { id: 'github', name: 'GitHub' },\n  { id: 'google', name: 'Google' },\n]\n`
    writeFileSync(providersCfg, code, 'utf8')
    console.log(`Created ${providersCfg}`)
  } else {
    console.log('providers.config.ts already exists')
  }
}

