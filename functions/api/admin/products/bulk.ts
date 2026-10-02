import { getAuthPayload } from '../../../../src/core/auth/auth.js';
import type { Env } from '../../../../src/core/auth/auth.js';
import { putFile } from '../../../../src/core/storage/r2.js';

function normalizeString(str: string): string {
  return (str || '').normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-zA-Z0-9]/g, '').trim();
}

async function generateShortHash(text: string): Promise<string> {
  const msgUint8 = new TextEncoder().encode(text);
  const hashBuffer = await crypto.subtle.digest('SHA-256', msgUint8);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  return hashHex.substring(0, 6).toUpperCase();
}
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
    
    // Extraer y procesar marcas únicas del lote
    const newBrands = [...new Set(products.map((p: any) => p.marca?.trim()).filter(Boolean))] as string[];
    const brandMap = new Map<string, string>();
    if (newBrands.length > 0) {
      const brandStmts = newBrands.map(name => 
        env.DB.prepare(`INSERT OR IGNORE INTO brands (id, name) VALUES (?, ?)`).bind(crypto.randomUUID(), name)
      );
      if (brandStmts.length > 0) {
        await env.DB.batch(brandStmts);
      }
      
      const placeHolders = newBrands.map(() => '?').join(',');
      const dbBrands = await env.DB.prepare(`SELECT id, name FROM brands WHERE name IN (${placeHolders})`).bind(...newBrands).all();
      if (dbBrands.results) {
        for (const b of dbBrands.results as any[]) {
          brandMap.set(b.name, b.id);
        }
      }
    }
    
    // Process uploads sequentially or in small parallel batches
    for (const p of products) {
      let finalImageUrl = p.imagenUrl || '';
      if (p.removeImage) {
        finalImageUrl = '__REMOVE__';
      }
      
      let skuToInsert = p.sku;
      if (!skuToInsert) {
        const catPrefix = normalizeString(p.categoria).substring(0, 3).toUpperCase();
        const brandPrefix = normalizeString(p.marca).substring(0, 3).toUpperCase();
        const titleHash = await generateShortHash((p.nombre || '').toLowerCase().trim());
        skuToInsert = `${catPrefix}-${brandPrefix}-${titleHash}`;
      }
      
      if (p.imagenBase64) {
        try {
          const r2Path = `products/${skuToInsert}.webp`;
          
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
          finalImageUrl = r2Path; // Solo guardar ruta relativa
          console.log(`[Admin Bulk] R2 Upload Success. Path: ${finalImageUrl}`);
        } catch (err: any) {
          console.error(`[Admin Bulk] R2 Upload Error for ${p.nombre}:`, err);
          results.push({ id: p.id, status: 'error', error: 'Error R2' });
          continue; // skip this product
        }
      }

      statements.push(
        env.DB.prepare(`
          INSERT INTO products (id, sku, title, brand, category, price, in_stock, featured, image_url, specs, description, created_at, updated_at)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
          ON CONFLICT(sku) DO UPDATE SET
            title = excluded.title,
            brand = excluded.brand,
            category = excluded.category,
            price = excluded.price,
            in_stock = excluded.in_stock,
            image_url = CASE 
              WHEN excluded.image_url = '__REMOVE__' THEN NULL
              WHEN excluded.image_url IS NOT NULL AND excluded.image_url != '' THEN excluded.image_url 
              ELSE products.image_url 
            END,
            description = excluded.description,
            updated_at = excluded.updated_at
        `).bind(
          p.id,
          skuToInsert,
          p.nombre,
          brandMap.get(p.marca?.trim()) || null, // Guardar el ID de la marca
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
