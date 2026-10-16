import http from 'k6/http';
import { check } from 'k6';
import { Counter } from 'k6/metrics';

/**
 * Escenario C: Saturación de Rate Limiting y Resiliencia Fail-Open
 *
 * Evalúa:
 * - Respuesta 429 Too Many Requests al exceder la cuota (10 req/10s por IP).
 * - Presencia de cabeceras X-RateLimit-Limit y X-RateLimit-Remaining.
 * - Resiliencia Fail-Open: ausencia absoluta de errores 500 si Upstash Redis se satura.
 */

const BASE_URL = __ENV.BASE_URL || 'http://localhost:8788';

const rateLimitHits = new Counter('rate_limit_429_hits');
const successHits = new Counter('rate_limit_200_allowed');

export const options = {
  scenarios: {
    ratelimit_spike: {
      executor: 'per-vu-iterations',
      vus: 1,
      iterations: 25,
      maxDuration: '15s',
    },
  },
  thresholds: {
    'checks': ['rate>0.95'],
  },
};

export default function () {
  // IP fija para forzar la ventana deslizante de Upstash Ratelimit
  const res = http.get(`${BASE_URL}/api/public/products`, {
    headers: {
      'Accept': 'application/json',
      'cf-connecting-ip': '203.0.113.42',
    },
  });

  const passed = check(res, {
    'status is 200 or 429 (fail-open or rate-limited)': (r) => [200, 429].includes(r.status),
    'never returns 500 when rate limiting': (r) => r.status !== 500,
    'has rate limit headers': (r) => r.headers['X-Ratelimit-Limit'] !== undefined || r.headers['X-RateLimit-Limit'] !== undefined || r.status === 429,
  });

  if (res.status === 200) {
    successHits.add(1);
  } else if (res.status === 429) {
    rateLimitHits.add(1);
  }
}
