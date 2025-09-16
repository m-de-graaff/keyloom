import { serializeSessionCookie } from '@keyloom/core'
import type { FastifyReply } from 'fastify'

export function setSessionCookie(
  reply: FastifyReply,
  sessionId: string,
  opts: { domain?: string; sameSite?: 'lax' | 'strict' | 'none' },
) {
  const cookieOptions: Record<string, unknown> = {
    secure: true,
    httpOnly: true,
    path: '/',
    maxAge: 60 * 60,
  };

  if (opts.domain !== undefined) {
    cookieOptions.domain = opts.domain;
  }

  if (opts.sameSite !== undefined) {
    cookieOptions.sameSite = opts.sameSite;
  }

  reply.header('Set-Cookie', serializeSessionCookie(sessionId, cookieOptions));
}
export function clearSessionCookie(
  reply: FastifyReply,
  opts: { domain?: string; sameSite?: 'lax' | 'strict' | 'none' },
) {
  const cookieOptions: Record<string, unknown> = {
    secure: true,
    httpOnly: true,
    path: '/',
    maxAge: 0,
  };

  if (opts.domain !== undefined) {
    cookieOptions.domain = opts.domain;
  }

  if (opts.sameSite !== undefined) {
    cookieOptions.sameSite = opts.sameSite;
  }

  reply.header('Set-Cookie', serializeSessionCookie('', cookieOptions));
}
