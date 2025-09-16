import { randToken } from '../crypto/random'

export function issueCsrfToken() {
  return randToken(32)
}

export function validateDoubleSubmit({
  cookieToken,
  headerToken,
}: {
  cookieToken?: string | null
  headerToken?: string | null
}) {
  return !!cookieToken && !!headerToken && cookieToken === headerToken
}
