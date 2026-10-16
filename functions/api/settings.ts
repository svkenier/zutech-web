import { z } from 'zod';
import { getAuthPayload } from '../../src/core/auth/auth.js';
import { ROLE_HIERARCHY, type UserRole } from '../../src/core/types/user.js';
import type { Env } from '../../src/core/auth/auth.js';

const SocialLinksSchema = z.object({
  instagram: z.string().max(1000).nullable().optional(),
  facebook: z.string().max(1000).nullable().optional(),
  twitter: z.string().max(1000).nullable().optional(),
}).catchall(z.string().max(1000).nullable().optional()).nullable().optional();

const SettingsSchema = z.object({
  store_name: z.string().max(1000).nullable().optional(),
  rif: z.string().max(1000).nullable().optional(),
  phone: z.string().max(1000).nullable().optional(),
  whatsapp: z.string().max(1000).nullable().optional(),
  email: z.string().max(1000).nullable().optional(),
  address: z.string().max(1000).nullable().optional(),
  map_url: z.string().max(1000).nullable().optional(),
  social_links: SocialLinksSchema,
  domain: z.string().max(1000).nullable().optional(),
  custom_domain: z.string().max(1000).nullable().optional(),
  expirationDate: z.string().max(1000).nullable().optional(),
  monitoringActive: z.boolean().nullable().optional(),
  domainExpirationDate: z.string().max(1000).nullable().optional(),
  domainAlertEnabled: z.boolean().nullable().optional(),
  exchange_rate: z.number().nonnegative().nullable().optional(),
  tasa_bcv: z.number().nonnegative().nullable().optional(),
}).strict();

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
    let rawBody: unknown;
    try {
      rawBody = await request.json();
    } catch {
      return new Response(JSON.stringify({ error: 'JSON inválido en el cuerpo de la petición' }), { status: 400, headers: { 'Content-Type': 'application/json' } });
    }

    const validationResult = SettingsSchema.safeParse(rawBody);
    if (!validationResult.success) {
      const issueMessage = validationResult.error.issues
        .map((issue) => `${issue.path.join('.') || 'cuerpo'}: ${issue.message}`)
        .join(', ');
      return new Response(JSON.stringify({ error: `Configuración inválida: ${issueMessage}` }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const body = validationResult.data as Record<string, any>;
    
    // FETCH EXISTING SETTINGS
    const row = (await env.DB.prepare(`SELECT data FROM settings WHERE id = 'general'`).first()) as { data: string } | null;
    let existingData: any = {};
    if (row && row.data) {
      try { existingData = JSON.parse(row.data); } catch (e) {}
    }

    if (payload.role !== 'owner') {
      const criticalKeys = ['domain', 'custom_domain', 'expirationDate', 'monitoringActive', 'domainExpirationDate', 'domainAlertEnabled'];
      
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
