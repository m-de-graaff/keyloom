import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import type { NextKeyloomConfig } from './types';
import { matchApiPath } from './routing';
import { parseCookieValue, setSessionCookieHeader } from './cookies';
import { argon2idHasher } from '@keyloom/core';
import { register as doRegister } from '@keyloom/core/runtime/register';
import { login as doLogin } from '@keyloom/core/runtime/login';
import { logout as doLogout } from '@keyloom/core/runtime/logout';
import { getCurrentSession } from '@keyloom/core/runtime/current-session';
import { issueCsrfToken, validateDoubleSubmit } from '@keyloom/core/guard/csrf';

// Lazily memoize adapter (per module instance)
let _adapter: any;
function getAdapter(config: NextKeyloomConfig) {
  if (!_adapter) _adapter = config.adapter;
  return _adapter;
}

export function createNextHandler(config: NextKeyloomConfig) {
  const GET = async (req: NextRequest) => {
    const url = new URL(req.url);
    const match = matchApiPath(url.pathname);
    const adapter = getAdapter(config);

    if (!match) return NextResponse.json({ error: 'not_found' }, { status: 404 });

    if (match.kind === 'session') {
      const sid = parseCookieValue(req.headers.get('cookie'));
      const out = await getCurrentSession(sid, adapter);
      return NextResponse.json(out);
    }

    if (match.kind === 'csrf') {
      const token = issueCsrfToken();
      const res = NextResponse.json({ csrfToken: token });
      res.headers.append('Set-Cookie', `__keyloom_csrf=${token}; Path=/; SameSite=Lax; HttpOnly; Secure`);
      return res;
    }

    return NextResponse.json({ error: 'method_not_allowed' }, { status: 405 });
  };

  const POST = async (req: NextRequest) => {
    const url = new URL(req.url);
    const match = matchApiPath(url.pathname);
    const adapter = getAdapter(config);
    if (!match) return NextResponse.json({ error: 'not_found' }, { status: 404 });

    // CSRF double-submit for all POSTs
    const cookieToken = parseCookieValue(req.headers.get('cookie'), '__keyloom_csrf');
    const headerToken = req.headers.get('x-keyloom-csrf');
    if (!validateDoubleSubmit({ cookieToken, headerToken })) {
      return NextResponse.json({ error: 'csrf' }, { status: 403 });
    }

    if (match.kind === 'register') {
      const { email, password } = await req.json();
      const out = await doRegister({ email, password, requireEmailVerify: false }, { adapter, hasher: argon2idHasher });
      return NextResponse.json({ userId: out.user.id, requiresVerification: out.requiresVerification });
    }

    if (match.kind === 'login') {
      const { email, password } = await req.json();
      const { session } = await doLogin({ email, password }, { adapter, hasher: argon2idHasher });
      const res = NextResponse.json({ sessionId: session.id });
      res.headers.append('Set-Cookie',
        setSessionCookieHeader(session.id, { sameSite: config.cookie?.sameSite ?? 'lax' })
      );
      return res;
    }

    if (match.kind === 'logout') {
      const sid = parseCookieValue(req.headers.get('cookie'));
      if (sid) await doLogout(sid, adapter);
      const res = NextResponse.json({ ok: true });
      res.headers.append('Set-Cookie', setSessionCookieHeader('', { maxAgeSec: 0, sameSite: config.cookie?.sameSite ?? 'lax' }));
      return res;
    }

    return NextResponse.json({ error: 'method_not_allowed' }, { status: 405 });
  };

  return { GET, POST };
}

