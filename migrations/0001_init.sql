-- migrations/0001_init.sql — Esquema consolidado y definitivo (D1/SQLite)

CREATE TABLE brands (
  id         TEXT PRIMARY KEY,
  name       TEXT NOT NULL UNIQUE,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);

CREATE TABLE cash_closures (
  id                  TEXT PRIMARY KEY,               -- CLOSE-{timestamp}
  date                TEXT NOT NULL,                  -- YYYY-MM-DD (VET)
  time_open           TEXT NOT NULL,                  -- "HH:MM" referencia visual
  time_closed         TEXT NOT NULL,                  -- hora oficial server-side
  total_amount        REAL NOT NULL DEFAULT 0 CHECK (total_amount >= 0),
  total_pago_movil    REAL NOT NULL DEFAULT 0,
  total_transferencia REAL NOT NULL DEFAULT 0,
  total_zelle         REAL NOT NULL DEFAULT 0,
  total_binance       REAL NOT NULL DEFAULT 0,
  total_efectivo      REAL NOT NULL DEFAULT 0,
  order_count         INTEGER NOT NULL DEFAULT 0 CHECK (order_count >= 0),
  closed_by           TEXT NOT NULL,
  notes               TEXT,
  created_at          TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);

CREATE TABLE products (
  id          TEXT PRIMARY KEY,
  sku         TEXT UNIQUE,                            -- múltiples NULL permitidos
  title       TEXT NOT NULL,
  brand_id    TEXT REFERENCES brands(id) ON DELETE SET NULL,
  category    TEXT,
  price       REAL NOT NULL DEFAULT 0 CHECK (price >= 0),
  in_stock    INTEGER NOT NULL DEFAULT 1 CHECK (in_stock IN (0,1)),
  featured    INTEGER NOT NULL DEFAULT 0 CHECK (featured IN (0,1)),
  image_url   TEXT,                                   -- clave R2 o URL absoluta
  specs       TEXT,
  description TEXT,
  created_at  TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  updated_at  TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);

CREATE TABLE orders (
  id               TEXT PRIMARY KEY,                  -- #ZUT-XXXX
  customer_name    TEXT NOT NULL,
  customer_phone   TEXT NOT NULL,
  delivery_type    TEXT NOT NULL CHECK (delivery_type IN ('pickup','delivery')),
  delivery_address TEXT,
  items            TEXT NOT NULL CHECK (json_valid(items)),  -- snapshot [{id,title,price,quantity}]
  total            REAL NOT NULL DEFAULT 0 CHECK (total >= 0),
  status           TEXT NOT NULL DEFAULT 'pending'
                   CHECK (status IN ('pending','approved','discarded')),
  payment_method   TEXT CHECK (payment_method IS NULL OR payment_method IN
                   ('pago_movil','transferencia','zelle','binance','efectivo')),
  closure_id       TEXT REFERENCES cash_closures(id) ON DELETE RESTRICT,
  created_at       TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  updated_at       TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);

CREATE TABLE settings (
  id         TEXT PRIMARY KEY,                        -- 'general'
  data       TEXT NOT NULL CHECK (json_valid(data)),
  updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);

-- Índices (cada uno responde a una consulta real del código)
CREATE INDEX idx_products_created_at ON products(created_at DESC);      -- public/products.ts
CREATE INDEX idx_products_brand_id   ON products(brand_id);             -- JOIN + FK
CREATE INDEX idx_products_featured   ON products(created_at DESC) WHERE featured = 1;
CREATE INDEX idx_orders_closure      ON orders(closure_id, created_at DESC); -- pendientes + JOIN cierres
CREATE INDEX idx_orders_status       ON orders(status, closure_id);     -- close.ts (aprobados sin cerrar)
CREATE INDEX idx_closures_date       ON cash_closures(date);
CREATE INDEX idx_closures_created_at ON cash_closures(created_at DESC);
