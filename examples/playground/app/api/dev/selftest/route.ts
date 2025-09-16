import { memoryAdapter } from '@keyloom/core'

export async function GET() {
  const a = memoryAdapter()
  const u = await a.createUser({ email: 'dev@test.local' })
  const fetched = await a.getUserByEmail('dev@test.local')
  const sess = await a.createSession({
    userId: u.id,
    expiresAt: new Date(Date.now() + 60000),
  })
  const _vt = await a.createVerificationToken({
    identifier: 'dev@test.local',
    token: 'test',
    expiresAt: new Date(Date.now() + 60000),
  })
  const consumed = await a.useVerificationToken('dev@test.local', 'test')

  return Response.json({
    ok: true,
    user: { id: u.id, email: fetched?.email },
    session: { id: sess.id },
    tokenConsumed: !!consumed,
  })
}
