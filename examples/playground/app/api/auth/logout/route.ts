export const runtime = 'nodejs'

import prismaAdapter from '@keyloom/adapters/prisma'
import { logout, serializeSessionCookie } from '@keyloom/core'

export async function POST(req: Request) {
  const sid = parseCookie('__keyloom_session', req.headers.get('cookie'))
  if (sid) await logout(sid, prismaAdapter())
  return new Response(JSON.stringify({ ok: true }), {
    headers: {
      'Set-Cookie': serializeSessionCookie('', {
        maxAge: 0,
        secure: false,
        httpOnly: true,
        sameSite: 'lax',
      }),
    },
  })
}
function parseCookie(name: string, cookie: string | null) {
  const part = (cookie ?? '').split('; ').find((s) => s.startsWith(`${name}=`))
  return part?.split('=')[1] ?? null
}
