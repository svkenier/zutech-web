# ZUTECH - Plataforma E-Commerce y Catálogo Web

Bienvenido al repositorio oficial de **ZUTECH**. Este proyecto comprende tanto la vitrina digital y flujo de compra para clientes finales como el panel administrativo (CMS) desacoplado para la gestión de inventario, pedidos y catálogo de productos.

---

## 🚀 Stack Tecnológico

- **Frontend:** React 18, TypeScript, Vite.
- **UI / Estilos:** Tailwind CSS, Material UI (MUI).
- **Backend / Edge Functions:** Cloudflare Pages Functions.
- **Base de Datos Relacional:** Cloudflare D1 (SQLite distribuido en el Edge).
- **Caché, Sesiones y Rate-Limiting:** Upstash Redis (REST API).
- **Almacenamiento de Multimedia:** Almacenamiento optimizado y entrega vía CDN (Cloudflare R2).
- **Validación de Datos:** Zod.

---

## 🏗 Arquitectura

El sistema implementa una arquitectura modular con separación estricta de responsabilidades:

- **Core Agnóstico (`src/core/`):** Lógica central de autenticación (JWT), clientes de conexión a Upstash Redis, validadores de esquemas y utilidades de optimización de imágenes (WebP) independientes de la interfaz gráfica.
- **Capa UI (`src/ui/`):** Componentes de presentación, catálogo público, panel de control administrativo (`/admin`) y carrito de compras (`CartDrawer`).
- **Cloudflare Pages Functions (`functions/api/`):** Endpoints serverless que ejecutan consultas preparadas contra Cloudflare D1, gestionan sesiones de administración y protegen secretos en el servidor.
- **Pipeline de Seguridad y Pedidos:**
  - Control de tasa (*rate-limiting*) de 3 solicitudes por minuto por IP en la creación de pedidos.
  - Mitigación de inyecciones SQL mediante declaraciones parametrizadas en D1.
  - Finalización de órdenes vía WhatsApp con cotización dinámica de delivery y cero persistencia de datos PII sensibles de localización.

---

## 🛠 Guía de Desarrollo Local

### Prerrequisitos
- Node.js v20+
- pnpm instalado
- Variables de entorno configuradas

### 1. Variables de Entorno
Crea un archivo `.dev.vars` en la raíz del proyecto tomando como base `.dev.vars.example`:

```ini
# Upstash Redis (Sesiones y Rate Limit)
UPSTASH_REDIS_REST_URL="https://tu-endpoint.upstash.io"
UPSTASH_REDIS_REST_TOKEN="tu-token-upstash"

# Autenticación Administrativa
ADMIN_USER="usuario-admin"
ADMIN_PASSWORD="password-admin"
JWT_SECRET="clave-secreta-local"
```

### 2. Instalación y Ejecución
Instala las dependencias e inicia el servidor de desarrollo local:
```bash
pnpm install
pnpm dev
```
