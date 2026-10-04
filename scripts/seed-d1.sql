INSERT INTO brands (id, name) VALUES ('b-intel', 'Intel'), ('b-nvidia', 'NVIDIA'), ('b-asus', 'ASUS');
INSERT INTO products (id, title, brand_id, category, price, in_stock, featured, image_url, specs, description, created_at, updated_at) VALUES 
('prod-mock-1', 'Intel Core i9-14900K', 'b-intel', 'Procesadores', 599.99, 1, 1, '', '24 Cores / 32 Threads', 'El procesador más potente de Intel.', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
('prod-mock-2', 'NVIDIA GeForce RTX 4090', 'b-nvidia', 'Tarjetas Gráficas', 1599.99, 1, 1, '', '24GB GDDR6X', 'Rendimiento extremo para gaming y creación de contenido.', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
('prod-mock-3', 'ASUS ROG Strix Z790-E', 'b-asus', 'Tarjetas Madre', 450.00, 1, 0, '', 'WiFi 6E, DDR5', 'Placa base de alto rendimiento para entusiastas.', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);
