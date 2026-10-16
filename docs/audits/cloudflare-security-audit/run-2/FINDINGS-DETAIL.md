# Detalle Técnico de Hallazgos y Remediaciones — Run-2
**Proyecto:** Zetech Web (`svkenier/zetech-web`)  
**Auditoría:** Cloudflare Security Audit — Run-2 (Post-Remediación)  
**Fecha:** 16 de Octubre de 2026  
**Auditor Líder:** Auditor Principal de Ciberseguridad (@cloudflare-security-audit)

---

## Resumen de Estado de Hallazgos

En esta segunda iteración (**Run-2**), se realizó un escrutinio exhaustivo sobre los 5 hallazgos reportados en Run-1 y se auditaron en profundidad las nuevas superficies de confianza. **Todas las vulnerabilidades previas han sido corregidas con éxito en el código fuente**, registrándose 0 vulnerabilidades activas y 5 hallazgos mitigados (`rejected`).

---

## 1. Revalidación de Hallazgos Previos de Run-1

### FND-AUTH-TIMING-01: Enumeración Remota de Usuarios por Timing Side-Channel en Login
- **Clasificación**: `rejected` (Previamente Confirmado en Run-1, Severidad Media).
- **Invariante Evaluada**: *El tiempo de ejecución de la autenticación frente a credenciales inválidas debe ser indistinguible independientemente de si el identificador de usuario existe o no.*
- **Causa Original en Run-1**: Si el usuario no existía en Redis, se omitía la evaluación criptográfica de bcrypt (`verifyPassword`), demorando menos de 1ms frente a los ~80-150ms de una verificación de contraseña real.
- **Verificación de Remediación en Run-2**:
  En `functions/api/auth/[action].ts` (líneas 66-72):
  ```typescript
  // Mitigación de timing attack: Si el usuario no existe, se evalúa contra un hash bcrypt sintético precalculado
  const DUMMY_HASH = '$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy';
  const hashToVerify = user?.password_hash || DUMMY_HASH;
  let valid = await verifyPassword(password, hashToVerify);
  if (!user?.password_hash) {
    valid = false;
  }
  ```
  Adicionalmente, en la verificación contra credenciales de entorno administrativo de respaldo (líneas 75-76):
  ```typescript
  const isPasswordMatch = envPass ? await timingSafeEqual(password, envPass) : false;
  ```
  La función `timingSafeEqual` utiliza `crypto.subtle.timingSafeEqual` sobre buffers SHA-256 normalizados en tiempo constante.
- **Dictamen**: **MITIGADO Y VERIFICADO**.

---

### FND-PERF-QUOTA-02: Agotamiento de Cuota Upstash Redis por Seeder en Heartbeat
- **Clasificación**: `rejected` (Previamente Confirmado en Run-1, Severidad Media).
- **Invariante Evaluada**: *Las operaciones de verificación de sesión de alta frecuencia deben ser estrictamente idempotentes, ligeras y exentas de mutaciones de estado o consultas pesadas a Redis.*
- **Causa Original en Run-1**: `ProtectedRoute.tsx` enviaba una petición a `/api/auth/verify` cada 20 segundos. El handler `handleVerify` ejecutaba `ensureSeeder(env)` en cada petición, consumiendo 12,000+ comandos diarios en Upstash y agotando el tier gratuito en menos de 24 horas.
- **Verificación de Remediación en Run-2**:
  En `functions/api/auth/[action].ts` (líneas 135-144):
  ```typescript
  async function handleVerify(request: Request, env: Env) {
    // Se ha eliminado la llamada a ensureSeeder(env) en este endpoint de alta frecuencia.
    const payload = await getAuthPayload(request, env);
    if (!payload) {
      return new Response(JSON.stringify({ ok: false }), { 
        status: 401, 
        headers: { 'Content-Type': 'application/json' } 
      });
    }
    return new Response(JSON.stringify({ ok: true, user: payload }), {
      headers: { 'Content-Type': 'application/json' }
    });
  }
  ```
  La llamada a `ensureSeeder` fue reubicada exclusivamente a `handleLogin` (baja frecuencia) y protegida mediante un flag de inicialización. La verificación de sesión se realiza en memoria en el isolate de Cloudflare Workers decodificando y validando el JWT.
- **Dictamen**: **MITIGADO Y VERIFICADO**.

---

### FND-R2-MEM-03: Agotamiento de Memoria (OOM) en Worker por Carga Ilimitada de Imágenes Base64
- **Clasificación**: `rejected` (Previamente Confirmado en Run-1, Severidad Media).
- **Invariante Evaluada**: *Cualquier carga de datos binarios procesada en la memoria del isolate de Cloudflare Workers debe estar estrictamente acotada a una fracción segura de la cuota de RAM (128MB).*
- **Causa Original en Run-1**: Las peticiones `POST` y `PUT` en `/api/admin/products` aceptaban cadenas Base64 arbitrariamente grandes en `main_image_base64`. Cargas de 30-40MB provocaban picos de más de 128MB de RAM al concatenar strings, buffers `atob` y arrays `Uint8Array`, crasheando el worker por OOM.
- **Verificación de Remediación en Run-2**:
  En `functions/api/admin/products/[[id]].ts` (líneas 27-34 en `onRequestPost` e idéntico en `onRequestPut` líneas 135-142):
  ```typescript
  // Límite estricto de seguridad: 10MB en base64 (~7MB decodificados) para prevenir OOM en Workers
  const MAX_BASE64_LEN = 10 * 1024 * 1024;
  if (typeof body.main_image_base64 === 'string' && body.main_image_base64.length > MAX_BASE64_LEN) {
    return new Response(JSON.stringify({ 
      error: 'La imagen excede el límite máximo permitido de 10MB en base64.' 
    }), { status: 413, headers: { 'Content-Type': 'application/json' } });
  }
  ```
  Asimismo, en la importación masiva (`functions/api/admin/products/bulk.ts`, líneas 83-88) se impone el mismo guardia de longitud previa.
- **Dictamen**: **MITIGADO Y VERIFICADO**.

---

### FND-CSP-FONTS-04: Violación de Content Security Policy (CSP) en style-src
- **Clasificación**: `rejected` (Previamente Confirmado en Run-1, Severidad Baja).
- **Invariante Evaluada**: *Las cabeceras Content-Security-Policy deben autorizar de manera exacta todos los orígenes legítimos declarados en el markup HTML del cliente.*
- **Causa Original en Run-1**: `index.html` importaba `https://fonts.googleapis.com/css2?family=Inter`, pero `functions/_middleware.ts` y `public/_headers` restringían `style-src` a `'self' 'unsafe-inline'`, bloqueando la tipografía en navegadores que aplican CSP estricto.
- **Verificación de Remediación en Run-2**:
  En `functions/_middleware.ts` (líneas 19-21) y `public/_headers` (línea 7):
  ```http
  Content-Security-Policy: default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; img-src 'self' data: blob: https:; connect-src 'self' https://*.cloudflare.com; font-src 'self' data: https: https://fonts.gstatic.com; frame-ancestors 'none';
  ```
  La directiva ahora permite explícitamente `https://fonts.googleapis.com` en `style-src` y `https://fonts.gstatic.com` en `font-src`.
- **Dictamen**: **MITIGADO Y VERIFICADO**.

---

### FND-SET-CACHE-05: Riesgo de Exposición de Claves Arbitrarias en Cache de Settings
- **Clasificación**: `rejected` (Previamente Confirmado en Run-1, Severidad Baja).
- **Invariante Evaluada**: *Los endpoints públicos sujetos a almacenamiento en caché perimetral CDN deben exponer únicamente modelos de datos cerrados y estrictamente tipados.*
- **Causa Original en Run-1**: `SettingsSchema` en `functions/api/settings.ts` utilizaba `.catchall(...)`, permitiendo que claves arbitrarias inyectadas en la base de datos fueran devueltas por el endpoint `/api/settings` y cacheadas públicamente por 24 horas en la CDN (`public, s-maxage=60, stale-while-revalidate=86400`).
- **Verificación de Remediación en Run-2**:
  En `functions/api/settings.ts` (líneas 17-31):
  ```typescript
  const SettingsSchema = z.object({
    store_name: z.string().max(100).optional(),
    store_phone: z.string().max(30).optional(),
    store_email: z.string().email().max(100).optional(),
    store_address: z.string().max(255).optional(),
    delivery_fee: z.number().min(0).max(1000).optional(),
    maintenance_mode: z.boolean().optional(),
    allow_guest_checkout: z.boolean().optional(),
    low_stock_threshold: z.number().int().min(0).max(1000).optional(),
    domainAlertEnabled: z.boolean().optional(),
    exchange_rate: z.number().min(0).optional(),
    tasa_bcv: z.number().min(0).optional()
  }).strict();
  ```
  El uso de `.strict()` hace que Zod rechace cualquier payload que contenga campos ajenos a la lista blanca oficial con HTTP 400 antes de interactuar con la base de datos o la caché perimetral.
- **Dictamen**: **MITIGADO Y VERIFICADO**.

---

## 2. Candidatos Auditados en Profundidad y Descartados (Falsos Positivos Refutados)

Durante la fase de caza de vulnerabilidades de Run-2, se evaluaron hipótesis de ataque sobre componentes críticos:

### Hipótesis A: Inyección SQL en Consultas Dinámicas de Productos y Pedidos
- **Superficie**: `functions/api/admin/products/[[id]].ts`, `functions/api/admin/orders/[[id]].ts`, `functions/api/public/orders.ts`.
- **Escrutinio Realizado**: Búsqueda estática con expresiones regulares de concatenación de cadenas (`+`, `${...}`) en llamadas a `env.DB.prepare(...)`.
- **Resultado**: Todas las consultas utilizan marcadores posicionales (`?`) con `.bind(...)`:
  ```typescript
  await env.DB.prepare(`SELECT * FROM products WHERE id = ?`).bind(id).first();
  ```
- **Conclusión**: **Refutado (Sin Vulnerabilidad)**. Parámetros vinculados de forma segura a nivel SQLite en D1.

---

### Hipótesis B: Escalada de Privilegios en Administración de Usuarios RBAC
- **Superficie**: `functions/api/admin/users/[[id]].ts`.
- **Escrutinio Realizado**: Verificación de si un usuario con rol `manager` o `cashier` puede ascenderse a `admin` o manipular cuentas protegidas.
- **Resultado**: Se constató la presencia de controles jerárquicos estrictos:
  ```typescript
  if (!canManage(callerRole, targetUser.role)) {
    return new Response(JSON.stringify({ error: 'No tienes permisos para modificar este rol.' }), { status: 403 });
  }
  if (targetUser.isProtected || targetUser.role === 'owner') {
    return new Response(JSON.stringify({ error: 'Este usuario está protegido y no puede ser modificado.' }), { status: 403 });
  }
  ```
- **Conclusión**: **Refutado (Sin Vulnerabilidad)**. Reglas RBAC aplicadas de forma consistente en backend.

---

### Hipótesis C: Manipulación de Precios desde el Cliente en Checkout
- **Superficie**: `functions/api/public/orders.ts`.
- **Escrutinio Realizado**: Verificación de si el backend confía en los valores de `price` enviados en el body JSON del checkout público.
- **Resultado**: El backend busca en D1 cada producto por `id`, extrae el precio unitario oficial almacenado en el servidor y compara:
  ```typescript
  const serverItem = await env.DB.prepare('SELECT price, is_active, stock FROM products WHERE id = ?').bind(item.id).first();
  if (Math.abs(serverItem.price - item.price) > 0.001) {
    return new Response(JSON.stringify({ error: 'El precio de uno o más productos ha cambiado.', code: 'PRICE_CHANGED' }), { status: 409 });
  }
  ```
- **Conclusión**: **Refutado (Sin Vulnerabilidad)**. Integridad de precios garantizada por recálculo en servidor.

---

### Hipótesis D: Bucket Escape / Path Traversal en Almacenamiento R2
- **Superficie**: `functions/api/media/[[path]].ts`.
- **Escrutinio Realizado**: Verificación de si se pueden recuperar objetos fuera del prefijo de imágenes utilizando `../` o rutas absolutas.
- **Resultado**: El código sanitiza y valida el path de forma estricta:
  ```typescript
  const sanitizedPath = (context.params.path as string[])?.join('/') || '';
  if (sanitizedPath.includes('..') || sanitizedPath.startsWith('/') || sanitizedPath.includes('\\')) {
    return new Response('Invalid path', { status: 400 });
  }
  const fullPath = `products/${sanitizedPath.replace(/^products\//, '').replace(/[^a-zA-Z0-9_\-\.]/g, '')}`;
  ```
- **Conclusión**: **Refutado (Sin Vulnerabilidad)**. El objeto siempre se confina forzosamente dentro del namespace `products/`.

---

## 3. Conclusión de Hallazgos

El proyecto no presenta vulnerabilidades explotables en el estado actual del repositorio. Se recomienda proceder con la validación de configuraciones perimetrales en Cloudflare WAF documentadas en [NEEDS-VALIDATION.md](file:///c:/Users/SVKENIER/OneDrive/Escritorio/zutechWeb/zetech-web/docs/audits/cloudflare-security-audit/run-2/NEEDS-VALIDATION.md).
