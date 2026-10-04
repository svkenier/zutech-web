-- scripts/seed_test_data.sql
-- Datos de prueba para validar Histórico y Paginación

-- 1. Cierres Históricos
INSERT INTO cash_closures (id, date, time_closed, total_amount, total_pago_movil, total_transferencia, total_zelle, total_binance, total_efectivo, order_count, closed_by, created_at) VALUES 
('ZC-260729-A1B2', '2026-07-29', '18:00', 300.0, 100.0, 0.0, 100.0, 0.0, 100.0, 3, 'svkenier', '2026-07-29 18:00:00'),
('ZC-260915-C3D4', '2026-09-15', '18:00', 400.0, 100.0, 100.0, 0.0, 200.0, 0.0, 4, 'svkenier', '2026-09-15 18:00:00'),
('ZC-260928-E5F6', '2026-09-28', '18:00', 500.0, 100.0, 100.0, 100.0, 100.0, 100.0, 5, 'svkenier', '2026-09-28 18:00:00');

-- 2. Órdenes Históricas (Asignadas a los cierres)
INSERT INTO orders (id, customer_name, customer_phone, delivery_type, status, total, payment_method, closure_id, created_at, updated_at) VALUES 
('ZT-260729-X001', 'Histórico 1', '04140000001', 'pickup', 'approved', 100.0, 'zelle', 'ZC-260729-A1B2', '2026-07-29 10:00:00', '2026-07-29 10:00:00'),
('ZT-260729-X002', 'Histórico 2', '04140000002', 'pickup', 'approved', 100.0, 'pago_movil', 'ZC-260729-A1B2', '2026-07-29 11:00:00', '2026-07-29 11:00:00'),
('ZT-260729-X003', 'Histórico 3', '04140000003', 'pickup', 'approved', 100.0, 'efectivo', 'ZC-260729-A1B2', '2026-07-29 12:00:00', '2026-07-29 12:00:00'),

('ZT-260915-X004', 'Histórico 4', '04140000004', 'pickup', 'approved', 200.0, 'binance', 'ZC-260915-C3D4', '2026-09-15 10:00:00', '2026-09-15 10:00:00'),
('ZT-260915-X005', 'Histórico 5', '04140000005', 'pickup', 'approved', 100.0, 'transferencia', 'ZC-260915-C3D4', '2026-09-15 11:00:00', '2026-09-15 11:00:00'),
('ZT-260915-X006', 'Histórico 6', '04140000006', 'pickup', 'approved', 50.0, 'pago_movil', 'ZC-260915-C3D4', '2026-09-15 12:00:00', '2026-09-15 12:00:00'),
('ZT-260915-X007', 'Histórico 7', '04140000007', 'pickup', 'approved', 50.0, 'pago_movil', 'ZC-260915-C3D4', '2026-09-15 13:00:00', '2026-09-15 13:00:00'),

('ZT-260928-X008', 'Histórico 8', '04140000008', 'pickup', 'approved', 100.0, 'pago_movil', 'ZC-260928-E5F6', '2026-09-28 10:00:00', '2026-09-28 10:00:00'),
('ZT-260928-X009', 'Histórico 9', '04140000009', 'pickup', 'approved', 100.0, 'transferencia', 'ZC-260928-E5F6', '2026-09-28 11:00:00', '2026-09-28 11:00:00'),
('ZT-260928-X010', 'Histórico 10', '04140000010', 'pickup', 'approved', 100.0, 'zelle', 'ZC-260928-E5F6', '2026-09-28 12:00:00', '2026-09-28 12:00:00'),
('ZT-260928-X011', 'Histórico 11', '04140000011', 'pickup', 'approved', 100.0, 'binance', 'ZC-260928-E5F6', '2026-09-28 13:00:00', '2026-09-28 13:00:00'),
('ZT-260928-X012', 'Histórico 12', '04140000012', 'pickup', 'approved', 100.0, 'efectivo', 'ZC-260928-E5F6', '2026-09-28 14:00:00', '2026-09-28 14:00:00');

-- Insert order_items
INSERT INTO order_items (order_id, product_id, product_title, quantity, unit_price) VALUES
('ZT-260729-X001', 'prod-mock-1', 'Producto Test 1', 4, 25.0),
('ZT-260729-X002', 'prod-mock-2', 'Producto Test 2', 2, 50.0),
('ZT-260729-X003', 'prod-mock-3', 'Producto Test 3', 1, 100.0),

('ZT-260915-X004', 'prod-mock-1', 'Producto Test 1', 8, 25.0),
('ZT-260915-X005', 'prod-mock-2', 'Producto Test 2', 2, 50.0),
('ZT-260915-X006', 'prod-mock-3', 'Producto Test 3', 1, 50.0),
('ZT-260915-X007', 'prod-mock-1', 'Producto Test 1', 2, 25.0),

('ZT-260928-X008', 'prod-mock-2', 'Producto Test 2', 2, 50.0),
('ZT-260928-X009', 'prod-mock-3', 'Producto Test 3', 1, 100.0),
('ZT-260928-X010', 'prod-mock-1', 'Producto Test 1', 4, 25.0),
('ZT-260928-X011', 'prod-mock-2', 'Producto Test 2', 2, 50.0),
('ZT-260928-X012', 'prod-mock-3', 'Producto Test 3', 1, 100.0);
