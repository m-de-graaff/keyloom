export const runtime = 'nodejs'

import prismaAdapter from '@keyloom/adapters/prisma'
import { login as doLogin, serializeSessionCookie } from '@keyloom/core'

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
  const { email, password } = await req.json()
  const adapter = prismaAdapter()
  const { session } = await doLogin({ email, password }, { adapter, hasher: bcryptHasher })

  return new Response(JSON.stringify({ sessionId: session.id }), {
    headers: {
      'content-type': 'application/json',
      'Set-Cookie': serializeSessionCookie(session.id, {
        sameSite: 'lax',
        secure: false, // dev over http
        httpOnly: true,
      }),
    },
  })
}
