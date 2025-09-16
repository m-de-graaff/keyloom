export const runtime = 'nodejs'

import { csrf } from '@keyloom/core'

export async function GET() {
  const t = csrf.issueCsrfToken()
  return new Response(JSON.stringify({ csrfToken: t }), {
    headers: {
      'content-type': 'application/json',
      // Double-submit cookie must be readable by JS and set over http in dev
      'Set-Cookie': `__keyloom_csrf=${t}; Path=/; SameSite=Lax`,
    },
  })
}
