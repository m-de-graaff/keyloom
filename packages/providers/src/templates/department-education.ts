import type { OAuthProvider } from "@keyloom/core";
import { createOAuthProvider } from "../factory";
import { mapOidcProfile } from "../testing/contract";

/**
 * Example: Department of Education provider (non-standard quirks)
 * - Requires form-encoded token exchange
 * - Needs Accept: application/json header for token responses
 * - User profile obtained from a custom /me endpoint
 */
export type DeptEduOptions = { clientId: string; clientSecret: string };

export function departmentOfEducation(opts: DeptEduOptions): OAuthProvider & {
  clientId: string;
  clientSecret: string;
} {
  const build = createOAuthProvider({
    id: "department-education",
    authorizationUrl: "https://sso.education.gov.example/oauth/authorize",
    tokenUrl: "https://sso.education.gov.example/oauth/token",
    userinfoUrl: "https://api.education.gov.example/v1/me",
    scopes: ["profile", "email"],
    tokenStyle: "form",
    tokenHeaders: { Accept: "application/json" },
    mapProfile: (raw, tokens) => {
      // Some APIs respond with non-OIDC shapes; map them here.
      // Fall back to OIDC-ish mapping if fields exist.
      if (raw && typeof raw === "object" && (raw.userId || raw.email)) {
        return {
          id: String(raw.userId ?? raw.sub ?? ""),
          email: raw.email ?? null,
          name: raw.fullName ?? raw.name ?? null,
          image: raw.avatarUrl ?? null,
        };
      }
      return mapOidcProfile(raw, tokens);
    },
  });
  return build(opts);
}

export default departmentOfEducation;

