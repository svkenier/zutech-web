# Arquitectura de Seguridad y Límites de Confianza (Trust Boundaries)
**Proyecto:** Zetech Web (`svkenier/zetech-web`)  
**Auditoría:** Cloudflare Security Audit (Modo Estándar)  
**Fecha:** Octubre 2026  

---

## 1. Topología del Sistema y Componentes Cloudflare

El sistema es una aplicación de comercio electrónico y catálogo digital desplegada en la infraestructura serverless de Cloudflare Pages y Edge Workers.

```
                      [ Cliente Web / Navegador ]
                                  │
                                  ▼
                     [ Cloudflare Edge Network ]
                  (WAF, DDoS, SSL/TLS, Caching)
                                  │
         ┌────────────────────────┴────────────────────────┐
         │                                                 │
    [ Assets Estáticos ]                        [ Cloudflare Pages Functions ]
 (HTML, JS bundles, CSS)                    (V8 Isolates / Edge Serverless API)
                                                           │
                      ┌────────────────────────────────────┼──────────────────────────────┐
                      ▼                                    ▼                              ▼
            [ Cloudflare D1 (SQL) ]              [ Cloudflare R2 (S3 API) ]      [ Upstash Redis (REST) ]
         - Catálogo de productos              - Imágenes optimizadas (.webp)   - Sesiones activas y roles
         - Pedidos y clientes                 - Media de marcas                - Invalidador tokenVersion
         - Configuración persistente                                           - Rate limiting deslizante
```

---

## 2. Clases de Principales e Identidades

| Principal | Nivel de Confianza | Vector de Acceso | Identificador |
| :--- | :--- | :--- | :--- |
| **Visitante Anónimo** | Ninguno (Bajo) | Navegación pública, Carrito, Creación de pedidos | Dirección IP, Headers HTTP |
| **Operador Admin (`operator`)** | Medio | Panel `/admin`, gestión de productos/pedidos | Cookie `auth_session_token` (JWT) |
| **Administrador (`admin`)** | Alto | Modificación de inventario, marcas y exportaciones | Cookie `auth_session_token` (JWT) |
| **Superadministrador (`superadmin`)** | Muy Alto | Creación de usuarios admin, reseteo de claves | Cookie `auth_session_token` (JWT) |
| **Propietario (`owner`)** | Máximo | Eliminación de administradores, acceso total | Cookie `auth_session_token` (JWT, rol inmutable) |

---

## 3. Límites de Confianza (Trust Boundaries)

### TB-01: Internet no autenticado -> Cloudflare Edge Functions
- **Punto de entrada:** Endpoints públicos `/api/public/*`, `/api/auth/login`, `/api/settings`.
- **Controles de frontera:**
  - `_middleware.ts` inyecta CSP, HSTS, X-Frame-Options, Permissions-Policy.
  - Validación de payloads mediante esquemas estrictos `Zod`.
  - Rate limiting deslizante en login y creación de órdenes.

### TB-02: Edge Functions -> Base de Datos D1 (SQLite)
- **Punto de entrada:** Consultas SQL preparadas (`env.DB.prepare(...).bind(...)`).
- **Garantías de seguridad:** Cero concatenación directa de cadenas. Tipado estricto en parámetros. Transacciones atómicas de stock en `orders.ts`.

### TB-03: Edge Functions -> Upstash Redis
- **Punto de entrada:** API REST de Upstash vía HTTPS (`@upstash/redis`).
- **Garantías y debilidades:** 
  - Almacena hashes bcrypt, metadatos de usuario y `tokenVersion`.
  - Política de resiliencia Fail-Open: si Redis no responde, el rate limiting concede el tráfico para evitar caídas de la tienda, delegando la defensa perimetral al WAF de Cloudflare.

### TB-04: Edge Functions -> Almacenamiento R2
- **Punto de entrada:** Métodos S3 / binding nativo R2 (`putFile`, `getFile`).
- **Controles:** Nombres de archivo aleatorizados con UUID/sufijos y validación MIME (`image/webp`, `image/png`, `image/jpeg`). Decodificación base64 en memoria de Worker.
