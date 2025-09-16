import type { NextFetchEvent, NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import type { NextKeyloomConfig } from './types';
import { parseCookieValue } from './cookies';

type Options = {
  publicRoutes?: (string | RegExp)[];
  // Optional edge verification (perfs lower): fetch /api/auth/session
  verifyAtEdge?: boolean;
  afterAuth?: (ctx: { authed: boolean; req: NextRequest; next: () => NextResponse; redirect: (to: string) => NextResponse; }) => NextResponse;
};

function isPublic(urlPath: string, rules: (string | RegExp)[] = []) {
  return rules.some((r) => (typeof r === 'string' ? urlPath === r || urlPath.startsWith(r) : r.test(urlPath)));
}

export function createAuthMiddleware(config: NextKeyloomConfig, opts: Options = {}) {
  return async (req: NextRequest, _ev: NextFetchEvent) => {
    const url = req.nextUrl;
    const isStatic = url.pathname.startsWith('/_next') || url.pathname.match(/\.(?:ico|png|jpg|svg|css|js|txt|map)$/);
    if (isStatic) return NextResponse.next();

    const publicHit = isPublic(url.pathname, opts.publicRoutes);
    const sid = parseCookieValue(req.headers.get('cookie'));
    let authed = !!sid;

    if (!publicHit && opts.verifyAtEdge && sid) {
      try {
        const r = await fetch(new URL('/api/auth/session', url).toString(), { headers: { cookie: req.headers.get('cookie') ?? '' } });
        const j = await r.json();
        authed = !!j?.session;
      } catch { authed = false; }
    }

    const next = () => NextResponse.next();
    const redirect = (to: string) => NextResponse.redirect(new URL(to, url));

    if (opts.afterAuth) return opts.afterAuth({ authed, req, next, redirect });

    // default behavior: if private and not authed → redirect to /sign-in
    if (!publicHit && !authed) return redirect('/sign-in');
    return next();
  };
}

