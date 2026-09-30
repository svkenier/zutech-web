import { getAuthPayload } from '../../../../src/core/auth/auth.js';
import type { Env } from '../../../../src/core/auth/auth.js';
import { putFile, cdnImageUrl } from '../../../../src/core/storage/r2.js';

export const onRequestPost: PagesFunction<Env> = async (context) => {
  const { request, env } = context;
  const auth = await getAuthPayload(request, env);
  if (!auth) {
    return new Response(JSON.stringify({ error: 'No autorizado' }), { status: 401, headers: { 'Content-Type': 'application/json' } });
  }

  try {
    const body = await request.json() as any;
    const products = body.products || [];
    const now = new Date().toISOString();
    
    const statements: D1PreparedStatement[] = [];
    const results: any[] = [];
    
    // Process uploads sequentially or in small parallel batches
    for (const p of products) {
      let finalImageUrl = p.imagenUrl || '';
      
      if (p.imagenBase64) {
        try {
          const uniqueSuffix = Math.random().toString(36).substring(7);
          const r2Path = `products/${p.id}-${uniqueSuffix}.webp`;
          
          let fileContent: ArrayBuffer | string = p.imagenBase64;
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
          console.error(`[Admin Bulk] R2 Upload Error for ${p.nombre}:`, err);
          results.push({ id: p.id, status: 'error', error: 'Error R2' });
          continue; // skip this product
        }
      }

      statements.push(
        env.DB.prepare(`
          INSERT INTO products (id, title, brand, category, price, in_stock, featured, image_url, specs, description, created_at, updated_at)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
          ON CONFLICT(id) DO UPDATE SET
            title = excluded.title,
            category = excluded.category,
            price = excluded.price,
            in_stock = excluded.in_stock,
            image_url = CASE WHEN excluded.image_url != '' THEN excluded.image_url ELSE products.image_url END,
            description = excluded.description,
            updated_at = excluded.updated_at
        `).bind(
          p.id,
          p.nombre,
          '', // brand
          p.categoria,
          Number(p.precio) || 0,
          p.in_stock ? 1 : 0,
          0, // featured
          finalImageUrl,
          '', // specs
          p.descripcion || '',
          now,
          now
        )
      );
      results.push({ id: p.id, status: 'success' });
    }

    if (statements.length > 0) {
      await env.DB.batch(statements);
    }

    return new Response(JSON.stringify({ success: true, results }), { status: 200, headers: { 'Content-Type': 'application/json' } });
  } catch (e: any) {
    console.error('Error in Admin Bulk POST:', e);
    return new Response(JSON.stringify({ error: `Error interno del servidor - ${e.message}` }), { status: 500, headers: { 'Content-Type': 'application/json' } });
  }
};
