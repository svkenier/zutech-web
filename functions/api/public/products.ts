import { getPublicRateLimit, checkRateLimit } from '../../../src/core/auth/rate-limit.js';
import type { Env } from '../../../src/core/auth/auth.js';

function resolveProductImageUrl(rawUrl: string | null | undefined, publicUrl?: string): string {
  if (!rawUrl) return '';
  let url = rawUrl.trim();
  if (url.includes('pub-zutech.r2.dev') || url.includes('cdn.zutech.com')) {
    url = url.replace(/^https?:\/\/[^/]+\//, '');
  }
  if (!url.startsWith('http')) {
    return publicUrl ? `${publicUrl}/${url}` : `/api/media/${url}`;
  }
  return url;
}

export const onRequest: PagesFunction<Env> = async (context) => {
  const { request, env } = context;

  if (request.method === 'OPTIONS') return new Response(null, { status: 204 });

  if (request.method !== 'GET') {
    return new Response(JSON.stringify({ error: 'Método no permitido' }), { status: 405 });
  }

  try {
    const ip = request.headers.get('cf-connecting-ip') ?? '127.0.0.1';
    const limitRes = await checkRateLimit(getPublicRateLimit(env), ip);
    
    const headers = new Headers();
    headers.set('X-RateLimit-Limit', limitRes.limit.toString());
    headers.set('X-RateLimit-Remaining', limitRes.remaining.toString());
    
    if (!limitRes.success) {
      return new Response(JSON.stringify({ error: 'Demasiadas peticiones. Intenta más tarde.' }), { status: 429, headers });
    }

    headers.set('Cache-Control', 'public, s-maxage=60, stale-while-revalidate=86400');
    headers.set('Content-Type', 'application/json');

    const url = new URL(request.url);
    const singleId = url.searchParams.get('id');
    const singleSku = url.searchParams.get('sku');
    const publicUrl = (env as any).R2_PUBLIC_URL || (env as any).VITE_R2_PUBLIC_URL;

    // Soporte para consulta atómica de producto individual
    if (singleId || singleSku) {
      const query = singleId
        ? `SELECT products.*, brands.name as brand_name 
           FROM products 
           LEFT JOIN brands ON products.brand_id = brands.id 
           WHERE products.id = ? AND products.is_active = 1 LIMIT 1`
        : `SELECT products.*, brands.name as brand_name 
           FROM products 
           LEFT JOIN brands ON products.brand_id = brands.id 
           WHERE products.sku = ? AND products.is_active = 1 LIMIT 1`;
      
      const param = (singleId || singleSku)!;
      const row = await env.DB.prepare(query).bind(param).first<any>();

      if (!row) {
        return new Response(JSON.stringify({ error: 'Producto no encontrado' }), {
          status: 404,
          headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' }
        });
      }

      const finalImageUrl = resolveProductImageUrl(row.image_url, publicUrl);

      const singleRecord = {
        id: row.id,
        sku: row.sku,
        title: row.title,
        main_image: finalImageUrl,
        description: row.description,
        created_at: row.created_at,
        updated_at: row.updated_at,
        attributes: {
          brand: row.brand_name || 'Sin Marca',
          category: row.category,
          price: row.price,
          in_stock: Boolean(row.in_stock),
          featured: Boolean(row.featured),
          specs: row.specs,
        }
      };

      return new Response(JSON.stringify(singleRecord), { status: 200, headers });
    }

    const { results } = await env.DB.prepare(`
      SELECT products.*, brands.name as brand_name 
      FROM products 
      LEFT JOIN brands ON products.brand_id = brands.id 
      WHERE products.is_active = 1
      ORDER BY products.created_at DESC
    `).all();

    // Map to frontend expected format
    const records = results.map((row: any) => {
      const finalImageUrl = resolveProductImageUrl(row.image_url, publicUrl);
      return {
      id: row.id,
      sku: row.sku,
      title: row.title,
      main_image: finalImageUrl,
      description: row.description,
      created_at: row.created_at,
      updated_at: row.updated_at,
      attributes: {
        brand: row.brand_name || 'Sin Marca',
        category: row.category,
        price: row.price,
        in_stock: Boolean(row.in_stock),
        featured: Boolean(row.featured),
        specs: row.specs,
      }
    };
    });

    return new Response(JSON.stringify(records), { status: 200, headers });
  } catch (err: unknown) {
    console.error('[Public Products Error]:', err);
    return new Response(JSON.stringify({ error: 'Error al obtener productos' }), {
      status: 500,
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'no-store'
      }
    });
  }
};
