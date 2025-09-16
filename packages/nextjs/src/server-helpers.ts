import { cookies, headers } from 'next/headers';
import type { NextKeyloomConfig } from './types';
import { parseCookieValue } from './cookies';
import { getCurrentSession } from '@keyloom/core/runtime/current-session';

// Module-local cache of adapter/config to avoid re-instantiations
let _config: NextKeyloomConfig | undefined;
let _adapter: any;

function ensure(config?: NextKeyloomConfig) {
  if (config) _config = config;
  if (!_config) throw new Error('Keyloom config not provided');
  if (!_adapter) _adapter = _config.adapter;
  return { config: _config, adapter: _adapter };
}

export async function getSession(config?: NextKeyloomConfig) {
  const { adapter } = ensure(config);
  const cookieHeader = (await headers()).get('cookie') ?? cookies().toString();
  const sid = parseCookieValue(cookieHeader);
  const { session, user } = await getCurrentSession(sid, adapter);
  return { session, user };
}

export async function getUser(config?: NextKeyloomConfig) {
  const out = await getSession(config);
  return out.user;
}

// Throw/redirect early in RSC
export async function guard(opts?: { roles?: string[]; redirectTo?: string }, config?: NextKeyloomConfig) {
  const { session, user } = await getSession(config);
  if (!session) {
    const to = opts?.redirectTo ?? '/sign-in';
    // App Router redirect
    // eslint-disable-next-line no-throw-literal
    throw { redirect: to }; // The consuming code should catch and use next/navigation redirect() if needed
  }
  // Role check hooks will be added when RBAC is on (Phase 5)
  return { session, user };
}