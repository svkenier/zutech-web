import { getPublicRateLimit, checkRateLimit } from '../../../../src/core/auth/rate-limit.js';
import type { Env } from '../../../../src/core/auth/auth.js';

export const onRequest: PagesFunction<Env> = async (context) => {
  const { request, env, params } = context;

  if (request.method === 'OPTIONS') return new Response(null, { status: 204 });

  if (request.method !== 'GET') {
    return new Response(JSON.stringify({ error: 'Método no permitido' }), { status: 405 });
  }

  const productId = params.id as string | undefined;
  if (!productId) {
    return new Response(JSON.stringify({ error: 'ID de producto no proporcionado' }), { status: 400 });
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

    // Búsqueda por ID o por SKU
    const row = await env.DB.prepare(`
      SELECT products.*, brands.name as brand_name 
      FROM products 
      LEFT JOIN brands ON products.brand_id = brands.id 
      WHERE (products.id = ? OR products.sku = ?) AND products.is_active = 1 
      LIMIT 1
    `).bind(productId, productId).first<any>();

    if (!row) {
      return new Response(JSON.stringify({ error: 'Producto no encontrado' }), {
        status: 404,
        headers: {
          'Content-Type': 'application/json',
          'Cache-Control': 'no-store'
        }
      });
    }

    const publicUrl = (env as any).R2_PUBLIC_URL || (env as any).VITE_R2_PUBLIC_URL;
    let finalImageUrl = row.image_url;
    if (finalImageUrl && !finalImageUrl.startsWith('http')) {
      finalImageUrl = publicUrl ? `${publicUrl}/${finalImageUrl}` : `/api/media/${finalImageUrl}`;
    }

    const record = {
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

    return new Response(JSON.stringify(record), { status: 200, headers });
  } catch (err: unknown) {
    console.error(`[Public Product Detail Error - ${productId}]:`, err);
    return new Response(JSON.stringify({ error: 'Error al obtener producto' }), {
      status: 500,
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'no-store'
      }
    });
  }
};
