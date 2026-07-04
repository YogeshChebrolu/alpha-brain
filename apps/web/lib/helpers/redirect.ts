/**
 * Reads the `redirectTo` query param from the current URL and returns it only
 * if it's a safe, same-origin relative path. Otherwise returns `fallback`.
 *
 * Guards against open-redirect attacks by rejecting absolute URLs
 * (`https://evil.com`) and protocol-relative paths (`//evil.com`).
 *
 * Client-only: returns `fallback` during SSR/prerender (no `window`).
 */
export function getSafeRedirect(fallback = '/'): string {
  if (typeof window === 'undefined') return fallback;

  const target = new URLSearchParams(window.location.search).get('redirectTo');

  if (target && target.startsWith('/') && !target.startsWith('//')) {
    return target;
  }

  return fallback;
}
