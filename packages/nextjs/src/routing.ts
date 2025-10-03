export type RouteMatch =
  | { kind: "session" }
  | { kind: "csrf" }
  | { kind: "register" }
  | { kind: "login" }
  | { kind: "logout" }
  | { kind: "password_request" }
  | { kind: "password_reset" }
  | { kind: "email_verify" }
  | { kind: "magic_link_request" }
  | { kind: "magic_link_verify" }
  | { kind: "oauth_start"; provider: string }
  | { kind: "oauth_callback"; provider: string };

export function matchApiPath(pathname: string): RouteMatch | null {
  const parts = pathname.split("/").filter(Boolean);
  const last = parts[parts.length - 1];

  // Keep existing simple matching by last segment
  switch (last) {
    case "session":
      return { kind: "session" };
    case "csrf":
      return { kind: "csrf" };
    case "register":
      return { kind: "register" };
    case "login":
      return { kind: "login" };
    case "logout":
      return { kind: "logout" };
    case "request":
      if (parts.includes("password")) return { kind: "password_request" };
      if (parts.includes("magic-link")) return { kind: "magic_link_request" };
      break;
    case "reset":
      if (parts.includes("password")) return { kind: "password_reset" };
      break;
    case "verify":
      if (parts.includes("email")) return { kind: "email_verify" };
      if (parts.includes("magic-link")) return { kind: "magic_link_verify" };
      break;
  }

  // OAuth routes: .../oauth/:provider/start or .../oauth/:provider/callback
  const i = parts.indexOf("oauth");
  if (i >= 0 && (last === "start" || last === "callback") && parts[i + 1]) {
    const provider = parts[i + 1] as string;
    if (last === "start") return { kind: "oauth_start", provider };
    if (last === "callback") return { kind: "oauth_callback", provider };
  }

  return null;
}
