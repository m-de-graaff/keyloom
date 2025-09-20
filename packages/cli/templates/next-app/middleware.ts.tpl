import { createAuthMiddleware } from '@keyloom/nextjs/middleware';
import config from '@/keyloom.config';
// import routes from './.keyloom/routes.generated'; // enable after `keyloom routes`
export default createAuthMiddleware(config, {
  publicRoutes: ['/', '/sign-in'],
  // routes, // <- uncomment when using declarative visibility (Phase 6)
});
export const config = { matcher: ['/((?!_next|.*\.(?:ico|png|jpg|svg|css|js|map)).*)'] };

