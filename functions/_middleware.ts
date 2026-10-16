// functions/_middleware.ts
let isFetchPatched = false;

if (!isFetchPatched) {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = (input: RequestInfo | URL, init?: RequestInit) => {
    if (init && 'cache' in init) {
      delete (init as any).cache;
    }
    return originalFetch(input, init);
  };
  isFetchPatched = true;
}

export const onRequest: PagesFunction = async (context) => {

  try {
    const response = await context.next();
    const newHeaders = new Headers(response.headers);
    newHeaders.set('Content-Security-Policy', "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; img-src 'self' data: blob: https:; connect-src 'self' https://*.cloudflare.com; font-src 'self' data: https: https://fonts.gstatic.com; frame-ancestors 'none';");
    newHeaders.set('X-Content-Type-Options', 'nosniff');
    newHeaders.set('X-Frame-Options', 'DENY');
    newHeaders.set('Referrer-Policy', 'strict-origin-when-cross-origin');
    newHeaders.set('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
    newHeaders.set('Strict-Transport-Security', 'max-age=31536000; includeSubDomains; preload');

    return new Response(response.body, {
      status: response.status,
      statusText: response.statusText,
      headers: newHeaders,
    });
  } catch (err: any) {
    console.error('[Middleware Error]:', err);
    throw err;
  }
};
