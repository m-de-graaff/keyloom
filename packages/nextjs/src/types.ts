import type { Adapter, KeyloomConfig } from '@keyloom/core'

export type NextKeyloomConfig = KeyloomConfig & {
  // JWT-specific configuration
  sessionStrategy?: 'database' | 'jwt'
  jwt?: {
    KEYLOOM_JWT_JWKS_URL?: string
    KEYLOOM_JWT_ISSUER?: string
    KEYLOOM_JWT_AUDIENCE?: string
    KEYLOOM_JWT_CLOCK_SKEW_SEC?: string
  }
}

export type RuntimeCtx = {
  config: NextKeyloomConfig
  adapter: Adapter // created from config.adapter factory if needed
}
