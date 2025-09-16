import { createAuthMiddleware } from '@keyloom/nextjs'
import keyloomConfig from './keyloom.config'

export default createAuthMiddleware(keyloomConfig, {
  publicRoutes: ['/', '/debug', '/api/auth'],
  verifyAtEdge: false, // Keep fast for playground
})

export const config = {
  matcher: ['/((?!_next|.*\\.(?:ico|png|jpg|svg)).*)']
}
