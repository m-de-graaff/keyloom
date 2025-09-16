import { createAuthMiddleware } from '@keyloom/nextjs/middleware'
import keyloomConfig from './keyloom.middleware'

export default createAuthMiddleware(keyloomConfig, {
  publicRoutes: ['/', '/debug', '/api/auth'],
  verifyAtEdge: false, // Keep fast for playground
})

export const config = {
  matcher: ['/((?!_next|.*\\.(?:ico|png|jpg|svg)).*)'],
}
