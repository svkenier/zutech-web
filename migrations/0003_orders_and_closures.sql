-- migrations/0003_orders_and_closures.sql
-- Fase 1: Añadir campos de pago/cierre a orders + crear tabla cash_closures

-- ─── PASO 1: Extender tabla orders ───────────────────────────────────────────
ALTER TABLE orders ADD COLUMN payment_method TEXT;  -- 'pago_movil'|'zelle'|'efectivo'
ALTER TABLE orders ADD COLUMN closure_id TEXT;       -- FK hacia cash_closures.id (NULL = sin cerrar)

-- ─── PASO 2: Tabla de Cierres de Caja ────────────────────────────────────────
CREATE TABLE IF NOT EXISTS cash_closures (
    id TEXT PRIMARY KEY,                           -- Formato: CLOSE-{timestamp}
    date TEXT NOT NULL,                            -- "YYYY-MM-DD" en VET (America/Caracas)
    time_open TEXT NOT NULL,                       -- Hora de inicio de turno (string "HH:MM", referencia visual)
    time_closed TEXT NOT NULL,                     -- Hora oficial de cierre (VET, server-side)
    total_amount REAL NOT NULL DEFAULT 0.0,
    total_pago_movil REAL NOT NULL DEFAULT 0.0,
    total_transferencia REAL NOT NULL DEFAULT 0.0,
    total_zelle REAL NOT NULL DEFAULT 0.0,
    total_binance REAL NOT NULL DEFAULT 0.0,
    total_efectivo REAL NOT NULL DEFAULT 0.0,
    order_count INTEGER NOT NULL DEFAULT 0,
    closed_by TEXT NOT NULL,                       -- username del encargado que cerró
    notes TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- ─── PASO 3: Índices de rendimiento ──────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_orders_status      ON orders(status);
CREATE INDEX IF NOT EXISTS idx_orders_closure_id  ON orders(closure_id);
CREATE INDEX IF NOT EXISTS idx_orders_created_at  ON orders(created_at);
CREATE INDEX IF NOT EXISTS idx_closures_date      ON cash_closures(date);
