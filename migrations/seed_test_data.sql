-- migrations/seed_test_data.sql
-- Datos de prueba para validar Histórico y Paginación (Usando nuevos IDs criptográficos)

-- 1. Cierres Históricos
INSERT INTO cash_closures (id, date, time_open, time_closed, total_amount, total_pago_movil, total_transferencia, total_zelle, total_binance, total_efectivo, order_count, closed_by, created_at) VALUES 
('ZC-260729-A1B2', '2026-07-29', '08:00', '18:00', 300.0, 100.0, 0.0, 100.0, 0.0, 100.0, 3, 'admin', '2026-07-29 18:00:00'),
('ZC-260915-C3D4', '2026-09-15', '08:00', '18:00', 400.0, 100.0, 100.0, 0.0, 200.0, 0.0, 4, 'admin', '2026-09-15 18:00:00'),
('ZC-260928-E5F6', '2026-09-28', '08:00', '18:00', 500.0, 100.0, 100.0, 100.0, 100.0, 100.0, 5, 'admin', '2026-09-28 18:00:00');

-- 2. Órdenes Históricas (Asignadas a los cierres)
INSERT INTO orders (id, customer_name, customer_phone, delivery_type, status, total, payment_method, closure_id, created_at, items) VALUES 
-- Cierre 01 (Hace 2 meses)
('ZT-260729-X001', 'Histórico 1', '04140000001', 'pickup', 'aprobado', 100.0, 'zelle', 'ZC-260729-A1B2', '2026-07-29 10:00:00', '[]'),
('ZT-260729-X002', 'Histórico 2', '04140000002', 'pickup', 'aprobado', 100.0, 'pago_movil', 'ZC-260729-A1B2', '2026-07-29 11:00:00', '[]'),
('ZT-260729-X003', 'Histórico 3', '04140000003', 'pickup', 'aprobado', 100.0, 'efectivo', 'ZC-260729-A1B2', '2026-07-29 12:00:00', '[]'),

-- Cierre 02 (Hace 2 semanas)
('ZT-260915-X004', 'Histórico 4', '04140000004', 'pickup', 'aprobado', 200.0, 'binance', 'ZC-260915-C3D4', '2026-09-15 10:00:00', '[]'),
('ZT-260915-X005', 'Histórico 5', '04140000005', 'pickup', 'aprobado', 100.0, 'transferencia', 'ZC-260915-C3D4', '2026-09-15 11:00:00', '[]'),
('ZT-260915-X006', 'Histórico 6', '04140000006', 'pickup', 'aprobado', 50.0, 'pago_movil', 'ZC-260915-C3D4', '2026-09-15 12:00:00', '[]'),
('ZT-260915-X007', 'Histórico 7', '04140000007', 'pickup', 'aprobado', 50.0, 'pago_movil', 'ZC-260915-C3D4', '2026-09-15 13:00:00', '[]'),

-- Cierre 03 (Ayer)
('ZT-260928-X008', 'Histórico 8', '04140000008', 'pickup', 'aprobado', 100.0, 'pago_movil', 'ZC-260928-E5F6', '2026-09-28 10:00:00', '[]'),
('ZT-260928-X009', 'Histórico 9', '04140000009', 'pickup', 'aprobado', 100.0, 'transferencia', 'ZC-260928-E5F6', '2026-09-28 11:00:00', '[]'),
('ZT-260928-X010', 'Histórico 10', '04140000010', 'pickup', 'aprobado', 100.0, 'zelle', 'ZC-260928-E5F6', '2026-09-28 12:00:00', '[]'),
('ZT-260928-X011', 'Histórico 11', '04140000011', 'pickup', 'aprobado', 100.0, 'binance', 'ZC-260928-E5F6', '2026-09-28 13:00:00', '[]'),
('ZT-260928-X012', 'Histórico 12', '04140000012', 'pickup', 'aprobado', 100.0, 'efectivo', 'ZC-260928-E5F6', '2026-09-28 14:00:00', '[]');

-- 3. Órdenes Activas de Hoy
INSERT INTO orders (id, customer_name, customer_phone, delivery_type, status, total, payment_method, closure_id, created_at, items) VALUES 
-- Pendientes
('ZT-260929-X013', 'Carlos Pérez', '04141234567', 'pickup', 'pendiente', 45.0, 'pago_movil', NULL, '2026-09-29 09:00:00', '[]'),
('ZT-260929-X014', 'Mariana Silva', '04249876543', 'pickup', 'pendiente', 120.0, 'zelle', NULL, '2026-09-29 09:15:00', '[]'),
-- Aprobadas (sin cierre aún)
('ZT-260929-X015', 'Roberto Díaz', '04140000013', 'pickup', 'aprobado', 25.0, 'efectivo', NULL, '2026-09-29 10:00:00', '[]'),
('ZT-260929-X016', 'Ana Mendoza', '04140000014', 'pickup', 'aprobado', 60.0, 'binance', NULL, '2026-09-29 10:15:00', '[]'),
('ZT-260929-X017', 'TecnoStore C.A.', '04140000015', 'pickup', 'aprobado', 210.0, 'transferencia', NULL, '2026-09-29 10:30:00', '[]');
