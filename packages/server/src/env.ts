import { z } from 'zod'

export const Env = z.object({
  PORT: z.string().default('8787'),
  DATABASE_URL: z.string(),
  AUTH_SECRET: z.string().min(16),
  COOKIE_DOMAIN: z.string().optional(),
  COOKIE_SAMESITE: z.enum(['lax', 'strict', 'none']).default('lax'),
})
export type Env = z.infer<typeof Env>
