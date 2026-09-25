import { getAuthPayload } from '../../../src/core/auth/auth.js';
import type { Env } from '../../../src/core/auth/auth.js';

export const onRequest: PagesFunction<Env> = async (context) => {
  const { request, env } = context;

  if (request.method === 'OPTIONS') return new Response(null, { status: 204 });

  const auth = await getAuthPayload(request, env);
  if (!auth) {
    return new Response(JSON.stringify({ error: 'No autorizado' }), { status: 401 });
  }

  try {
    if (request.method === 'POST') {
      const body = await request.json() as any;
      const now = new Date().toISOString();
      const id = `prod-${Date.now()}`;

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
        body.main_image || '',
        body.attributes?.specs || '',
        body.description || '',
        now,
        now
      ).run();

      return new Response(JSON.stringify({ success: true, id }), { status: 201 });
    }

    if (request.method === 'PUT') {
      const url = new URL(request.url);
      const prodId = url.pathname.split('/').pop();
      if (!prodId || prodId === 'products') return new Response(JSON.stringify({ error: 'ID requerido' }), { status: 400 });

      const body = await request.json() as any;
      const updates: string[] = [];
      const values: any[] = [];

      if (body.title !== undefined) { updates.push("title = ?"); values.push(body.title); }
      if (body.attributes?.brand !== undefined) { updates.push("brand = ?"); values.push(body.attributes.brand); }
      if (body.attributes?.category !== undefined) { updates.push("category = ?"); values.push(body.attributes.category); }
      if (body.attributes?.price !== undefined) { updates.push("price = ?"); values.push(Number(body.attributes.price)); }
      if (body.attributes?.in_stock !== undefined) { updates.push("in_stock = ?"); values.push(body.attributes.in_stock ? 1 : 0); }
      if (body.attributes?.featured !== undefined) { updates.push("featured = ?"); values.push(body.attributes.featured ? 1 : 0); }
      if (body.main_image !== undefined) { updates.push("image_url = ?"); values.push(body.main_image); }
      if (body.attributes?.specs !== undefined) { updates.push("specs = ?"); values.push(body.attributes.specs); }
      if (body.description !== undefined) { updates.push("description = ?"); values.push(body.description); }

      if (updates.length > 0) {
        updates.push("updated_at = ?");
        values.push(new Date().toISOString());
        values.push(prodId);

        await env.DB.prepare(`UPDATE products SET ${updates.join(', ')} WHERE id = ?`).bind(...values).run();
      }

      return new Response(JSON.stringify({ success: true }), { status: 200 });
    }

    if (request.method === 'DELETE') {
      const url = new URL(request.url);
      const prodId = url.pathname.split('/').pop();
      if (!prodId || prodId === 'products') return new Response(JSON.stringify({ error: 'ID requerido' }), { status: 400 });

      await env.DB.prepare(`DELETE FROM products WHERE id = ?`).bind(prodId).run();
      return new Response(JSON.stringify({ success: true }), { status: 200 });
    }

    return new Response(JSON.stringify({ error: 'Método no soportado' }), { status: 405 });
  } catch (e: any) {
    console.error('Error in Admin Products D1:', e);
    return new Response(JSON.stringify({ error: 'Error interno del servidor', details: e.message }), { status: 500 });
  }
};
