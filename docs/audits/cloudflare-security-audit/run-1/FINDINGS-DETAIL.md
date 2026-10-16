# Detalle Técnico de Hallazgos Confirmados y Remediaciones
**Proyecto:** Zetech Web (`svkenier/zetech-web`)  
**Auditoría:** Cloudflare Security Audit  
**Fecha:** Octubre 2026  

---

## FND-AUTH-TIMING-01: Enumeración Remota de Usuarios por Timing Side-Channel en Login

### 1. Invariante de Seguridad Violada
> **Invariante:** *El tiempo de ejecución de la autenticación frente a credenciales inválidas debe ser estadísticamente indistinguible independientemente de si el identificador de usuario existe o no en el almacén de datos.*

### 2. Análisis Causal
En `functions/api/auth/[action].ts`:
```typescript
// Línea 57:
let user = await getUser(usernameClean, env) as any;

// Línea 67:
let valid = user?.password_hash ? await verifyPassword(password, user.password_hash) : false;

// Línea 73:
const isPasswordMatch = envPass ? await timingSafeEqual(password, envPass) : false;
```
Cuando `user` no existe en Redis:
- `user?.password_hash` es `undefined`.
- `verifyPassword(password, ...)` (que ejecuta `bcrypt.compare`, consumiendo ~80-150ms de CPU) se **omite por completo**.
- Se evalúa únicamente `timingSafeEqual(password, envPass)` que tarda menos de 1 milisegundo.
- Resultado: un atacante que mida la latencia de respuesta puede inferir con certeza si el nombre de usuario existe o no.

### 3. Código de Remediación
```diff
--- a/functions/api/auth/[action].ts
+++ b/functions/api/auth/[action].ts
@@ -64,7 +64,13 @@ async function handleLogin(request: Request, env: Env) {
       }
     }
 
-    let valid = user?.password_hash ? await verifyPassword(password, user.password_hash) : false;
+    // Mitigación de timing attack: Si el usuario no existe, se evalúa contra un hash bcrypt ficticio precomputado
+    const DUMMY_HASH = '$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy';
+    const hashToVerify = user?.password_hash || DUMMY_HASH;
+    let valid = await verifyPassword(password, hashToVerify);
+    if (!user?.password_hash) {
+      valid = false;
+    }
 
     const envUser = (env.ADMIN_USER ?? '').replace(/^"|"$/g, '').trim();
     const envPass = (env.ADMIN_PASSWORD ?? '').replace(/^"|"$/g, '').trim();
```

---

## FND-PERF-QUOTA-02: Agotamiento de Cuota Upstash Redis por Seeder en Heartbeat

### 1. Invariante de Seguridad Violada
> **Invariante:** *Las operaciones de verificación de sesión de alta frecuencia deben ser estrictamente idempotentes, ligeras y exentas de tareas de inicialización o mutación de estado.*

### 2. Análisis Causal
En `src/ui/components/ProtectedRoute.tsx`:
```typescript
// Línea 51:
intervalId = window.setInterval(checkSession, 20000); // 1 petición cada 20s
```
En `functions/api/auth/[action].ts`:
```typescript
// Línea 130:
async function handleVerify(request: Request, env: Env) {
  try {
    await ensureSeeder(env); // <-- Invocado en CADA latido
  } ...
}

// Línea 159:
async function ensureSeeder(env: Env) {
  const users = await listUsers(env); // Ejecuta SMEMBERS y MGET en Upstash
  ...
}
```
Con una sola pestaña abierta:
- 3 peticiones por minuto = 180 peticiones por hora = 4,320 peticiones en 24 horas.
- Cada petición ejecuta al menos 2 comandos Redis en `ensureSeeder` + comandos de sesión en `getUser`.
- Total: más de 12,000 comandos Redis al día por un único usuario conectado.
- La cuota gratuita de Upstash (10,000 comandos/día) se agota en menos de 20 horas, causando errores HTTP 503 (`Servicio de autenticación no disponible temporalmente`) y bloqueando a todo el equipo administrativo.

### 3. Código de Remediación
```diff
--- a/functions/api/auth/[action].ts
+++ b/functions/api/auth/[action].ts
@@ -129,17 +129,6 @@ async function handleLogout() {
 
 async function handleVerify(request: Request, env: Env) {
-  try {
-    await ensureSeeder(env);
-  } catch (err) {
-    if (err && (err as any).name === 'ConfigurationError') {
-      console.error('[Upstash Config Error]:', err);
-      return new Response(JSON.stringify({
-        ok: false,
-        error: 'Servicio de autenticación no disponible temporalmente'
-      }), { status: 503, headers: { 'Content-Type': 'application/json' } });
-    }
-    console.error('ensureSeeder error:', err);
-  }
   
   const payload = await getAuthPayload(request, env);
   if (!payload) {
```

---

## FND-R2-MEM-03: Agotamiento de Memoria (OOM) en Worker por Base64 Ilimitado

### 1. Invariante de Seguridad Violada
> **Invariante:** *Cualquier carga de datos binarios procesada en la memoria del isolate de Cloudflare Workers debe estar estrictamente acotada a una fracción segura de la cuota de RAM (128MB).*

### 2. Análisis Causal
En `functions/api/admin/products/[[id]].ts`:
```typescript
// Línea 34:
const arr = fileContent.split(',');
...
// Línea 39:
const bstr = atob(arr[1]);
const u8arr = new Uint8Array(bstr.length);
for (let i = 0; i < bstr.length; i++) {
  u8arr[i] = bstr.charCodeAt(i);
}
```
Si el cliente envía una imagen base64 de 30-40MB, el proceso V8 mantiene:
1. El string en el JSON deserializado (~40MB).
2. El array resultante de `split(',')` (~40MB).
3. La cadena decodificada resultante de `atob()` (~30MB).
4. El buffer `Uint8Array` (~30MB).
El consumo total supera holgadamente los 128MB de RAM del isolate de Cloudflare Workers, provocando un error irrecuperable de Out-Of-Memory y caída del worker.

### 3. Código de Remediación
```diff
--- a/functions/api/admin/products/[[id]].ts
+++ b/functions/api/admin/products/[[id]].ts
@@ -25,6 +25,14 @@ export const onRequestPost: PagesFunction<Env> = async (context) => {
     let finalImageUrl = body.main_image || '';
 
     if (body.main_image_base64) {
+      // Límite estricto de seguridad: 5MB decodificados (aprox. 6.8MB en base64)
+      const MAX_BASE64_LENGTH = 5 * 1024 * 1024 * 1.37;
+      if (typeof body.main_image_base64 === 'string' && body.main_image_base64.length > MAX_BASE64_LENGTH) {
+        return new Response(JSON.stringify({ 
+          error: 'La imagen adjunta excede el límite de 5MB permitido.' 
+        }), { status: 413, headers: { 'Content-Type': 'application/json' } });
+      }
+
       try {
         const uniqueSuffix = Math.random().toString(36).substring(7);
         const r2Path = `products/${id}-${uniqueSuffix}.webp`;
```
*(Aplicar idéntico guardia en el handler `onRequestPut` línea 142)*.

---

## FND-CSP-FONTS-04: Violación de CSP en `style-src` para Fuentes Externas

### 1. Invariante de Seguridad Violada
> **Invariante:** *Las cabeceras Content-Security-Policy deben alinearse de forma exacta con todos los orígenes de recursos externos declarados en los documentos HTML de la aplicación.*

### 2. Análisis Causal
En `functions/_middleware.ts:20` y `public/_headers:7`:
```http
Content-Security-Policy: ... style-src 'self' 'unsafe-inline'; ...
```
En `index.html:28`:
```html
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" />
```
El navegador bloquea la carga de la hoja de estilos externa al no estar `https://fonts.googleapis.com` explícitamente autorizada en `style-src`.

### 3. Código de Remediación
```diff
--- a/functions/_middleware.ts
+++ b/functions/_middleware.ts
@@ -17,7 +17,7 @@ export const onRequest: PagesFunction = async (context) => {
   try {
     const response = await context.next();
     const newHeaders = new Headers(response.headers);
-    newHeaders.set('Content-Security-Policy', "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob: https:; connect-src 'self' https://*.cloudflare.com; font-src 'self' data: https:; frame-ancestors 'none';");
+    newHeaders.set('Content-Security-Policy', "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; img-src 'self' data: blob: https:; connect-src 'self' https://*.cloudflare.com; font-src 'self' data: https: https://fonts.gstatic.com; frame-ancestors 'none';");
     newHeaders.set('X-Content-Type-Options', 'nosniff');
     newHeaders.set('X-Frame-Options', 'DENY');
```

```diff
--- a/public/_headers
+++ b/public/_headers
@@ -4,4 +4,4 @@
   Referrer-Policy: strict-origin-when-cross-origin
   Permissions-Policy: camera=(), microphone=(), geolocation=()
   Strict-Transport-Security: max-age=31536000; includeSubDomains; preload
-  Content-Security-Policy: default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob: https:; connect-src 'self'; font-src 'self' data: https:; frame-ancestors 'none';
+  Content-Security-Policy: default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; img-src 'self' data: blob: https:; connect-src 'self'; font-src 'self' data: https: https://fonts.gstatic.com; frame-ancestors 'none';
```

---

## FND-SET-CACHE-05: Riesgo de Cacheo en Edge CDN de Configuraciones Arbitrarias

### 1. Invariante de Seguridad Violada
> **Invariante:** *Los endpoints públicos sujetos a almacenamiento en caché perimetral CDN deben exponer únicamente modelos de datos cerrados y estrictamente tipados.*

### 2. Análisis Causal
En `functions/api/settings.ts`:
```typescript
// Línea 29:
const SettingsSchema = z.object({
  ...
}).catchall(
  z.union([z.string().max(1000), z.number(), z.boolean(), z.null()])
);

// Línea 45:
headers.set('Cache-Control', 'public, s-maxage=60, stale-while-revalidate=86400');
```
Si un desarrollador o administrador almacena parámetros confidenciales en la tabla general de settings, estos datos se almacenarán en los servidores perimetrales de Cloudflare y se servirán públicamente.

### 3. Código de Remediación
```diff
--- a/functions/api/settings.ts
+++ b/functions/api/settings.ts
@@ -26,14 +26,7 @@ const SettingsSchema = z.object({
   domainAlertEnabled: z.boolean().nullable().optional(),
   exchange_rate: z.number().nonnegative().nullable().optional(),
   tasa_bcv: z.number().nonnegative().nullable().optional(),
-}).catchall(
-  z.union([
-    z.string().max(1000),
-    z.number(),
-    z.boolean(),
-    z.null(),
-  ])
-);
+}).strict();
```
