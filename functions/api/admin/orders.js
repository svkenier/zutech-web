import { getAuthPayload } from '../../../src/core/auth/auth.js';
export const onRequest = async (context) => {
    const { request, env } = context;
    if (request.method === 'OPTIONS')
        return new Response(null, { status: 204 });
    const auth = await getAuthPayload(request, env);
    if (!auth) {
        return new Response(JSON.stringify({ error: 'No autorizado' }), { status: 401 });
    }
    try {
        if (request.method === 'GET') {
            const { results } = await env.DB.prepare(`
        SELECT * FROM orders ORDER BY created_at DESC
      `).all();
            const validOrders = results.map((row) => ({
                id: row.id,
                client: { name: row.customer_name, phone: row.customer_phone },
                delivery: { method: row.delivery_type, address: row.delivery_address },
                items: JSON.parse(row.items),
                totalUSD: row.total,
                status: row.status,
                created_at: row.created_at,
                updated_at: row.updated_at
            }));
            return new Response(JSON.stringify({ records: validOrders }), { status: 200, headers: { 'Content-Type': 'application/json' } });
        }
        if (request.method === 'PUT') {
            const url = new URL(request.url);
            const urlId = url.pathname.split('/').pop();
            let orderId = urlId === 'orders' ? null : urlId;
            const body = await request.json();
            if (!orderId && body.id)
                orderId = body.id;
            if (!orderId) {
                return new Response(JSON.stringify({ error: 'ID requerido' }), { status: 400 });
            }
            if (body.action === 'purge_pending') {
                // Special admin action to purge pending orders > 7 days old
                await env.DB.prepare(`
          DELETE FROM orders WHERE status = 'pending' AND created_at < date('now', '-7 days')
        `).run();
                return new Response(JSON.stringify({ success: true }), { status: 200 });
            }
            const updates = [];
            const values = [];
            if (body.action === 'approve') {
                updates.push("status = ?");
                values.push('approved');
            }
            else if (body.action === 'revert') {
                updates.push("status = ?");
                values.push('pending');
            }
            else if (body.action === 'discard') {
                updates.push("status = ?");
                values.push('discarded');
            }
            if (body.updates?.items) {
                updates.push("items = ?");
                values.push(JSON.stringify(body.updates.items));
            }
            if (body.updates?.totalUSD !== undefined) {
                updates.push("total = ?");
                values.push(Number(body.updates.totalUSD));
            }
            // Also support direct status/items/total updates if provided
            if (body.status) {
                updates.push("status = ?");
                values.push(body.status);
            }
            if (body.items) {
                updates.push("items = ?");
                values.push(JSON.stringify(body.items));
            }
            if (body.totalUSD !== undefined) {
                updates.push("total = ?");
                values.push(Number(body.totalUSD));
            }
            if (updates.length > 0) {
                updates.push("updated_at = ?");
                values.push(new Date().toISOString());
                values.push(orderId);
                await env.DB.prepare(`
          UPDATE orders SET ${updates.join(', ')} WHERE id = ?
        `).bind(...values).run();
            }
            return new Response(JSON.stringify({ success: true }), { status: 200, headers: { 'Content-Type': 'application/json' } });
        }
        if (request.method === 'DELETE') {
            const url = new URL(request.url);
            const orderId = url.pathname.split('/').pop();
            if (!orderId || orderId === 'orders') {
                return new Response(JSON.stringify({ error: 'ID requerido' }), { status: 400 });
            }
            await env.DB.prepare(`DELETE FROM orders WHERE id = ?`).bind(orderId).run();
            return new Response(JSON.stringify({ success: true }), { status: 200, headers: { 'Content-Type': 'application/json' } });
        }
        return new Response(JSON.stringify({ error: 'Método no soportado' }), { status: 405 });
    }
    catch (e) {
        console.error('Error in Admin Orders D1:', e);
        return new Response(JSON.stringify({ error: 'Error interno del servidor', details: e.message }), { status: 500 });
    }
};
