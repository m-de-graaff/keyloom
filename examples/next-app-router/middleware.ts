import { createAuthMiddleware } from '@keyloom/nextjs'
import keyloomConfig from './keyloom.config'

export default createAuthMiddleware(keyloomConfig, {
  publicRoutes: ['/', '/sign-in', '/debug', '/api/auth'],
})
export const config = { matcher: ['/((?!_next|.*\\.(?:ico|png|jpg|svg)).*)'] }
