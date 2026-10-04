-- migrations/0001_init.sql — Esquema definitivo (D1/SQLite). Reset limpio.
-- Dinero: REAL con 2 decimales (round2 en servidor + CHECK como red de seguridad).

CREATE TABLE brands (
  id   TEXT PRIMARY KEY,
  name TEXT NOT NULL UNIQUE COLLATE NOCASE CHECK (length(trim(name)) > 0)
);

CREATE TABLE products (
  id          TEXT PRIMARY KEY,                               -- prod-<timestamp>
  sku         TEXT UNIQUE,                                    -- múltiples NULL permitidos
  title       TEXT NOT NULL CHECK (length(trim(title)) > 0),
  brand_id    TEXT REFERENCES brands(id) ON DELETE SET NULL,
  category    TEXT,
  price       REAL NOT NULL DEFAULT 0 CHECK (price >= 0 AND price = round(price, 2)),
  in_stock    INTEGER NOT NULL DEFAULT 1 CHECK (in_stock  IN (0,1)),
  featured    INTEGER NOT NULL DEFAULT 0 CHECK (featured  IN (0,1)),
  is_active   INTEGER NOT NULL DEFAULT 1 CHECK (is_active IN (0,1)),  -- 0 = archivado (tiene ventas)
  image_url   TEXT,                                           -- clave R2 o URL absoluta
  specs       TEXT,
  description TEXT,
  created_at  TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  updated_at  TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);

CREATE TABLE cash_closures (
  id                  TEXT PRIMARY KEY,                       -- ZC-yymmdd-XXXX
  date                TEXT NOT NULL CHECK (date GLOB '[0-9][0-9][0-9][0-9]-[0-9][0-9]-[0-9][0-9]'),  -- YYYY-MM-DD (VET)
  time_closed         TEXT NOT NULL CHECK (time_closed GLOB '[0-9][0-9]:[0-9][0-9]'),                -- HH:MM (VET)
  total_amount        REAL NOT NULL DEFAULT 0 CHECK (total_amount        >= 0),
  total_pago_movil    REAL NOT NULL DEFAULT 0 CHECK (total_pago_movil    >= 0),
  total_transferencia REAL NOT NULL DEFAULT 0 CHECK (total_transferencia >= 0),
  total_zelle         REAL NOT NULL DEFAULT 0 CHECK (total_zelle         >= 0),
  total_binance       REAL NOT NULL DEFAULT 0 CHECK (total_binance       >= 0),
  total_efectivo      REAL NOT NULL DEFAULT 0 CHECK (total_efectivo      >= 0),
  order_count         INTEGER NOT NULL CHECK (order_count > 0),
  closed_by           TEXT NOT NULL,
  created_at          TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  CHECK (abs(total_amount - (total_pago_movil + total_transferencia + total_zelle
                             + total_binance + total_efectivo)) < 0.005)
);

CREATE TABLE orders (
  id             TEXT PRIMARY KEY,                            -- ZT-yymmdd-XXXX
  customer_name  TEXT NOT NULL CHECK (length(trim(customer_name))  >= 2),
  customer_phone TEXT NOT NULL CHECK (length(trim(customer_phone)) >= 5),
  delivery_type  TEXT NOT NULL CHECK (delivery_type IN ('pickup','delivery')),
  total          REAL NOT NULL DEFAULT 0 CHECK (total >= 0 AND total = round(total, 2)),
  status         TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','approved')),
  payment_method TEXT CHECK (payment_method IN ('pago_movil','transferencia','zelle','binance','efectivo')),
  closure_id     TEXT REFERENCES cash_closures(id) ON DELETE RESTRICT,
  created_at     TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  updated_at     TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  CHECK (status != 'approved' OR payment_method IS NOT NULL),  -- aprobado => requiere método de pago (pero pendiente también puede tenerlo)
  CHECK (closure_id IS NULL OR status = 'approved')              -- solo lo aprobado se cierra
);

CREATE TABLE order_items (
  id            INTEGER PRIMARY KEY,                          -- rowid: conserva el orden de las líneas
  order_id      TEXT NOT NULL REFERENCES orders(id)   ON DELETE CASCADE,
  product_id    TEXT NOT NULL REFERENCES products(id) ON DELETE RESTRICT,
  product_title TEXT NOT NULL,                                -- snapshot del nombre
  quantity      INTEGER NOT NULL CHECK (quantity > 0),
  unit_price    REAL NOT NULL CHECK (unit_price >= 0 AND unit_price = round(unit_price, 2)),
  subtotal      REAL GENERATED ALWAYS AS (round(quantity * unit_price, 2)) STORED,
  UNIQUE (order_id, product_id)                               -- una línea por producto
);

CREATE TABLE settings (
  id   TEXT PRIMARY KEY CHECK (id = 'general'),
  data TEXT NOT NULL CHECK (json_valid(data))
);

-- Índices (cada uno responde a una consulta real del código)
CREATE INDEX idx_products_active_created ON products(created_at DESC) WHERE is_active = 1;     -- public/products.ts
CREATE INDEX idx_products_brand_id       ON products(brand_id);                               -- FK + JOIN
CREATE INDEX idx_orders_open             ON orders(created_at DESC) WHERE closure_id IS NULL; -- admin GET, purga 7d, close.ts
CREATE INDEX idx_orders_closure          ON orders(closure_id) WHERE closure_id IS NOT NULL;  -- hidratar cierres + FK
CREATE INDEX idx_order_items_product     ON order_items(product_id);                          -- RESTRICT + top vendidos
-- order_items.order_id queda cubierto por el índice implícito de UNIQUE(order_id, product_id)
CREATE INDEX idx_closures_date           ON cash_closures(date);
CREATE INDEX idx_closures_created_at     ON cash_closures(created_at DESC);
