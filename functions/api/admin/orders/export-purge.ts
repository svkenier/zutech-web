import { getAuthPayload } from '../../../../src/core/auth/auth.js';
import { ROLE_LEVEL, type UserRole } from '../../../../src/core/types/user.js';
import type { Env } from '../../../../src/core/auth/auth.js';

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
      const { results: closures } = await env.DB.prepare(
        `SELECT * FROM cash_closures ORDER BY created_at ASC`
      ).all() as any;

      const { results: closedOrders } = await env.DB.prepare(
        `SELECT id, customer_name, customer_phone, delivery_type, total, status, payment_method, closure_id, created_at, updated_at 
         FROM orders WHERE closure_id IS NOT NULL ORDER BY created_at ASC`
      ).all() as any;

      const { results: orderItems } = await env.DB.prepare(
        `SELECT oi.order_id, oi.product_id AS id, oi.product_title AS title, oi.unit_price AS price, oi.quantity
         FROM order_items oi
         JOIN orders o ON oi.order_id = o.id
         WHERE o.closure_id IS NOT NULL`
      ).all() as any;

      if (closures.length === 0) {
        return new Response(
          JSON.stringify({ error: 'No hay cierres de caja para exportar.' }),
          { status: 400, headers: { 'Content-Type': 'application/json' } },
        );
      }

      const itemsByOrder = new Map();
      for (const item of orderItems) {
        if (!itemsByOrder.has(item.order_id)) itemsByOrder.set(item.order_id, []);
        itemsByOrder.get(item.order_id).push(item);
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
            items: itemsByOrder.get(o.id) || []
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
