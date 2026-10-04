-- Smoke Test Fase 1: Ciclo completo de una orden
-- Paso 1: Insertar orden de prueba en estado 'pending'
INSERT OR REPLACE INTO orders
  (id, customer_name, customer_phone, delivery_type, total, status, payment_method, closure_id, created_at, updated_at)
VALUES
  ('ZT-261001-TEST', 'Cliente Prueba', '04120000000', 'pickup', 1599.99, 'pending', NULL, NULL, datetime('now'), datetime('now'));

INSERT OR REPLACE INTO order_items
  (order_id, product_id, product_title, quantity, unit_price)
VALUES
  ('ZT-261001-TEST', 'prod-mock-2', 'NVIDIA GeForce RTX 4090', 1, 1599.99);

-- Paso 2: Simular aprobación con payment_method='pago_movil'
UPDATE orders
SET status = 'approved', payment_method = 'pago_movil', updated_at = datetime('now')
WHERE id = 'ZT-261001-TEST' AND status = 'pending';

-- Paso 3: Verificar resultado final
SELECT id, status, payment_method, closure_id FROM orders WHERE id = 'ZT-261001-TEST';

-- Paso 4: Confirmar que la purga de 7 dias NO toca órdenes 'approved'
DELETE FROM orders
WHERE status = 'pending'
  AND closure_id IS NULL
  AND created_at < datetime('now', '-7 days');

-- Paso 5: Verificar que la orden sigue existiendo post-purga
SELECT id, status, payment_method, closure_id FROM orders WHERE id = 'ZT-261001-TEST';
