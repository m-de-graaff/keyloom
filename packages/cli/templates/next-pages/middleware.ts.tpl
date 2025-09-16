import { createAuthMiddleware } from '@keyloom/nextjs/middleware';
import config from '@/keyloom.config';
export default createAuthMiddleware(config, {
  publicRoutes: ['/', '/sign-in', '/api/auth/csrf'],
});
export const config = { matcher: ['/((?!_next|.*\.(?:ico|png|jpg|svg|css|js|map)).*)'] };

