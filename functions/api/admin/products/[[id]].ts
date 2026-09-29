import { getAuthPayload } from '../../../../src/core/auth/auth.js';
import type { Env } from '../../../../src/core/auth/auth.js';
import { putFile, cdnImageUrl, deleteFile, extractPathFromCdnUrl } from '../../../../src/core/github/github.js';

export const onRequestOptions: PagesFunction<Env> = async () => {
  return new Response(null, { status: 204 });
};

export const onRequestPost: PagesFunction<Env> = async (context) => {
  const { request, env } = context;
  const auth = await getAuthPayload(request, env);
  if (!auth) {
    return new Response(JSON.stringify({ error: 'No autorizado' }), { status: 401, headers: { 'Content-Type': 'application/json' } });
  }

  try {
    const body = await request.json() as any;
    const now = new Date().toISOString();
    const id = `prod-${Date.now()}`;
    
    let finalImageUrl = body.main_image || '';

    if (body.main_image_base64) {
      try {
        const uniqueSuffix = Math.random().toString(36).substring(7);
        const ghPath = `products/${id}-${uniqueSuffix}.webp`;
        await putFile(ghPath, body.main_image_base64, `Upload image for ${id}`, env);
        finalImageUrl = cdnImageUrl(ghPath, env);
      } catch (err: any) {
        console.error('[Admin Products POST] GitHub Upload Error:', err);
        return new Response(JSON.stringify({ error: `Error al subir la imagen al repositorio de GitHub: ${err.message}` }), { status: 502, headers: { 'Content-Type': 'application/json' } });
      }
    }

    await env.DB.prepare(`
      INSERT INTO products (id, title, brand, category, price, in_stock, featured, image_url, specs, description, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).bind(
      id,
      body.title,
      body.attributes?.brand || '',
      body.attributes?.category || '',
      Number(body.attributes?.price) || 0,
      body.attributes?.in_stock ? 1 : 0,
      body.attributes?.featured ? 1 : 0,
      finalImageUrl,
      body.attributes?.specs || '',
      body.description || '',
      now,
      now
    ).run();

    return new Response(JSON.stringify({ success: true, id }), { status: 201, headers: { 'Content-Type': 'application/json' } });
  } catch (e: any) {
    console.error('Error in Admin Products POST:', e);
    return new Response(JSON.stringify({ error: `Error interno del servidor - ${e.message}`, details: e.message }), { status: 500, headers: { 'Content-Type': 'application/json' } });
  }
};

export const onRequestPut: PagesFunction<Env> = async (context) => {
  const { request, env } = context;
  const auth = await getAuthPayload(request, env);
  if (!auth) {
    return new Response(JSON.stringify({ error: 'No autorizado' }), { status: 401, headers: { 'Content-Type': 'application/json' } });
  }

  try {
    const idParam = context.params.id;
    let prodId = Array.isArray(idParam) ? idParam[0] : idParam;
    
    if (!prodId) {
      const url = new URL(request.url);
      prodId = url.searchParams.get('id') || url.pathname.split('/').pop() || undefined;
      if (prodId === 'products') prodId = undefined;
    }
    
    if (!prodId) return new Response(JSON.stringify({ error: 'ID requerido' }), { status: 400, headers: { 'Content-Type': 'application/json' } });

    const body = await request.json() as any;
    
    // 1. Obtener imagen actual para recolección de basura si se sube una nueva
    let existingImageUrl: string | null = null;
    if (body.main_image_base64) {
      const product = await env.DB.prepare(`SELECT image_url FROM products WHERE id = ?`).bind(prodId).first<{ image_url: string }>();
      existingImageUrl = product?.image_url || null;
    }

    const updates: string[] = [];
    const values: any[] = [];
    
    let finalImageUrl = body.main_image;

    if (body.main_image_base64) {
      try {
        const uniqueSuffix = Math.random().toString(36).substring(7);
        const ghPath = `products/${prodId}-${Date.now()}-${uniqueSuffix}.webp`;
        await putFile(ghPath, body.main_image_base64, `Update image for ${prodId}`, env);
        finalImageUrl = cdnImageUrl(ghPath, env);
        
        // 2. Eliminar la imagen antigua de GitHub
        if (existingImageUrl && existingImageUrl !== finalImageUrl) {
          const oldPath = extractPathFromCdnUrl(existingImageUrl, env);
          if (oldPath) {
            await deleteFile(oldPath, `Cleanup old image for ${prodId} after update`, env);
          }
        }
      } catch (err: any) {
        console.error('[Admin Products PUT] GitHub Upload Error:', err);
        return new Response(JSON.stringify({ error: `Error al subir la imagen al repositorio de GitHub: ${err.message}` }), { status: 502, headers: { 'Content-Type': 'application/json' } });
      }
    }

    if (body.title !== undefined) { updates.push("title = ?"); values.push(body.title); }
    if (body.attributes?.brand !== undefined) { updates.push("brand = ?"); values.push(body.attributes.brand); }
    if (body.attributes?.category !== undefined) { updates.push("category = ?"); values.push(body.attributes.category); }
    if (body.attributes?.price !== undefined) { updates.push("price = ?"); values.push(Number(body.attributes.price)); }
    if (body.attributes?.in_stock !== undefined) { updates.push("in_stock = ?"); values.push(body.attributes.in_stock ? 1 : 0); }
    if (body.attributes?.featured !== undefined) { updates.push("featured = ?"); values.push(body.attributes.featured ? 1 : 0); }
    if (finalImageUrl !== undefined) { updates.push("image_url = ?"); values.push(finalImageUrl); }
    if (body.attributes?.specs !== undefined) { updates.push("specs = ?"); values.push(body.attributes.specs); }
    if (body.description !== undefined) { updates.push("description = ?"); values.push(body.description); }

    if (updates.length > 0) {
      updates.push("updated_at = ?");
      values.push(new Date().toISOString());
      values.push(prodId);

      await env.DB.prepare(`UPDATE products SET ${updates.join(', ')} WHERE id = ?`).bind(...values).run();
    }

    return new Response(JSON.stringify({ success: true }), { status: 200, headers: { 'Content-Type': 'application/json' } });
  } catch (e: any) {
    console.error('Error in Admin Products PUT:', e);
    return new Response(JSON.stringify({ error: `Error interno del servidor - ${e.message}`, details: e.message }), { status: 500, headers: { 'Content-Type': 'application/json' } });
  }
};

export const onRequestDelete: PagesFunction<Env> = async (context) => {
  const { request, env } = context;
  const auth = await getAuthPayload(request, env);
  if (!auth) {
    return new Response(JSON.stringify({ error: 'No autorizado' }), { status: 401, headers: { 'Content-Type': 'application/json' } });
  }

  try {
    const idParam = context.params.id;
    let prodId = Array.isArray(idParam) ? idParam[0] : idParam;
    
    if (!prodId) {
      const url = new URL(request.url);
      prodId = url.searchParams.get('id') || url.pathname.split('/').pop() || undefined;
      if (prodId === 'products') prodId = undefined;
    }
    
    if (!prodId) return new Response(JSON.stringify({ error: 'ID requerido' }), { status: 400, headers: { 'Content-Type': 'application/json' } });

    // 1. Recolección de basura: Borrar imagen en GitHub antes de borrar el registro
    const product = await env.DB.prepare(`SELECT image_url FROM products WHERE id = ?`).bind(prodId).first<{ image_url: string }>();
    if (product && product.image_url) {
      const path = extractPathFromCdnUrl(product.image_url, env);
      if (path) {
        await deleteFile(path, `Delete orphaned image for deleted product ${prodId}`, env);
      }
    }

    // 2. Borrar en la base de datos
    await env.DB.prepare(`DELETE FROM products WHERE id = ?`).bind(prodId).run();
    return new Response(JSON.stringify({ success: true }), { status: 200, headers: { 'Content-Type': 'application/json' } });
  } catch (e: any) {
    console.error('Error in Admin Products DELETE:', e);
    return new Response(JSON.stringify({ error: `Error interno del servidor - ${e.message}`, details: e.message }), { status: 500, headers: { 'Content-Type': 'application/json' } });
  }
};
