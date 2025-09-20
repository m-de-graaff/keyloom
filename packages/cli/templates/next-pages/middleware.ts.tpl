import { createAuthMiddleware } from '@keyloom/nextjs/middleware';
import config from '@/keyloom.config';
export default createAuthMiddleware(config, {
  publicRoutes: ['/', '/sign-in'],
});
export const config = { matcher: ['/((?!_next|.*\.(?:ico|png|jpg|svg|css|js|map)).*)'] };

