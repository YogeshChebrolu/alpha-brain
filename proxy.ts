import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

/**
 * Auth gate (Next.js 16 Proxy — formerly `middleware`).
 *
 * Runs before every matched route. It refreshes the Supabase session on each
 * request and redirects:
 *   - unauthenticated users away from protected routes → /login
 *   - authenticated users away from the auth pages → /
 *
 * Routes that are reachable without a session.
 */
const PUBLIC_ROUTES = ['/login', '/signup'];

export async function proxy(request: NextRequest) {
  // Start with a pass-through response we can attach refreshed cookies to.
  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        // `headers` carries cache-control directives that must ride along with
        // auth cookies so a CDN never caches one user's session (@supabase/ssr).
        setAll(cookiesToSet, headers) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
          if (headers) {
            for (const [key, value] of Object.entries(headers)) {
              supabaseResponse.headers.set(key, value);
            }
          }
        },
      },
    }
  );

  // IMPORTANT: don't run logic between client creation and getUser() — doing so
  // can desync session refresh and cause random logouts (Supabase SSR guidance).
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { pathname } = request.nextUrl;
  const isPublicRoute = PUBLIC_ROUTES.some((route) =>
    pathname.startsWith(route)
  );

  // Unauthenticated visitor on a protected route → login, remembering where
  // they were headed so we can send them back after they sign in.
  if (!user && !isPublicRoute) {
    const intendedPath = pathname + request.nextUrl.search;
    return redirectKeepingCookies(
      request,
      supabaseResponse,
      '/login',
      intendedPath
    );
  }

  // Already signed in but sitting on an auth page → home.
  if (user && isPublicRoute) {
    return redirectKeepingCookies(request, supabaseResponse, '/');
  }

  return supabaseResponse;
}

/**
 * Build a redirect that carries over any cookies the Supabase client refreshed
 * onto `source`, so a session refresh isn't dropped by the redirect response.
 */
function redirectKeepingCookies(
  request: NextRequest,
  source: NextResponse,
  pathname: string,
  redirectTo?: string
) {
  const url = request.nextUrl.clone();
  url.pathname = pathname;
  url.search = '';
  // Only carry a return path worth returning to (skip the home page).
  if (redirectTo && redirectTo !== '/') {
    url.searchParams.set('redirectTo', redirectTo);
  }
  const response = NextResponse.redirect(url);
  source.cookies.getAll().forEach((cookie) => response.cookies.set(cookie));
  return response;
}

export const config = {
  matcher: [
    /*
     * Run on every path EXCEPT:
     * - api routes (handle their own auth; e.g. the Inngest webhook)
     * - _next/static, _next/image (build assets)
     * - static files by extension (svg, images, video, favicon, etc.)
     */
    '/((?!api|_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|mp4|webm)$).*)',
  ],
};
