import { getAuthPayload } from '../../src/core/auth/auth.js';
import { ROLE_HIERARCHY, type UserRole } from '../../src/core/types/user.js';
import type { Env } from '../../src/core/auth/auth.js';

export const onRequestGet: PagesFunction<Env> = async (context) => {
  const { env } = context;

  try {
    const row = (await env.DB.prepare(`SELECT data FROM settings WHERE id = 'general'`).first()) as { data: string } | null;
    
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

  if (ROLE_HIERARCHY[payload.role as UserRole] < ROLE_HIERARCHY['encargado']) {
    return new Response(JSON.stringify({ error: 'No autorizado' }), { status: 403, headers: { 'Content-Type': 'application/json' } });
  }

  try {
    const body = await request.json() as any;
    
    // FETCH EXISTING SETTINGS
    const row = (await env.DB.prepare(`SELECT data FROM settings WHERE id = 'general'`).first()) as { data: string } | null;
    let existingData: any = {};
    if (row && row.data) {
      try { existingData = JSON.parse(row.data); } catch (e) {}
    }

    if (payload.role !== 'owner') {
      const criticalKeys = ['domain', 'custom_domain', 'expirationDate', 'monitoringActive'];
      
      for (const key of criticalKeys) {
        if (key in body && body[key] !== existingData[key]) {
          return new Response(JSON.stringify({ error: 'Acceso denegado: solo el propietario (owner) puede modificar la configuración crítica.' }), { status: 403, headers: { 'Content-Type': 'application/json' } });
        }
      }

      for (const key of criticalKeys) {
        if (key in existingData) {
          body[key] = existingData[key];
        }
      }
    }

    const contentStr = JSON.stringify(body);
    
    await env.DB.prepare(`
      INSERT INTO settings (id, data) 
      VALUES ('general', ?)
      ON CONFLICT(id) DO UPDATE SET data = excluded.data
    `).bind(contentStr).run();

    return new Response(JSON.stringify({ ok: true, data: body }), { status: 200, headers: { 'Content-Type': 'application/json' } });
  } catch (err) {
    console.error('Error saving settings:', err);
    return new Response(JSON.stringify({ error: 'Error interno guardando configuración' }), { status: 500, headers: { 'Content-Type': 'application/json' } });
  }
};
