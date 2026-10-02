-- migrations/0004_products_sku.sql
-- Añade la columna sku a la tabla products para soporte de importación masiva.

ALTER TABLE products ADD COLUMN sku TEXT;
CREATE UNIQUE INDEX IF NOT EXISTS idx_products_sku ON products(sku);
