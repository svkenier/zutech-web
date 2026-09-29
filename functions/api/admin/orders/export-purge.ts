import { getAuthPayload } from '../../../../src/core/auth/auth.js';
import { ROLE_LEVEL, type UserRole } from '../../../../src/core/types/user.js';
import type { Env } from '../../../../src/core/auth/auth.js';

/**
 * POST /api/admin/orders/export-purge
 *
 * Flujo de dos pasos para evitar pérdida de datos:
 *   - action = "export"  → Devuelve el JSON como archivo descargable. NO purga.
 *   - action = "purge"   → Borra los datos ya cerrados de D1 (requiere que haya cierres).
 *
 * El frontend debe llamar a "export" primero, confirmar que el archivo fue guardado,
 * y luego llamar a "purge" en un segundo paso explícito con confirmación del usuario.
 */
export const onRequestPost: PagesFunction<Env> = async (context) => {
  const { request, env } = context;

  const auth = await getAuthPayload(request, env);
  if (!auth) {
    return new Response(JSON.stringify({ error: 'No autorizado' }), {
      status: 401, headers: { 'Content-Type': 'application/json' },
    });
  }

  // Solo administradores pueden exportar o purgar el histórico
  if (ROLE_LEVEL[auth.role as UserRole] < ROLE_LEVEL['superadmin']) {
    return new Response(JSON.stringify({ error: 'Se requiere rol de administrador.' }), {
      status: 403, headers: { 'Content-Type': 'application/json' },
    });
  }

  try {
    const body = await request.json() as { action: 'export' | 'purge' };

    if (body.action === 'export') {
      // ── PASO 1: Exportar snapshot JSON (sin tocar la BD) ─────────────────
      const { results: closures } = await env.DB.prepare(
        `SELECT * FROM cash_closures ORDER BY created_at ASC`
      ).all();

      const { results: closedOrders } = await env.DB.prepare(
        `SELECT * FROM orders WHERE closure_id IS NOT NULL ORDER BY created_at ASC`
      ).all();

      if (closures.length === 0) {
        return new Response(
          JSON.stringify({ error: 'No hay cierres de caja para exportar.' }),
          { status: 400, headers: { 'Content-Type': 'application/json' } },
        );
      }

      const now = new Date();
      const dateLabel = new Intl.DateTimeFormat('en-CA', {
        timeZone: 'America/Caracas', year: 'numeric', month: '2-digit', day: '2-digit',
      }).format(now);

      const totalUsd = closures.reduce((acc: number, c: any) => acc + (c.total_amount || 0), 0);

      const structuredClosures = closures.map((c: any) => {
        const cOrders = closedOrders
          .filter((o: any) => o.closure_id === c.id)
          .map((o: any) => ({
            id: o.id,
            customer_name: o.customer_name,
            customer_phone: o.customer_phone,
            payment_method: o.payment_method,
            total_usd: o.total,
            items: JSON.parse(o.items || '[]')
          }));
          
        return {
          id: c.id,
          closed_at: `${c.date}T${c.time_closed}:00Z`,
          closed_by: c.closed_by,
          total_usd: c.total_amount,
          total_pago_movil: c.total_pago_movil || 0,
          total_transferencia: c.total_transferencia || 0,
          total_zelle: c.total_zelle || 0,
          total_binance: c.total_binance || 0,
          total_efectivo: c.total_efectivo || 0,
          orders: cOrders
        };
      });

      const snapshot = {
        metadata: {
          export_date: now.toISOString(),
          store: "ZuTech Store",
          exported_by: auth.sub,
          total_closures: closures.length,
          total_orders: closedOrders.length,
          total_usd: totalUsd
        },
        closures: structuredClosures
      };

      return new Response(JSON.stringify(snapshot, null, 2), {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          'Content-Disposition': `attachment; filename="zetech-historico-${dateLabel}.json"`,
        },
      });
    }

    if (body.action === 'purge') {
      // ── PASO 2: Purgar datos cerrados de D1 (atómico) ─────────────────────
      const closureCount = await env.DB.prepare(
        `SELECT COUNT(*) as cnt FROM cash_closures`
      ).first() as { cnt: number } | null;

      if (!closureCount || closureCount.cnt === 0) {
        return new Response(
          JSON.stringify({ error: 'No hay cierres de caja en la base de datos para purgar.' }),
          { status: 400, headers: { 'Content-Type': 'application/json' } },
        );
      }

      await env.DB.batch([
        env.DB.prepare(`DELETE FROM orders WHERE closure_id IS NOT NULL`),
        env.DB.prepare(`DELETE FROM cash_closures`),
      ]);

      return new Response(
        JSON.stringify({ success: true, message: 'Histórico purgado correctamente de D1.' }),
        { status: 200, headers: { 'Content-Type': 'application/json' } },
      );
    }

    return new Response(
      JSON.stringify({ error: 'action debe ser "export" o "purge".' }),
      { status: 400, headers: { 'Content-Type': 'application/json' } },
    );

  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error('[admin/orders/export-purge] Error:', msg);
    return new Response(
      JSON.stringify({ error: 'Error interno', details: msg }),
      { status: 500, headers: { 'Content-Type': 'application/json' } },
    );
  }
};
