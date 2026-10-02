import type { Env } from '../../../../src/core/auth/auth.js';

export const onRequestGet: PagesFunction<Env> = async (context) => {
  const { env, params } = context;
  
  // params.path is an array of path segments because of [[path]].ts
  const pathArray = params.path as string[] | undefined;
  if (!pathArray || pathArray.length === 0) {
    return new Response('Not Found', { status: 404 });
  }

  if (pathArray.some(segment => segment === '..' || segment.includes('/') || segment.includes('\\'))) {
    return new Response('Forbidden: Invalid path traversal', { status: 403 });
  }

  const key = pathArray.join('/');

  try {
    const object = await env.BUCKET.get(key);

    if (object === null) {
      return new Response('Not Found', { status: 404 });
    }

    const headers = new Headers();
    object.writeHttpMetadata(headers);
    headers.set('etag', object.httpEtag);
    headers.set('Cache-Control', 'public, max-age=31536000, immutable');
    
    // Fallback content type if not set in metadata
    if (!headers.has('Content-Type')) {
      const ext = key.split('.').pop()?.toLowerCase();
      if (ext === 'webp') headers.set('Content-Type', 'image/webp');
      else if (ext === 'jpeg' || ext === 'jpg') headers.set('Content-Type', 'image/jpeg');
      else if (ext === 'png') headers.set('Content-Type', 'image/png');
      else headers.set('Content-Type', 'application/octet-stream');
    }

    return new Response(object.body, {
      headers,
    });
  } catch (err: any) {
    console.error(`[Media Proxy] Error fetching ${key}:`, err);
    return new Response('Internal Server Error', { status: 500 });
  }
};
