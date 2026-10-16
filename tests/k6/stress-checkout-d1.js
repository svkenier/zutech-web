import http from 'k6/http';
import { check, sleep } from 'k6';
import { Trend, Counter } from 'k6/metrics';

/**
 * Escenario B: Concurrencia Transaccional en Checkout (D1 SQLite Lock Contention)
 *
 * Evalúa:
 * - Resistencia de Cloudflare D1 ante inserciones concurrentes en batch (orders + order_items).
 * - Ausencia de bloqueos fatales (SQLITE_BUSY / HTTP 500).
 * - Tiempo de respuesta en transacción completa de checkout (umbral p95 < 600ms).
 */

const BASE_URL = __ENV.BASE_URL || 'http://localhost:8788';

const checkoutDuration = new Trend('checkout_duration', true);
const ordersCreated = new Counter('orders_created');
const conflictErrors = new Counter('conflict_409_price_changed');

export const options = {
  scenarios: {
    checkout_concurrency: {
      executor: 'ramping-vus',
      startVUs: 1,
      stages: [
        { duration: '15s', target: 10 },
        { duration: '30s', target: 25 },
        { duration: '15s', target: 0 },
      ],
      gracefulRampDown: '5s',
    },
  },
  thresholds: {
    // Transacción concurrente en p95 < 600ms
    'http_req_duration{type:checkout}': ['p(95)<600'],
    // Menos del 5% de errores inesperados
    'http_req_failed': ['rate<0.05'],
    // 95% de checks válidos
    'checks': ['rate>0.95'],
  },
};

export default function () {
  const payload = JSON.stringify({
    client: {
      name: `Cliente Estrés k6 VU-${__VU}`,
      phone: '04141234567',
    },
    delivery: {
      method: 'pickup',
    },
    items: [
      {
        id: 'test-product-sku-1',
        title: 'Componente Hardware Test',
        quantity: 1,
        price: 25.50,
      },
    ],
    totalUSD: 25.50,
    payment_method: 'pago_movil',
  });

  const res = http.post(`${BASE_URL}/api/public/orders`, payload, {
    tags: { type: 'checkout' },
    headers: {
      'Content-Type': 'application/json',
      // Simulamos IPs distintas por cada usuario virtual para evaluar la cola de D1
      'cf-connecting-ip': `192.168.1.${(__VU % 250) + 1}`,
    },
  });

  checkoutDuration.add(res.timings.duration);

  const resOk = check(res, {
    'no 500 internal server error (sqlite lock contention)': (r) => r.status !== 500,
    'handled response code (201 created, 400 validation or 409 conflict)': (r) => [201, 400, 409].includes(r.status),
  });

  if (res.status === 201) {
    ordersCreated.add(1);
  } else if (res.status === 409) {
    conflictErrors.add(1);
  }

  sleep(1);
}
