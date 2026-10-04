import { z } from 'zod';
import { getOrderRateLimit, checkRateLimit } from '../../../src/core/auth/rate-limit.js';
import type { Env } from '../../../src/core/auth/auth.js';
import { round2 } from '../../../src/core/utils/math.js';

const OrderItemSchema = z.object({
  id: z.string(),
  title: z.string(),
  quantity: z.number().int().positive(),
  price: z.number().nonnegative(),
});

const OrderSchema = z.object({
  client: z.object({
    name: z.string().min(2).max(100),
    phone: z.string().min(5).max(30),
  }),
  delivery: z.object({
    method: z.enum(['pickup', 'delivery']),
    address: z.string().max(500).optional(),
  }).optional(),
  items: z.array(OrderItemSchema).min(1),
  totalUSD: z.number().nonnegative(),
  payment_method: z.string().optional(),
});

function generateOrderId() {
  const d = new Date();
  const yymmdd = d.getFullYear().toString().slice(-2) + 
                 String(d.getMonth() + 1).padStart(2, '0') + 
                 String(d.getDate()).padStart(2, '0');
  const rand = crypto.randomUUID().substring(0, 4).toUpperCase();
  return `ZT-${yymmdd}-${rand}`;
}

export const onRequest: PagesFunction<Env> = async (context) => {
  const { request, env } = context;

  if (request.method === 'OPTIONS') return new Response(null, { status: 204 });

  if (request.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Método no permitido' }), { status: 405 });
  }

  try {
    const ip = request.headers.get('cf-connecting-ip') ?? '127.0.0.1';
    const limitRes = await checkRateLimit(getOrderRateLimit(env), ip);
    
    if (!limitRes.success) {
      return new Response(JSON.stringify({ error: 'Demasiadas peticiones. Intenta más tarde.' }), { 
        status: 429, 
        headers: {
          'X-RateLimit-Limit': limitRes.limit.toString(),
          'X-RateLimit-Remaining': limitRes.remaining.toString()
        } 
      });
    }

    const rawBody = await request.json() as any;
    
    // Validar orden con Zod
    const validationResult = OrderSchema.safeParse(rawBody);
    if (!validationResult.success) {
      return new Response(JSON.stringify({ error: 'Payload inválido', details: validationResult.error.issues }), { status: 400 });
    }

    const validData = validationResult.data;
    
    // Fusionar líneas duplicadas enviadas por el cliente
    const mergedItems = new Map<string, { id: string; title: string; price: number; quantity: number }>();
    for (const item of validData.items) {
      if (mergedItems.has(item.id)) {
        const existing = mergedItems.get(item.id)!;
        existing.quantity += item.quantity;
      } else {
        mergedItems.set(item.id, { ...item });
      }
    }
    const uniqueItems = Array.from(mergedItems.values());

    const productIds = uniqueItems.map(item => item.id);
    const placeholders = productIds.map(() => '?').join(', ');
    
    // Solo cargamos productos que estén is_active = 1
    const { results } = await env.DB.prepare(`
      SELECT id, title, price, in_stock FROM products WHERE id IN (${placeholders}) AND is_active = 1
    `).bind(...productIds).all() as any;
    
    const dbProducts = new Map<string, { title: string, price: number, in_stock: number }>();
    for (const row of results) {
      dbProducts.set(row.id, { title: row.title, price: row.price, in_stock: row.in_stock });
    }

    let realTotal = 0;
    const validatedLines = [];
    const changedPrices = [];

    for (const clientItem of uniqueItems) {
      const dbProd = dbProducts.get(clientItem.id);
      
      if (!dbProd || dbProd.in_stock === 0) {
        return new Response(JSON.stringify({ error: `Producto no válido, archivado o fuera de stock (ID: ${clientItem.id})` }), { 
          status: 400, 
          headers: { 'Content-Type': 'application/json' } 
        });
      }
      
      const officialPrice = round2(dbProd.price);
      const clientPrice = round2(clientItem.price);
      
      if (officialPrice !== clientPrice) {
        changedPrices.push({
          id: clientItem.id,
          title: dbProd.title,
          seen: clientPrice,
          current: officialPrice
        });
      }

      realTotal += round2(dbProd.price * clientItem.quantity);
      validatedLines.push({
        product_id: clientItem.id,
        product_title: dbProd.title, // blindaje de nombre oficial
        quantity: clientItem.quantity,
        unit_price: officialPrice
      });
    }

    realTotal = round2(realTotal);

    if (changedPrices.length > 0 || realTotal !== round2(validData.totalUSD)) {
      return new Response(JSON.stringify({
        error: 'Los precios del catálogo han cambiado',
        code: 'PRICE_CHANGED',
        changed: changedPrices
      }), {
        status: 409,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const orderId = generateOrderId();
    const now = new Date().toISOString();
    const deliveryType = validData.delivery?.method || 'pickup';

    const insertOrderStmt = env.DB.prepare(`
      INSERT INTO orders (id, customer_name, customer_phone, delivery_type, payment_method, total, status, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).bind(
      orderId,
      validData.client.name,
      validData.client.phone,
      deliveryType,
      validData.payment_method || null,
      realTotal,
      'pending',
      now,
      now
    );

    const insertLinesStmts = validatedLines.map(line => 
      env.DB.prepare(`
        INSERT INTO order_items (order_id, product_id, product_title, quantity, unit_price)
        VALUES (?, ?, ?, ?, ?)
      `).bind(orderId, line.product_id, line.product_title, line.quantity, line.unit_price)
    );

    await env.DB.batch([insertOrderStmt, ...insertLinesStmts]);

    return new Response(JSON.stringify({ success: true, orderId }), { 
      status: 201, 
      headers: { 'Content-Type': 'application/json' } 
    });

  } catch (err: any) {
    console.error('Error creating public order:', err);
    return new Response(JSON.stringify({ error: 'Error interno del servidor', details: err.message }), { 
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};
