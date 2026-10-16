import { getFileWithETag } from '../../../src/core/storage/r2.js';
import { getPublicRateLimit, checkRateLimit } from '../../../src/core/auth/rate-limit.js';
import type { Env } from '../../../src/core/auth/auth.js';

const ALLOWED_PUBLIC_COLLECTIONS = new Set(['products', 'categories', 'brands']);

export const onRequestOptions: PagesFunction<Env> = async () => {
  return new Response(null, { status: 204 });
};

export const onRequestGet: PagesFunction<Env> = async (context) => {
  const { request, env, params } = context;
  const collectionName = params.collection as string;

  if (!ALLOWED_PUBLIC_COLLECTIONS.has(collectionName)) {
    return new Response(JSON.stringify({ error: 'Colección no encontrada' }), {
      status: 404,
      headers: { 'Content-Type': 'application/json' },
    });
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

export const onRequest: PagesFunction<Env> = async (context) => {
  if (context.request.method === 'OPTIONS') return onRequestOptions(context);
  if (context.request.method === 'GET') return onRequestGet(context);
  return new Response(JSON.stringify({ error: 'Método no permitido' }), {
    status: 405,
    headers: { 'Content-Type': 'application/json' },
  });
};

