import { getAuthPayload } from '../../../../src/core/auth/auth.js';
import type { Env } from '../../../../src/core/auth/auth.js';

export const onRequestGet: PagesFunction<Env> = async (context) => {
  const { request, env } = context;
  const auth = await getAuthPayload(request, env);
  if (!auth) {
    return new Response(JSON.stringify({ error: 'No autorizado' }), { status: 401, headers: { 'Content-Type': 'application/json' } });
  }

  try {
    const { results } = await env.DB.prepare(`SELECT * FROM brands ORDER BY name ASC`).all();
    return new Response(JSON.stringify({ success: true, brands: results }), { status: 200, headers: { 'Content-Type': 'application/json' } });
  } catch (e: any) {
    return new Response(JSON.stringify({ error: e.message }), { status: 500, headers: { 'Content-Type': 'application/json' } });
  }
};
