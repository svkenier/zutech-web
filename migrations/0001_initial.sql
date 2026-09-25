-- migrations/0001_initial.sql
-- Creación de tablas base para la migración a Cloudflare D1

-- Tabla de Productos
DROP TABLE IF EXISTS products;
CREATE TABLE products (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    brand TEXT,
    category TEXT,
    price REAL NOT NULL DEFAULT 0.0,
    in_stock INTEGER NOT NULL DEFAULT 1,     -- 0 = Agotado, 1 = En Stock
    featured INTEGER NOT NULL DEFAULT 0,     -- 0 = Normal, 1 = Destacado
    image_url TEXT,                          -- jsDelivr CDN link
    specs TEXT,                              -- Formato libre o JSON text
    description TEXT,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Tabla de Pedidos
DROP TABLE IF EXISTS orders;
CREATE TABLE orders (
    id TEXT PRIMARY KEY,                     -- Formato: #ZUT-XXXX
    customer_name TEXT NOT NULL,
    customer_phone TEXT NOT NULL,
    delivery_type TEXT NOT NULL,             -- 'pickup' | 'delivery'
    delivery_address TEXT,
    items TEXT NOT NULL,                     -- Array JSON serializado: [{ id, title, price, quantity }]
    total REAL NOT NULL DEFAULT 0.0,
    status TEXT NOT NULL DEFAULT 'pending',  -- 'pending', 'approved', 'discarded'
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Índices de Rendimiento (Edge Optimization)
CREATE INDEX idx_products_featured ON products(featured);
CREATE INDEX idx_orders_status ON orders(status);
