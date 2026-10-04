import { getAuthPayload } from '../../../src/core/auth/auth.js';
import { ROLE_LEVEL, type UserRole } from '../../../src/core/types/user.js';
import type { Env } from '../../../src/core/auth/auth.js';

// ─── Status mapping ───────────────────────────────────────────────────────────
// Compatibilidad con registros legacy en inglés (pending/approved/discarded)
function normalizeStatus(s: string): string {
  if (s === 'pending')   return 'pending';
  if (s === 'approved')  return 'approved';
  if (s === 'discarded') return 'discarded';
  return s; // ya está en español
}

function mapOrderRow(row: Record<string, unknown>) {
  const items = (() => {
    try { return JSON.parse(row.items as string); }
    catch { return []; }
  })();
  return {
    id: row.id,
    client:   { name: row.customer_name, phone: row.customer_phone },
    delivery: { method: row.delivery_type, address: row.delivery_address },
    items,
    totalUSD:       row.total,
    payment_method: row.payment_method ?? null,
    closure_id:     row.closure_id ?? null,
    status:         normalizeStatus(row.status as string),
    created_at:     row.created_at,
    updated_at:     row.updated_at,
  };
}

// ─── Validación de payment_method ────────────────────────────────────────────
const PAYMENT_METHODS = ['pago_movil', 'zelle', 'efectivo'] as const;
type PaymentMethod = typeof PAYMENT_METHODS[number];

function isValidPaymentMethod(v: unknown): v is PaymentMethod {
  return PAYMENT_METHODS.includes(v as PaymentMethod);
}

// ─── Handler principal ────────────────────────────────────────────────────────
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
    // ─── GET: listado con purga perezosa ─────────────────────────────────────
    if (request.method === 'GET') {
      // Purga silenciosa: eliminar pendientes con más de 7 días sin cerrar
      await env.DB.prepare(`
        DELETE FROM orders
        WHERE status = 'pending'
          AND closure_id IS NULL
          AND created_at < datetime('now', '-7 days')
      `).run();

      // Retornar solo órdenes activas (sin closure_id asignado)
      const { results } = await env.DB.prepare(`
        SELECT * FROM orders WHERE closure_id IS NULL ORDER BY created_at DESC
      `).all() as any;

      return new Response(
        JSON.stringify({ records: results.map(mapOrderRow) }),
        { status: 200, headers: { 'Content-Type': 'application/json' } },
      );
    }

    // ─── PUT: mutación de estado / edición ───────────────────────────────────
    if (request.method === 'PUT') {
      const body = await request.json() as Record<string, unknown>;
      const now = new Date().toISOString();

      // Resolver ID (soporta body.id o último segmento de URL)
      const url = new URL(request.url);
      const urlSegment = url.pathname.split('/').pop();
      const orderId = (body.id as string) || (urlSegment !== 'orders' ? urlSegment : null);

      if (!orderId) {
        return new Response(JSON.stringify({ error: 'ID de orden requerido' }), { status: 400 });
      }

      const action = body.action as string;

      // Acción: aprobar
      if (action === 'aprobar') {
        if (!isValidPaymentMethod(body.payment_method)) {
          return new Response(
            JSON.stringify({ error: 'payment_method inválido. Valores aceptados: pago_movil, zelle, efectivo' }),
            { status: 400, headers: { 'Content-Type': 'application/json' } },
          );
        }
        await env.DB.prepare(`
          UPDATE orders
          SET status = 'approved', payment_method = ?, updated_at = ?
          WHERE id = ? AND status = 'pending'
        `).bind(body.payment_method, now, orderId).run();
        return new Response(JSON.stringify({ success: true }), { status: 200, headers: { 'Content-Type': 'application/json' } });
      }

      // Acción: revertir (solo si sin closure_id)
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

      // Acción: descartar (elimina la fila, solo desde pendiente y sin cierre)
      if (action === 'descartar') {
        await env.DB.prepare(`
          DELETE FROM orders WHERE id = ? AND closure_id IS NULL
        `).bind(orderId).run();
        return new Response(JSON.stringify({ success: true }), { status: 200, headers: { 'Content-Type': 'application/json' } });
      }

      // Acción: editar ítems / total (compatibilidad con OrderEditModal)
      if (action === 'edit') {
        const updates = body.updates as Record<string, unknown> | undefined;
        const fields: string[] = [];
        const vals: unknown[] = [];

        if (updates?.items) { fields.push('items = ?'); vals.push(JSON.stringify(updates.items)); }
        if (updates?.totalUSD !== undefined) { fields.push('total = ?'); vals.push(Number(updates.totalUSD)); }

        if (fields.length === 0) {
          return new Response(JSON.stringify({ error: 'Nada que actualizar' }), { status: 400 });
        }
        fields.push('updated_at = ?');
        vals.push(now, orderId);

        await env.DB.prepare(`UPDATE orders SET ${fields.join(', ')} WHERE id = ?`).bind(...vals).run();
        return new Response(JSON.stringify({ success: true }), { status: 200, headers: { 'Content-Type': 'application/json' } });
      }

      return new Response(JSON.stringify({ error: `Acción desconocida: ${action}` }), { status: 400 });
    }

    // ─── DELETE: borrar orden por ID ─────────────────────────────────────────
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
