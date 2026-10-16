# Arquitectura de Seguridad y Modelo de Amenazas — ZuTech Web (Run-2)

## 1. Producto, Principales y Autoridad Normal

ZuTech Web es una plataforma de comercio electrónico y gestión administrativa desplegada en la infraestructura perimetral de Cloudflare Pages (JAMstack con Cloudflare Functions). El sistema sirve un catálogo público de productos, procesa pedidos y proporciona un panel de control interno para la administración de inventario, marcas, órdenes y cierres de caja.

### Actores y Jerarquía de Autoridad (RBAC)
- **Visitante Público / Cliente no autenticado**: Puede consultar el catálogo (`/api/public/products`, `/api/public/[collection]`), leer configuraciones generales (`/api/settings`) y crear pedidos (`/api/public/orders`). No posee acceso a rutas `/api/admin/*` ni `/api/users/*`.
- **Empleado (Nivel 1)**: Autenticado mediante JWT en cookie HttpOnly. Autorizado para crear y editar productos individuales y subir imágenes (`/api/admin/products/[[id]]`).
- **Encargado (Nivel 2)**: Autorizado para gestión de inventario, carga masiva (`/api/admin/products/bulk`), eliminación de productos sin ventas, gestión y descarte de órdenes (`/api/admin/orders`), y ejecución de cierres de caja (`/api/admin/orders/close`). Puede gestionar cuentas de nivel `empleado`.
- **SuperAdmin (Nivel 3)**: Control ampliado sobre usuarios del sistema (`/api/users/*`) y exportación del historial financiero estructurado (`/api/admin/orders/export-purge`).
- **Owner / Propietario (Nivel 4)**: Cuenta inmutable protegida. Control total exclusivo sobre configuraciones de dominio crítico en `/api/settings`, purga permanente del historial financiero (`export-purge`), gestión de superadmins y cierre forzoso de sesiones (`force-logout`).

### Recursos Protegidos
- **Base de Datos Relacional Cloudflare D1 (SQLite en Edge)**: Tablas `products`, `brands`, `orders`, `order_items`, `cash_closures`, `settings`.
- **Almacenamiento de Objetos Cloudflare R2**: Bucket para medios estáticos bajo `products/*.webp`.
- **Almacenamiento Clave-Valor Upstash Redis**: Persistencia de usuarios (`user:{username}`), índice `user:index`, control de `tokenVersion` y limitadores de tasa.
- **Secretos de Cifrado y Firma**: `JWT_SECRET`, credenciales Upstash REST, `ADMIN_PASSWORD` de fallback.

---

## 2. Línea Base y Comparativa Tecnológica

La arquitectura se compara con plataformas e-commerce sin servidor modernas (como Shopify Hydrogen o MedusaJS en Edge Workers). ZuTech Web opta por delegar la resiliencia en un modelo híbrido D1 + Redis + R2. En comparación con arquitecturas centralizadas tradicionales (Node/Express + PostgreSQL):
- **Aislamiento por V8 Isolates**: Proporciona aislamiento estricto de memoria entre peticiones sin procesos compartidos.
- **Ventaja de Latencia Global**: El cómputo corre en los puntos de presencia de Cloudflare cercanos al usuario final.
- **Trade-off Aceptado**: Límites estrictos de memoria por isolate (128 MB RAM) y CPU time (50ms en plan gratuito, extensible en bundles de Workers), exigiendo una estricta validación de tamaño previa en payloads y buffers base64.

---

## 3. Pila Tecnológica y Despliegue

- **Frontend**: React 18, Vite, Material UI (MUI), React Router v7, TanStack Query.
- **Backend / Edge Functions**: Cloudflare Pages Functions (TypeScript compilado a V8 Isolates con `nodejs_compat`).
- **Bases de Datos**: Cloudflare D1 (SQLite serverless) con transacciones atómicas mediante `env.DB.batch(...)`.
- **Caché / Sesiones / Rate Limiting**: Upstash Redis REST API vía `@upstash/redis/cloudflare` y `@upstash/ratelimit`.
- **Storage**: Cloudflare R2 con binding nativo `env.BUCKET`.
- **Herramientas de Build y Test**: `oxlint`, `typescript` (`tsc`), `vite`, `playwright` (E2E), Miniflare (`wrangler pages dev`).

---

## 4. Superficies de Entrada y Flujos Críticos

1. **Autenticación (`/api/auth/*`)**:
   - `login`: Entrada pública JSON -> verificación bcrypt de tiempo constante con fallback -> emisión de cookie JWT HttpOnly.
   - `verify`: Endpoint consultado por el frontend para validar sesión sin invocar seeding pasivo.
   - `logout`: Invalida sesión incrementando `tokenVersion` en Redis y expirando cookie.
2. **Catálogo Público (`/api/public/*`)**:
   - `GET /api/public/products`: Consulta D1 sobre productos activos (`is_active = 1`), resuelve URLs y emite cabecera `Cache-Control: public, s-maxage=60`.
   - `GET /api/public/[collection]`: Restringido por lista blanca `ALLOWED_PUBLIC_COLLECTIONS` hacia R2 `data/`.
3. **Checkout y Creación de Órdenes (`/api/public/orders`)**:
   - Entrada JSON validada con Zod (`OrderSchema`).
   - Cómputo del total forzosamente recalculado en servidor consultando D1.
   - Inserción atómica en `orders` y `order_items` con `env.DB.batch(...)`.
4. **Administración de Inventario y Medios (`/api/admin/products/[[id]]`)**:
   - Ingesta de imágenes en base64 con limitador previo de tamaño (`MAX_BASE64_LEN = 10MB`).
   - Decodificación y subida directa al bucket R2 (`products/*.webp`).
   - Limpieza de imágenes huérfanas en actualización y borrado.
5. **Cierre de Caja y Finanzas (`/api/admin/orders/close`, `export-purge`)**:
   - Cierre atómico con asignación de `closure_id` sobre órdenes aprobadas.
   - Exportación estructurada JSON y purga protegida por rol `owner`.

---

## 5. Fronteras de Confianza y Controles de Seguridad

| Frontera de Confianza | Superficie | Control Fuente Más Fuerte |
|---|---|---|
| Internet pública -> Funciones Edge | `functions/_middleware.ts` & `public/_headers` | CSP estricto (`default-src 'self'`), HSTS (1 año preload), X-Frame-Options DENY, rate limiting en endpoints sensibles. |
| Cliente HTTP -> Base de Datos D1 | Todas las rutas `/api/*` | Consultas 100% preparadas y parametrizadas con `.bind(...)`. Tipado y restricciones CHECK en esquema D1. |
| Cliente HTTP -> Almacenamiento R2 | `/api/media/[[path]]` | Confinamiento forzoso a prefijo `products/` y rechazo estricto de secuencias `..`, `/` y `\\`. |
| Cliente -> Cálculo de Precios | `/api/public/orders` | Descarte del precio enviado por el cliente; recálculo obligatorio en servidor contra base de datos D1. |
| Operador -> Operaciones Críticas | `/api/admin/*` & `/api/users/*` | Verificación de claims JWT y rol contra jerarquía `ROLE_HIERARCHY`, protección de `owner` e invalidación instantánea por `tokenVersion`. |
| Capa Aplicación -> Upstash Redis | `src/core/auth/rate-limit.ts` | Política Fail-Open por disponibilidad operativa documentada (SEC-07) con mitigación requerida en Cloudflare WAF perimetral. |

---

## 6. Estado de Revalidación de Hallazgos Previos (Run-1 a Run-2)

- **FND-AUTH-TIMING-01**: **Mitigado**. Implementado hash sintético `DUMMY_HASH` de tiempo constante en `functions/api/auth/[action].ts`.
- **FND-PERF-QUOTA-02**: **Mitigado**. Erradicado `ensureSeeder` de `handleVerify`, eliminando el consumo continuo de cuota en Upstash.
- **FND-R2-MEM-03**: **Mitigado**. Implementado corte temprano de 10MB en cadenas base64 previniendo OOM en el isolate.
- **FND-CSP-FONTS-04**: **Mitigado**. Autorizado origen `https://fonts.googleapis.com` en CSP de `functions/_middleware.ts` y `public/_headers`.
- **FND-SET-CACHE-05**: **Mitigado**. Añadido `.strict()` a `SettingsSchema` en `functions/api/settings.ts`, rechazando claves no controladas.
- **NV-WAF-RATELIMIT-01**: **Needs Validation**. Permanece como ítem de validación de infraestructura/operador para comprobar la activación de reglas Cloudflare WAF Rate Limiting en el perímetro.
