import { getRedis } from './kv.js';
import { Ratelimit } from '@upstash/ratelimit';
import type { Env } from './auth.js';

export function getPublicRateLimit(env: Env) {
  return new Ratelimit({
    redis: getRedis(env) as any,
    limiter: Ratelimit.slidingWindow(10, '10 s'),
    analytics: true,
    prefix: '@upstash/ratelimit/public',
  });
}

export function getOrderRateLimit(env: Env) {
  return new Ratelimit({
    redis: getRedis(env) as any,
    limiter: Ratelimit.slidingWindow(3, '60 s'),
    analytics: true,
    prefix: '@upstash/ratelimit/orders',
  });
}

export function getAuthRateLimit(env: Env) {
  return new Ratelimit({
    redis: getRedis(env) as any,
    limiter: Ratelimit.slidingWindow(5, '60 s'),
    analytics: true,
    prefix: '@upstash/ratelimit/auth',
  });
}

/**
 * Evalúa el límite de peticiones contra Upstash Redis.
 *
 * POLÍTICA ARQUITECTÓNICA DE SEGURIDAD (SEC-07):
 * - Política de Capa de Aplicación: Fail-Open por disponibilidad de negocio.
 *   Si Upstash Redis sufre caídas de red, cuotas agotadas o indisponibilidad temporal,
 *   la petición se concede para garantizar la resiliencia operativa de la tienda.
 * - Mitigación Perimetral Requerida: La defensa estricta contra ataques de fuerza bruta
 *   y denegación de servicio debe residir en las reglas de Cloudflare WAF Rate Limiting
 *   en el perímetro sobre `/api/auth/login` y `/api/public/orders`, mitigando ataques
 *   antes de alcanzar la capa de Functions.
 */
export async function checkRateLimit(
  limiter: Ratelimit,
  ip: string = '127.0.0.1'
): Promise<{ success: boolean; limit: number; remaining: number; reset: number }> {
  try {
    return await limiter.limit(ip);
  } catch (err) {
    console.error('[RateLimit Fallback Active]: Fallo en Upstash Redis. Concediendo acceso por política de disponibilidad.', { error: err instanceof Error ? err.message : String(err) });
    // Fallback: Si el rate limit falla o no es compatible con el runtime local (Miniflare), permitimos la petición.
    return { success: true, limit: 10, remaining: 10, reset: Date.now() + 10000 };
  }
}
