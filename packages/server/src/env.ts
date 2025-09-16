import { z } from 'zod'

export const Env = z.object({
  PORT: z.string().default('8787'),
  DATABASE_URL: z.string(),
  AUTH_SECRET: z.string().min(16),
  COOKIE_DOMAIN: z.string().optional(),
  COOKIE_SAMESITE: z.enum(['lax', 'strict', 'none']).default('lax'),

  // JWT Configuration
  SESSION_STRATEGY: z.enum(['database', 'jwt']).default('database'),
  JWT_ISSUER: z.string().default('keyloom'),
  JWT_AUDIENCE: z.string().optional(),
  JWT_ACCESS_TTL: z.string().default('10m'),
  JWT_REFRESH_TTL: z.string().default('30d'),
  JWT_ALGORITHM: z.enum(['EdDSA', 'ES256']).default('EdDSA'),
  JWT_CLOCK_SKEW_SEC: z.coerce.number().default(60),
  JWT_INCLUDE_ORG_ROLE: z.coerce.boolean().default(false),

  // Keystore Configuration
  JWKS_PATH: z.string().optional(),
  KEY_ROTATION_DAYS: z.coerce.number().default(90),
  KEY_OVERLAP_DAYS: z.coerce.number().default(7),
})
export type Env = z.infer<typeof Env>
