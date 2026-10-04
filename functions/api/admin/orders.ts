import { getAuthPayload } from '../../../src/core/auth/auth.js';
import type { Env } from '../../../src/core/auth/auth.js';
import { round2 } from '../../../src/core/utils/math.js';

const PAYMENT_METHODS = ['pago_movil', 'zelle', 'efectivo', 'transferencia', 'binance'] as const;
type PaymentMethod = typeof PAYMENT_METHODS[number];

function isValidPaymentMethod(v: unknown): v is PaymentMethod {
  return PAYMENT_METHODS.includes(v as PaymentMethod);
}

export const onRequest: PagesFunction<Env> = async (context) => {
  const { request, env } = context;

  if (request.method === 'OPTIONS') return new Response(null, { status: 204 });

  const auth = await getAuthPayload(request, env);
  if (!auth) {
    return new Response(JSON.stringify({ error: 'No autorizado' }), {
      status: 401, headers: { 'Content-Type': 'application/json' },
    });
  }

  try {
    if (request.method === 'GET') {
      // Purga silenciosa: eliminar pendientes con más de 7 días sin cerrar
      await env.DB.prepare(`
        DELETE FROM orders
        WHERE status = 'pending'
          AND closure_id IS NULL
          AND created_at < datetime('now', '-7 days')
      `).run();

      const { results: ordersRows } = await env.DB.prepare(`
        SELECT id, customer_name, customer_phone, delivery_type, total, status, payment_method, closure_id, created_at, updated_at
        FROM orders 
        WHERE closure_id IS NULL 
        ORDER BY created_at DESC
      `).all() as any;

      const { results: itemsRows } = await env.DB.prepare(`
        SELECT oi.order_id, oi.product_id AS id, oi.product_title AS title, oi.unit_price AS price, oi.quantity
        FROM order_items oi
        JOIN orders o ON oi.order_id = o.id
        WHERE o.closure_id IS NULL
        ORDER BY oi.id ASC
      `).all() as any;

      const itemsByOrder = new Map();
      for (const item of itemsRows) {
        if (!itemsByOrder.has(item.order_id)) itemsByOrder.set(item.order_id, []);
        itemsByOrder.get(item.order_id).push({
          id: item.id,
          title: item.title,
          price: item.price,
          quantity: item.quantity
        });
      }

      const records = ordersRows.map((row: any) => ({
        id: row.id,
        client: { name: row.customer_name, phone: row.customer_phone },
        delivery: { method: row.delivery_type },
        items: itemsByOrder.get(row.id) || [],
        totalUSD: row.total,
        payment_method: row.payment_method ?? null,
        closure_id: row.closure_id ?? null,
        status: row.status,
        created_at: row.created_at,
        updated_at: row.updated_at,
      }));

      return new Response(
        JSON.stringify({ records }),
        { status: 200, headers: { 'Content-Type': 'application/json' } },
      );
    }

    if (request.method === 'PUT') {
      const body = await request.json() as Record<string, unknown>;
      const now = new Date().toISOString();

      const url = new URL(request.url);
      const urlSegment = url.pathname.split('/').pop();
      const orderId = (body.id as string) || (urlSegment !== 'orders' ? urlSegment : null);

      if (!orderId) {
        return new Response(JSON.stringify({ error: 'ID de orden requerido' }), { status: 400 });
      }

      const action = body.action as string;

      if (action === 'aprobar') {
        if (!isValidPaymentMethod(body.payment_method)) {
          return new Response(
            JSON.stringify({ error: `payment_method inválido. Valores aceptados: ${PAYMENT_METHODS.join(', ')}` }),
            { status: 400, headers: { 'Content-Type': 'application/json' } },
          );
        }
        const result = await env.DB.prepare(`
          UPDATE orders
          SET status = 'approved', payment_method = ?, updated_at = ?
          WHERE id = ? AND status = 'pending'
        `).bind(body.payment_method, now, orderId).run();
        
        if (result.meta.changes === 0) {
          return new Response(JSON.stringify({ error: 'La orden no existe o ya estaba aprobada' }), { status: 409, headers: { 'Content-Type': 'application/json' } });
        }

        return new Response(JSON.stringify({ success: true }), { status: 200, headers: { 'Content-Type': 'application/json' } });
      }

      if (action === 'revertir') {
        const existing = await env.DB.prepare(`SELECT closure_id FROM orders WHERE id = ?`).bind(orderId).first() as { closure_id: string | null } | null;
        if (!existing) {
          return new Response(JSON.stringify({ error: 'Orden no encontrada' }), { status: 404 });
        }
        if (existing.closure_id) {
          return new Response(
            JSON.stringify({ error: 'No se puede revertir una orden que ya forma parte de un cierre de caja.' }),
            { status: 409, headers: { 'Content-Type': 'application/json' } },
          );
        }
        await env.DB.prepare(`
          UPDATE orders SET status = 'pending', payment_method = NULL, updated_at = ?
          WHERE id = ? AND closure_id IS NULL
        `).bind(now, orderId).run();
        return new Response(JSON.stringify({ success: true }), { status: 200, headers: { 'Content-Type': 'application/json' } });
      }

      if (action === 'descartar') {
        const result = await env.DB.prepare(`
          DELETE FROM orders WHERE id = ? AND status = 'pending' AND closure_id IS NULL
        `).bind(orderId).run();
        
        if (result.meta.changes === 0) {
          return new Response(JSON.stringify({ error: 'No se pudo descartar (orden no existe, no es pendiente o ya está en un cierre)' }), { status: 409, headers: { 'Content-Type': 'application/json' } });
        }
        return new Response(JSON.stringify({ success: true }), { status: 200, headers: { 'Content-Type': 'application/json' } });
      }

      if (action === 'edit') {
        const updates = body.updates as any;
        if (!updates?.items || !Array.isArray(updates.items)) {
          return new Response(JSON.stringify({ error: 'Faltan ítems' }), { status: 400 });
        }

        const existing = await env.DB.prepare(`SELECT status, closure_id FROM orders WHERE id = ?`).bind(orderId).first() as any;
        if (!existing || existing.status !== 'pending' || existing.closure_id !== null) {
          return new Response(JSON.stringify({ error: 'Solo se pueden editar órdenes pendientes sin cierre' }), { status: 409, headers: { 'Content-Type': 'application/json' } });
        }

        let newTotal = 0;
        const insertLinesStmts = [];
        
        const deleteLinesStmt = env.DB.prepare(`DELETE FROM order_items WHERE order_id = ?`).bind(orderId);

        for (const item of updates.items) {
          const qty = Math.max(1, Number(item.quantity) || 1);
          const p = round2(Number(item.price) || 0);
          newTotal += round2(qty * p);
          
          insertLinesStmts.push(
            env.DB.prepare(`
              INSERT INTO order_items (order_id, product_id, product_title, quantity, unit_price)
              VALUES (?, ?, ?, ?, ?)
            `).bind(orderId, item.id, item.title || 'Producto', qty, p)
          );
        }

        newTotal = round2(newTotal);

        const updateOrderStmt = env.DB.prepare(`
          UPDATE orders SET total = ?, updated_at = ? WHERE id = ?
        `).bind(newTotal, now, orderId);

        await env.DB.batch([
          deleteLinesStmt,
          ...insertLinesStmts,
          updateOrderStmt
        ]);

        return new Response(JSON.stringify({ success: true }), { status: 200, headers: { 'Content-Type': 'application/json' } });
      }

      return new Response(JSON.stringify({ error: `Acción desconocida: ${action}` }), { status: 400 });
    }

    if (request.method === 'DELETE') {
      const url = new URL(request.url);
      const orderId = url.pathname.split('/').pop();
      if (!orderId || orderId === 'orders') {
        return new Response(JSON.stringify({ error: 'ID requerido' }), { status: 400 });
      }
      await env.DB.prepare(`DELETE FROM orders WHERE id = ? AND closure_id IS NULL`).bind(orderId).run();
      return new Response(JSON.stringify({ success: true }), { status: 200, headers: { 'Content-Type': 'application/json' } });
    }

    return new Response(JSON.stringify({ error: 'Método no soportado' }), { status: 405 });

  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error('[admin/orders] Error:', msg);
    return new Response(
      JSON.stringify({ error: 'Error interno del servidor', details: msg }),
      { status: 500, headers: { 'Content-Type': 'application/json' } },
    );
  }
};
