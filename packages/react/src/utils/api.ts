import { ensureCsrf, invalidateCsrf } from "./csrf";
import type { AuthFetchOptions } from "../types";

export async function authFetch(path: string, opts: AuthFetchOptions = {}, basePath = "/api/auth") {
  const url = path.startsWith("/") ? path : `${basePath}/${path}`;
  const headers = new Headers(opts.headers || {});

  if (opts.csrf !== false && (!opts.method || opts.method.toUpperCase() !== "GET")) {
    const token = await ensureCsrf(basePath);
    headers.set("x-keyloom-csrf", token);
  }

  const res = await fetch(url.startsWith("/") ? url : `${basePath}/${url}`, {
    ...opts,
    headers,
    credentials: "same-origin",
  });

  if (res.status === 403) {
    // CSRF mismatch -> refresh and let callers retry on demand
    invalidateCsrf();
  }

  return res;
}

