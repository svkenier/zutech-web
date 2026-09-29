-- Smoke Test Fase 1: Ciclo completo de una orden
-- Paso 1: Insertar orden de prueba en estado 'pendiente'
INSERT OR REPLACE INTO orders
  (id, customer_name, customer_phone, delivery_type, items, total, status, payment_method, closure_id, created_at, updated_at)
VALUES
  ('#ZUT-TEST1', 'Cliente Prueba', '04120000000', 'pickup',
   '[{"id":"prod-1","title":"RTX 4090","price":1599.99,"quantity":1}]',
   1599.99, 'pendiente', NULL, NULL,
   datetime('now'), datetime('now'));

-- Paso 2: Simular aprobación con payment_method='pago_movil'
UPDATE orders
SET status = 'aprobado', payment_method = 'pago_movil', updated_at = datetime('now')
WHERE id = '#ZUT-TEST1' AND (status = 'pendiente' OR status = 'pending');

-- Paso 3: Verificar resultado final
SELECT id, status, payment_method, closure_id FROM orders WHERE id = '#ZUT-TEST1';

-- Paso 4: Confirmar que la purga de 7 dias NO toca órdenes 'aprobado'
DELETE FROM orders
WHERE (status = 'pendiente' OR status = 'pending')
  AND closure_id IS NULL
  AND created_at < datetime('now', '-7 days');

-- Paso 5: Verificar que la orden sigue existiendo post-purga
SELECT id, status, payment_method, closure_id FROM orders WHERE id = '#ZUT-TEST1';
