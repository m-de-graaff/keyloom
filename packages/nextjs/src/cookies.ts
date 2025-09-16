import { COOKIE_NAME, serializeSessionCookie } from '@keyloom/core';

// generic parse for both edge/web/node
export function parseCookieValue(cookieHeader: string | null, name = COOKIE_NAME) {
  const raw = cookieHeader ?? '';
  const found = raw.split(/; */).find((p) => p.startsWith(`${name}=`));
  return found ? decodeURIComponent(found.split('=')[1] ?? '') : null;
}

export function setSessionCookieHeader(sessionId: string, opts?: { domain?: string; sameSite?: 'lax'|'strict'|'none'; maxAgeSec?: number }) {
  const cookieOptions: Record<string, unknown> = {
    sameSite: opts?.sameSite ?? 'lax',
    secure: true,
    httpOnly: true,
    path: '/',
  };

  if (opts?.domain !== undefined) {
    cookieOptions.domain = opts.domain;
  }

  if (opts?.maxAgeSec !== undefined) {
    cookieOptions.maxAge = opts.maxAgeSec;
  }

  return serializeSessionCookie(sessionId, cookieOptions);
}