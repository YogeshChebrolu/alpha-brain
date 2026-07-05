import {
  convexAuthNextjsMiddleware,
  createRouteMatcher,
  nextjsMiddlewareRedirect,
} from '@convex-dev/auth/nextjs/server';

/**
 * Auth gate (Next.js 16 Proxy) backed by Convex Auth.
 *
 * Note: demo (anonymous) users ARE authenticated in Convex terms, so they pass
 * the guard and reach the app — the demo banner is shown in the dashboard chrome.
 */
const isAuthPage = createRouteMatcher(['/login', '/signup']);
// Publicly shared article links — must stay viewable without signing in.
const isPublicPage = createRouteMatcher(['/share/(.*)']);

export const proxy = convexAuthNextjsMiddleware(async (request, { convexAuth }) => {
  if (isPublicPage(request)) return;

  const authed = await convexAuth.isAuthenticated();

  // Signed-in user sitting on an auth page → home.
  if (isAuthPage(request) && authed) {
    return nextjsMiddlewareRedirect(request, '/');
  }

  // Unauthenticated visitor on a protected route → login.
  if (!isAuthPage(request) && !authed) {
    return nextjsMiddlewareRedirect(request, '/login');
  }
});

export const config = {
  // Run on everything except static assets. Crucially this INCLUDES /api/auth,
  // which convexAuthNextjsMiddleware intercepts internally (our guard callback
  // is not invoked for it). Excluding `api` here 404s the auth endpoint.
  matcher: ['/((?!.*\\..*|_next).*)', '/', '/(api|trpc)(.*)'],
};
