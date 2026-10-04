import { getAuthPayload } from '../../../../src/core/auth/auth.js';
import { ROLE_HIERARCHY, type UserRole } from '../../../../src/core/types/user.js';
import type { Env } from '../../../../src/core/auth/auth.js';

// ─── Helpers de zona horaria VET ─────────────────────────────────────────────
function getVetDateString(date: Date): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Caracas',
    year: 'numeric', month: '2-digit', day: '2-digit',
  }).format(date); // → "YYYY-MM-DD"
}

function getVetTimeString(date: Date): string {
  return new Intl.DateTimeFormat('es-VE', {
    timeZone: 'America/Caracas',
    hour: '2-digit', minute: '2-digit', hour12: false,
  }).format(date); // → "HH:MM"
}

// ─── Endpoint: POST /api/admin/orders/close ───────────────────────────────────
export const onRequestPost: PagesFunction<Env> = async (context) => {
  const { request, env } = context;

  const auth = await getAuthPayload(request, env);
  if (!auth) {
    return new Response(JSON.stringify({ error: 'No autorizado' }), {
      status: 401, headers: { 'Content-Type': 'application/json' },
    });
  }

  if (ROLE_HIERARCHY[auth.role as UserRole] < ROLE_HIERARCHY['encargado']) {
    return new Response(JSON.stringify({ error: 'Rol insuficiente' }), {
      status: 403, headers: { 'Content-Type': 'application/json' },
    });
  }

  try {
    const now = new Date();
    const vetDate = getVetDateString(now);
    const vetTime = getVetTimeString(now);
    const yymmdd = now.getFullYear().toString().slice(-2) + 
                   String(now.getMonth() + 1).padStart(2, '0') + 
                   String(now.getDate()).padStart(2, '0');
    const rand = crypto.randomUUID().substring(0, 4).toUpperCase();
    const closureId = `ZC-${yymmdd}-${rand}`;

    // Ejecución atómica con D1 batch
    await env.DB.batch([
      env.DB.prepare(`
        INSERT INTO cash_closures (
          id, date, time_closed, closed_by, order_count, total_amount,
          total_pago_movil, total_transferencia, total_zelle, total_binance, total_efectivo
        )
        SELECT
          ?, ?, ?, ?,
          COUNT(id),
          COALESCE(SUM(total), 0),
          COALESCE(SUM(CASE WHEN payment_method = 'pago_movil' THEN total ELSE 0 END), 0),
          COALESCE(SUM(CASE WHEN payment_method = 'transferencia' THEN total ELSE 0 END), 0),
          COALESCE(SUM(CASE WHEN payment_method = 'zelle' THEN total ELSE 0 END), 0),
          COALESCE(SUM(CASE WHEN payment_method = 'binance' THEN total ELSE 0 END), 0),
          COALESCE(SUM(CASE WHEN payment_method = 'efectivo' THEN total ELSE 0 END), 0)
        FROM orders
        WHERE status = 'approved' AND closure_id IS NULL
        HAVING COUNT(id) > 0
      `).bind(closureId, vetDate, vetTime, auth.sub),
      
      env.DB.prepare(`
        UPDATE orders SET closure_id = ?
        WHERE status = 'approved' AND closure_id IS NULL
      `).bind(closureId),
    ]);

    // Releer el cierre creado
    const closure = await env.DB.prepare(`SELECT * FROM cash_closures WHERE id = ?`).bind(closureId).first() as any;

    if (!closure) {
      return new Response(
        JSON.stringify({ error: 'No hay órdenes aprobadas pendientes de cierre.' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } },
      );
    }

    return new Response(
      JSON.stringify({
        success: true,
        closure_id: closure.id,
        date: closure.date,
        time_closed: closure.time_closed,
        order_count: closure.order_count,
        total_amount: closure.total_amount,
        totals: {
          pago_movil: closure.total_pago_movil,
          transferencia: closure.total_transferencia,
          zelle: closure.total_zelle,
          binance: closure.total_binance,
          efectivo: closure.total_efectivo
        },
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } },
    );

  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error('[admin/orders/close] Error:', msg);
    return new Response(
      JSON.stringify({ error: 'Error interno al procesar el cierre', details: msg }),
      { status: 500, headers: { 'Content-Type': 'application/json' } },
    );
  }
};

// ─── Endpoint: GET /api/admin/orders/close (listado de cierres) ───────────────
export const onRequestGet: PagesFunction<Env> = async (context) => {
  const { request, env } = context;

  const auth = await getAuthPayload(request, env);
  if (!auth) {
    return new Response(JSON.stringify({ error: 'No autorizado' }), {
      status: 401, headers: { 'Content-Type': 'application/json' },
    });
  }

  try {
    const url = new URL(request.url);
    const startDate = url.searchParams.get('startDate');
    const endDate = url.searchParams.get('endDate');
    const search = url.searchParams.get('search')?.trim();
    const paymentMethod = url.searchParams.get('paymentMethod')?.trim();
    const page = Math.max(0, parseInt(url.searchParams.get('page') || '0', 10));
    const limit = Math.max(1, Math.min(100, parseInt(url.searchParams.get('limit') || '10', 10)));
    const offset = page * limit;

    let query = `SELECT DISTINCT c.* FROM cash_closures c `;
    const params: any[] = [];
    
    let hasOrderJoin = false;
    
    if (search || (paymentMethod && paymentMethod !== 'Todos' && paymentMethod !== 'all')) {
      query += ` LEFT JOIN orders o ON o.closure_id = c.id WHERE 1=1 `;
      hasOrderJoin = true;
    } else {
      query += ` WHERE 1=1 `;
    }

    if (search) {
      query += ` AND (c.id LIKE ? OR c.closed_by LIKE ? OR o.id LIKE ? OR o.customer_name LIKE ? OR o.customer_phone LIKE ?)`;
      params.push(`%${search}%`, `%${search}%`, `%${search}%`, `%${search}%`, `%${search}%`);
    }

    if (paymentMethod && paymentMethod !== 'Todos' && paymentMethod !== 'all') {
      query += ` AND o.payment_method = ?`;
      params.push(paymentMethod);
    }

    if (startDate) {
      query += ` AND c.date >= ?`;
      params.push(startDate);
    }
    if (endDate) {
      query += ` AND c.date <= ?`;
      params.push(endDate);
    }

    const countQuery = query.replace('SELECT DISTINCT c.*', 'SELECT COUNT(DISTINCT c.id) as c');
    const countRes = await env.DB.prepare(countQuery).bind(...params).first() as {c: number} | null;
    const totalCount = countRes?.c || 0;

    query += ` ORDER BY c.created_at DESC LIMIT ? OFFSET ?`;
    params.push(limit, offset);

    const { results } = await env.DB.prepare(query).bind(...params).all() as any;
    
    if (results.length > 0) {
      const closureIds = results.map((r: any) => r.id);
      const placeholders = closureIds.map(() => '?').join(',');
      
      const { results: orders } = await env.DB.prepare(`
        SELECT id, customer_name, customer_phone, delivery_type, total, status, payment_method, closure_id, created_at, updated_at
        FROM orders 
        WHERE closure_id IN (${placeholders})
      `).bind(...closureIds).all() as any;
      
      const { results: orderItems } = await env.DB.prepare(`
        SELECT oi.order_id, oi.product_id AS id, oi.product_title AS title, oi.unit_price AS price, oi.quantity
        FROM order_items oi
        JOIN orders o ON oi.order_id = o.id
        WHERE o.closure_id IN (${placeholders})
      `).bind(...closureIds).all() as any;

      const itemsByOrder = new Map();
      for (const item of orderItems) {
        if (!itemsByOrder.has(item.order_id)) itemsByOrder.set(item.order_id, []);
        itemsByOrder.get(item.order_id).push(item);
      }

      for (const o of orders) {
        o.items = itemsByOrder.get(o.id) || [];
      }
      
      for (const c of results) {
        c.orders = orders.filter((o: any) => o.closure_id === c.id);
        if (paymentMethod && paymentMethod !== 'Todos' && paymentMethod !== 'all') {
          c.orders = c.orders.filter((o: any) => o.payment_method === paymentMethod);
        }
      }
    }

    return new Response(
      JSON.stringify({ closures: results, totalCount, page, limit }),
      { status: 200, headers: { 'Content-Type': 'application/json' } },
    );
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    return new Response(
      JSON.stringify({ error: 'Error al obtener cierres', details: msg }),
      { status: 500, headers: { 'Content-Type': 'application/json' } },
    );
  }
};
