import { createAuthMiddleware } from '@keyloom/nextjs'
import keyloomConfig from './keyloom.config'

export default createAuthMiddleware(keyloomConfig, {
  publicRoutes: ['/', '/debug'],
})
export const config = { matcher: ['/((?!_next|.*\\.(?:ico|png|jpg|svg)).*)'] }
