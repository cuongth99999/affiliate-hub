/**
 * Global middleware for Cloudflare Pages.
 * Adds security headers + handles /go/ caching.
 */
export const onRequest: PagesFunction = async ({ request, next }) => {
  const response = await next();
  const url = new URL(request.url);

  // Don't add headers to /go/ — those need to redirect freely
  if (url.pathname.startsWith('/go/')) {
    return response;
  }

  const headers = new Headers(response.headers);
  headers.set('X-Content-Type-Options', 'nosniff');
  headers.set('X-Frame-Options', 'DENY');
  headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  headers.set('Permissions-Policy', 'geolocation=(), microphone=(), camera=()');
  headers.set('Strict-Transport-Security', 'max-age=63072000; includeSubDomains; preload');

  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
};
