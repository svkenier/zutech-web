import { getAuthPayload } from '../../../../src/core/auth/auth.js';
import type { Env } from '../../../../src/core/auth/auth.js';
import { putFile, cdnImageUrl, deleteFile, extractPathFromCdnUrl } from '../../../../src/core/storage/r2.js';

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
        const r2Path = `products/${id}-${uniqueSuffix}.webp`;
        
        let fileContent: ArrayBuffer | string = body.main_image_base64;
        let mimeType = 'image/webp';
        if (typeof fileContent === 'string' && fileContent.startsWith('data:')) {
          const arr = fileContent.split(',');
          const mimeMatch = arr[0].match(/:(.*?);/);
          if (mimeMatch) mimeType = mimeMatch[1];
          const bstr = atob(arr[1]);
          const u8arr = new Uint8Array(bstr.length);
          for (let i = 0; i < bstr.length; i++) {
            u8arr[i] = bstr.charCodeAt(i);
          }
          fileContent = u8arr.buffer;
        }

        await putFile(env, r2Path, fileContent, mimeType);
        finalImageUrl = cdnImageUrl(r2Path);
      } catch (err: any) {
        console.error('[Admin Products POST] R2 Upload Error:', err);
        return new Response(JSON.stringify({ error: `Error al subir la imagen a R2: ${err.message}` }), { status: 502, headers: { 'Content-Type': 'application/json' } });
      }
    }

    let brandId: string | null = null;
    if (body.attributes?.brand) {
      const bName = body.attributes.brand.trim();
      await env.DB.prepare(`INSERT OR IGNORE INTO brands (id, name) VALUES (?, ?)`).bind(crypto.randomUUID(), bName).run();
      const bRow = await env.DB.prepare(`SELECT id FROM brands WHERE name = ?`).bind(bName).first() as {id:string} | null;
      if (bRow) brandId = bRow.id;
    }

    await env.DB.prepare(`
      INSERT INTO products (id, title, brand_id, category, price, in_stock, featured, image_url, specs, description, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).bind(
      id,
      body.title,
      brandId,
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
    let prodId: string | undefined = Array.isArray(idParam) ? idParam[0] : (idParam as string | undefined);
    
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
      const product = (await env.DB.prepare(`SELECT image_url FROM products WHERE id = ?`).bind(prodId).first()) as { image_url: string } | null;
      existingImageUrl = product?.image_url || null;
    }

    const updates: string[] = [];
    const values: any[] = [];
    
    let finalImageUrl = body.main_image;

    if (body.main_image_base64) {
      try {
        const uniqueSuffix = Math.random().toString(36).substring(7);
        const r2Path = `products/${prodId}-${Date.now()}-${uniqueSuffix}.webp`;
        
        let fileContent: ArrayBuffer | string = body.main_image_base64;
        let mimeType = 'image/webp';
        if (typeof fileContent === 'string' && fileContent.startsWith('data:')) {
          const arr = fileContent.split(',');
          const mimeMatch = arr[0].match(/:(.*?);/);
          if (mimeMatch) mimeType = mimeMatch[1];
          const bstr = atob(arr[1]);
          const u8arr = new Uint8Array(bstr.length);
          for (let i = 0; i < bstr.length; i++) {
            u8arr[i] = bstr.charCodeAt(i);
          }
          fileContent = u8arr.buffer;
        }

        await putFile(env, r2Path, fileContent, mimeType);
        finalImageUrl = cdnImageUrl(r2Path);
        
        // 2. Eliminar la imagen antigua de R2
        if (existingImageUrl && existingImageUrl !== finalImageUrl) {
          const oldPath = extractPathFromCdnUrl(existingImageUrl);
          if (oldPath) {
            await deleteFile(env, oldPath);
          }
        }
      } catch (err: any) {
        console.error('[Admin Products PUT] R2 Upload Error:', err);
        return new Response(JSON.stringify({ error: `Error al subir la imagen a R2: ${err.message}` }), { status: 502, headers: { 'Content-Type': 'application/json' } });
      }
    }

    if (body.title !== undefined) { updates.push("title = ?"); values.push(body.title); }
    if (body.attributes?.brand !== undefined) { 
      let brandId: string | null = null;
      if (body.attributes.brand) {
        const bName = body.attributes.brand.trim();
        await env.DB.prepare(`INSERT OR IGNORE INTO brands (id, name) VALUES (?, ?)`).bind(crypto.randomUUID(), bName).run();
        const bRow = await env.DB.prepare(`SELECT id FROM brands WHERE name = ?`).bind(bName).first() as {id:string} | null;
        if (bRow) brandId = bRow.id;
      }
      updates.push("brand_id = ?"); 
      values.push(brandId); 
    }
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
    let prodId: string | undefined = Array.isArray(idParam) ? idParam[0] : (idParam as string | undefined);
    
    if (!prodId) {
      const url = new URL(request.url);
      prodId = url.searchParams.get('id') || url.pathname.split('/').pop() || undefined;
      if (prodId === 'products') prodId = undefined;
    }
    
    if (!prodId) return new Response(JSON.stringify({ error: 'ID requerido' }), { status: 400, headers: { 'Content-Type': 'application/json' } });

    const count = await env.DB.prepare(`SELECT COUNT(*) as c FROM order_items WHERE product_id = ?`).bind(prodId).first() as {c: number};
    if (count.c > 0) {
      await env.DB.prepare(`UPDATE products SET is_active = 0, in_stock = 0 WHERE id = ?`).bind(prodId).run();
      return new Response(JSON.stringify({ success: true, archived: true }), { status: 200, headers: { 'Content-Type': 'application/json' } });
    }

    // 1. Guardar la URL de la imagen
    const product = (await env.DB.prepare(`SELECT image_url FROM products WHERE id = ?`).bind(prodId).first()) as { image_url: string } | null;

    // 2. Borrar en la base de datos (seguro porque no tiene ventas)
    await env.DB.prepare(`DELETE FROM products WHERE id = ?`).bind(prodId).run();

    // 3. Recolección de basura en R2
    if (product && product.image_url) {
      const path = extractPathFromCdnUrl(product.image_url);
      if (path) {
        await deleteFile(env, path);
      }
    }

    return new Response(JSON.stringify({ success: true }), { status: 200, headers: { 'Content-Type': 'application/json' } });
  } catch (e: any) {
    console.error('Error in Admin Products DELETE:', e);
    return new Response(JSON.stringify({ error: `Error interno del servidor - ${e.message}`, details: e.message }), { status: 500, headers: { 'Content-Type': 'application/json' } });
  }
};
