export const runtime = 'nodejs'

import prismaAdapter from '@keyloom/adapters/prisma'
import { csrf, register as doRegister } from '@keyloom/core'

const bcryptHasher = {
  id: 'bcrypt',
  async hash(pw: string) {
    const { hash } = await import('bcryptjs')
    return hash(pw, 10)
  },
  async verify(hashVal: string, pw: string) {
    const { compare } = await import('bcryptjs')
    return compare(pw, hashVal)
  },
}

export async function POST(req: Request) {
  const cookieToken = parseCookie('__keyloom_csrf', req.headers.get('cookie'))
  const headerToken = req.headers.get('x-keyloom-csrf')
  if (!csrf.validateDoubleSubmit({ cookieToken, headerToken }))
    return new Response('csrf', { status: 403 })

  const { email, password } = await req.json()
  const adapter = prismaAdapter()
  const out = await doRegister({ email, password }, { adapter, hasher: bcryptHasher })
  return Response.json({ userId: out.user.id })
}

function parseCookie(name: string, cookie: string | null) {
  const part = (cookie ?? '').split('; ').find((s) => s.startsWith(`${name}=`))
  return part?.split('=')[1] ?? null
}
