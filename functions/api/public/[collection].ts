import { getFileWithETag } from '../../../src/core/storage/r2.js';
import { getPublicRateLimit, checkRateLimit } from '../../../src/core/auth/rate-limit.js';
import type { Env } from '../../../src/core/auth/auth.js';

export const onRequest: PagesFunction<Env> = async (context) => {
  const { request, env, params } = context;
  const collectionName = params.collection as string;

  if (request.method === 'OPTIONS') return new Response(null, { status: 204 });

  if (request.method !== 'GET') {
    return new Response(JSON.stringify({ error: 'Método no permitido' }), { status: 405 });
  }

  // Abstracción agnóstica de colección
  const path = `data/${collectionName}.json`;

  try {
    const ip = request.headers.get('cf-connecting-ip') ?? '127.0.0.1';
    const limitRes = await checkRateLimit(getPublicRateLimit(env), ip);
    
    const headers = new Headers();
    headers.set('X-RateLimit-Limit', limitRes.limit.toString());
    headers.set('X-RateLimit-Remaining', limitRes.remaining.toString());
    
    if (!limitRes.success) {
      return new Response(JSON.stringify({ error: 'Demasiadas peticiones. Intenta más tarde.' }), { status: 429, headers });
    }

    const ifNoneMatch = request.headers.get('if-none-match') || undefined;
    const r2Res = await getFileWithETag(env, path, ifNoneMatch);

    if (r2Res.status === 304) {
      return new Response(null, { status: 304, headers });
    }
    
    if (r2Res.etag) headers.set('ETag', r2Res.etag);
    headers.set('Cache-Control', 'public, s-maxage=60, stale-while-revalidate=86400');
    headers.set('Content-Type', 'application/json');

    let records: any[] = [];
    if (r2Res.data) {
      try {
        const parsed = typeof r2Res.data === 'string' ? JSON.parse(r2Res.data) : r2Res.data;
        if (Array.isArray(parsed)) records = parsed;
        else {
          const firstArray = Object.values(parsed).find(Array.isArray);
          records = (firstArray as any[]) || [];
        }
      } catch {
        records = [];
      }
    }
    return new Response(JSON.stringify(records), { status: 200, headers });
  } catch (err) {
    console.warn('[Public Collection Fallback]:', err);
    return new Response(JSON.stringify([]), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'no-store'
      }
    });
  }
};
