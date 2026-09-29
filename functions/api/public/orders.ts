import { z } from 'zod';
import { getOrderRateLimit, checkRateLimit } from '../../../src/core/auth/rate-limit.js';
import type { Env } from '../../../src/core/auth/auth.js';

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
    
    const productIds = Array.from(new Set(validData.items.map(item => item.id)));
    const placeholders = productIds.map(() => '?').join(', ');
    
    const { results } = await env.DB.prepare(`
      SELECT id, title, price, in_stock FROM products WHERE id IN (${placeholders})
    `).bind(...productIds).all<{ id: string, title: string, price: number, in_stock: number }>();
    
    const dbProducts = new Map<string, { title: string, price: number, in_stock: number }>();
    for (const row of results) {
      dbProducts.set(row.id, { title: row.title, price: row.price, in_stock: row.in_stock });
    }

    let realTotal = 0;
    const validatedItems = [];
    for (const clientItem of validData.items) {
      const dbProd = dbProducts.get(clientItem.id);
      if (!dbProd || dbProd.in_stock === 0) {
        return new Response(JSON.stringify({ error: `Producto no válido o fuera de stock (ID: ${clientItem.id})` }), { 
          status: 400, 
          headers: { 'Content-Type': 'application/json' } 
        });
      }
      realTotal += dbProd.price * clientItem.quantity;
      validatedItems.push({
        id: clientItem.id,
        title: dbProd.title, // blindaje de nombre
        price: dbProd.price, // blindaje de precio oficial
        quantity: clientItem.quantity
      });
    }

    const orderId = generateOrderId();
    const now = new Date().toISOString();

    const orderRecord = {
      id: orderId,
      customer_name: validData.client.name,
      customer_phone: validData.client.phone,
      delivery_type: validData.delivery?.method || 'pickup',
      delivery_address: validData.delivery?.address || '',
      items: JSON.stringify(validatedItems),
      total: realTotal, // total estrictamente calculado en el server
      status: 'pending',
      created_at: now,
      updated_at: now
    };

    await env.DB.prepare(`
      INSERT INTO orders (id, customer_name, customer_phone, delivery_type, delivery_address, items, total, status, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).bind(
      orderRecord.id,
      orderRecord.customer_name,
      orderRecord.customer_phone,
      orderRecord.delivery_type,
      orderRecord.delivery_address,
      orderRecord.items,
      orderRecord.total,
      orderRecord.status,
      orderRecord.created_at,
      orderRecord.updated_at
    ).run();

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
