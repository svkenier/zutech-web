import { getAuthPayload } from '../../../../src/core/auth/auth.js';
import type { Env } from '../../../../src/core/auth/auth.js';

export const onRequestGet: PagesFunction<Env> = async (context) => {
  const { request, env } = context;

  try {
    const auth = await getAuthPayload(request, env);
    if (!auth) {
      return new Response(JSON.stringify({ error: 'No autorizado' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const maxSkus: Record<string, number> = {};

    try {
      // La columna sku puede no existir si la migración 0004 aún no se ha aplicado.
      const { results } = await env.DB.prepare(
        `SELECT sku FROM products WHERE sku IS NOT NULL AND sku != ''`
      ).all() as any;

      if (results && results.length > 0) {
        for (const row of results) {
          if (row.sku && typeof row.sku === 'string') {
            const match = (row.sku as string).match(/^([A-Z]+)-(\d+)$/);
            if (match) {
              const prefix = match[1];
              const num = parseInt(match[2], 10);
              if (!maxSkus[prefix] || num > maxSkus[prefix]) {
                maxSkus[prefix] = num;
              }
            }
          }
        }
      }
    } catch (dbErr) {
      // Si la columna sku no existe aún en el entorno local (migración pendiente),
      // retornamos {} de forma segura para que el frontend arranque correlativos desde 0001.
      console.warn('[max-skus] Columna sku no disponible, retornando mapa vacío:', dbErr);
    }

    return new Response(JSON.stringify(maxSkus), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (e: any) {
    // Captura de seguridad global: nunca bloquear la mesa de staging
    console.error('[max-skus] Error inesperado:', e);
    return new Response(JSON.stringify({}), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};
