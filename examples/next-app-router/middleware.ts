import { createAuthMiddleware } from '@keyloom/nextjs/middleware'
import keyloomConfig from './keyloom.middleware'

export default createAuthMiddleware(keyloomConfig, {
  publicRoutes: ['/', '/sign-in', '/debug', '/api/auth'],
})
export const config = { matcher: ['/((?!_next|.*\\.(?:ico|png|jpg|svg)).*)'] }
