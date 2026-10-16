import http from 'k6/http';
import { check, sleep } from 'k6';
import { Trend, Rate } from 'k6/metrics';

/**
 * Escenario A: Ráfagas de Lectura Pública y Caché R2 Media
 *
 * Evalúa:
 * - Tiempo de respuesta en catálogo público (/api/public/products).
 * - Entrega de medios estáticos y respuesta HTTP 304 Not Modified con ETag.
 * - Validación de cabeceras de caché perimetral (s-maxage).
 */

const BASE_URL = __ENV.BASE_URL || 'http://localhost:8788';

const productsDuration = new Trend('products_duration', true);
const mediaDuration = new Trend('media_duration', true);
const successRate = new Rate('successful_requests');

export const options = {
  scenarios: {
    catalog_burst: {
      executor: 'ramping-vus',
      startVUs: 0,
      stages: [
        { duration: '20s', target: 20 },
        { duration: '40s', target: 50 },
        { duration: '20s', target: 0 },
      ],
      gracefulRampDown: '10s',
    },
  },
  thresholds: {
    // Umbral estricto: p95 < 250ms en lectura de catálogo
    'http_req_duration{type:products}': ['p(95)<250'],
    // Umbral estricto: p95 < 200ms en entrega de media
    'http_req_duration{type:media}': ['p(95)<200'],
    // Tasa de fallos general menor a 1%
    'http_req_failed': ['rate<0.01'],
    // 99% de checks válidos
    'successful_requests': ['rate>0.99'],
  },
};

export default function () {
  // 1. Lectura de Catálogo Público
  const productsRes = http.get(`${BASE_URL}/api/public/products`, {
    tags: { type: 'products' },
    headers: { 'Accept': 'application/json' },
  });

  const productsOk = check(productsRes, {
    'catalog status is 200': (r) => r.status === 200,
    'catalog has cache-control': (r) => r.headers['Cache-Control'] && r.headers['Cache-Control'].includes('s-maxage'),
    'catalog returns array': (r) => {
      try {
        return Array.isArray(JSON.parse(r.body));
      } catch (e) {
        return false;
      }
    },
  });

  productsDuration.add(productsRes.timings.duration);
  successRate.add(productsOk);

  // 2. Consulta de Medios con ETag / Validación 304 Not Modified
  const mediaRes = http.get(`${BASE_URL}/api/media/products/sample.webp`, {
    tags: { type: 'media' },
    headers: {
      'If-None-Match': '"mock-etag-sample"',
    },
  });

  const mediaOk = check(mediaRes, {
    'media status is 200, 304 or 404': (r) => [200, 304, 404].includes(r.status),
  });

  mediaDuration.add(mediaRes.timings.duration);
  successRate.add(mediaOk);

  sleep(0.5);
}
