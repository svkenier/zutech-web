import { getAuthPayload } from '../../../../src/core/auth/auth.js';
import { ROLE_LEVEL, type UserRole } from '../../../../src/core/types/user.js';
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

  if (ROLE_LEVEL[auth.role as UserRole] < ROLE_LEVEL['encargado']) {
    return new Response(JSON.stringify({ error: 'Rol insuficiente' }), {
      status: 403, headers: { 'Content-Type': 'application/json' },
    });
  }

  try {
    const body = await request.json() as { time_open?: string; notes?: string };
    const now = new Date();
    const vetDate   = getVetDateString(now);
    const vetTime   = getVetTimeString(now);
    const yymmdd = now.getFullYear().toString().slice(-2) + 
                   String(now.getMonth() + 1).padStart(2, '0') + 
                   String(now.getDate()).padStart(2, '0');
    const rand = crypto.randomUUID().substring(0, 4).toUpperCase();
    const closureId = `ZC-${yymmdd}-${rand}`;

    // 1. Obtener todas las órdenes aprobadas sin cierre
    const { results: openOrders } = (await env.DB.prepare(`
      SELECT id, total, payment_method
      FROM orders
      WHERE status = 'approved'
        AND closure_id IS NULL
    `).all()) as unknown as { results: { id: string; total: number; payment_method: string | null }[] };

    if (openOrders.length === 0) {
      return new Response(
        JSON.stringify({ error: 'No hay órdenes aprobadas pendientes de cierre.' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } },
      );
    }

    // 2. Calcular totales por método de pago
    let totalAmount = 0, totalPagoMovil = 0, totalTransferencia = 0, totalZelle = 0, totalBinance = 0, totalEfectivo = 0;
    for (const o of openOrders) {
      totalAmount += o.total;
      if (o.payment_method === 'pago_movil') totalPagoMovil += o.total;
      else if (o.payment_method === 'transferencia') totalTransferencia += o.total;
      else if (o.payment_method === 'zelle') totalZelle += o.total;
      else if (o.payment_method === 'binance') totalBinance += o.total;
      else if (o.payment_method === 'efectivo') totalEfectivo += o.total;
    }

    // 3. Ejecución atómica con D1 batch
    await env.DB.batch([
      env.DB.prepare(`
        INSERT INTO cash_closures
          (id, date, time_open, time_closed, total_amount, total_pago_movil,
           total_transferencia, total_zelle, total_binance, total_efectivo, order_count, closed_by, notes)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).bind(
        closureId,
        vetDate,
        body.time_open ?? vetTime,
        vetTime,
        totalAmount,
        totalPagoMovil,
        totalTransferencia,
        totalZelle,
        totalBinance,
        totalEfectivo,
        openOrders.length,
        auth.sub,
        body.notes ?? null,
      ),
      env.DB.prepare(`
        UPDATE orders SET closure_id = ?
        WHERE status = 'approved' AND closure_id IS NULL
      `).bind(closureId),
    ]);

    return new Response(
      JSON.stringify({
        success: true,
        closure_id: closureId,
        date: vetDate,
        time_closed: vetTime,
        order_count: openOrders.length,
        total_amount: totalAmount,
        totals: { pago_movil: totalPagoMovil, transferencia: totalTransferencia, zelle: totalZelle, binance: totalBinance, efectivo: totalEfectivo },
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

    const { results } = await env.DB.prepare(query).bind(...params).all();
    
    if (results.length > 0) {
        const closureIds = results.map((r: any) => r.id);
        const placeholders = closureIds.map(() => '?').join(',');
        const { results: orders } = await env.DB.prepare(`SELECT * FROM orders WHERE closure_id IN (${placeholders})`).bind(...closureIds).all();
        
        for (const c of results) {
            c.orders = orders.filter((o: any) => o.closure_id === c.id);
            if (paymentMethod && paymentMethod !== 'Todos' && paymentMethod !== 'all') {
              c.orders = c.orders.filter((o: any) => o.payment_method === paymentMethod);
            }
        }
    }

    // Rehydrate totals block format? Not necessary as frontend reads properties.
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
