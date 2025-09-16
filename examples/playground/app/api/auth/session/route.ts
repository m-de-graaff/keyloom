export const runtime = 'nodejs'

import prismaAdapter from '@keyloom/adapters/prisma'
import { getCurrentSession } from '@keyloom/core'

export async function GET(req: Request) {
  const sid = parseCookie('__keyloom_session', req.headers.get('cookie'))
  const { session, user } = await getCurrentSession(sid, prismaAdapter())
  return Response.json({ session, user })
}
function parseCookie(name: string, cookie: string | null) {
  const part = (cookie ?? '').split('; ').find((s) => s.startsWith(`${name}=`))
  return part?.split('=')[1] ?? null
}
