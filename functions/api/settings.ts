import { getAuthPayload } from '../../src/core/auth/auth.js';
import { ROLE_LEVEL, type UserRole } from '../../src/core/types/user.js';
import type { Env } from '../../src/core/auth/auth.js';

export const onRequestGet: PagesFunction<Env> = async (context) => {
  const { env } = context;

  try {
    const row = await env.DB.prepare(`SELECT data FROM settings WHERE id = 'general'`).first<{ data: string }>();
    
    const headers = new Headers();
    headers.set('Cache-Control', 'public, s-maxage=60, stale-while-revalidate=86400');
    headers.set('Content-Type', 'application/json');

    if (!row || !row.data) {
      return new Response(JSON.stringify({}), { status: 200, headers });
    }

    return new Response(row.data, { status: 200, headers });
  } catch (err) {
    console.warn('[settings.ts] Error querying D1, devolviendo fallback vacío.', err);
    return new Response(JSON.stringify({}), { status: 200, headers: { 'Content-Type': 'application/json' } });
  }
};

export const onRequestPut: PagesFunction<Env> = async (context) => {
  const { request, env } = context;

  const payload = await getAuthPayload(request, env);
  if (!payload) return new Response(JSON.stringify({ error: 'No autenticado' }), { status: 401, headers: { 'Content-Type': 'application/json' } });

  if (ROLE_LEVEL[payload.role as UserRole] < ROLE_LEVEL['encargado']) {
    return new Response(JSON.stringify({ error: 'No autorizado' }), { status: 403, headers: { 'Content-Type': 'application/json' } });
  }

  try {
    const body = await request.json();
    const contentStr = JSON.stringify(body);
    
    await env.DB.prepare(`
      INSERT INTO settings (id, data, updated_at) 
      VALUES ('general', ?, datetime('now'))
      ON CONFLICT(id) DO UPDATE SET data = excluded.data, updated_at = excluded.updated_at
    `).bind(contentStr).run();

    return new Response(JSON.stringify({ ok: true, data: body }), { status: 200, headers: { 'Content-Type': 'application/json' } });
  } catch (err) {
    console.error('Error saving settings:', err);
    return new Response(JSON.stringify({ error: 'Error interno guardando configuración' }), { status: 500, headers: { 'Content-Type': 'application/json' } });
  }
};
