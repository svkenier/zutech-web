# Informe Ejecutivo de Auditoría de Ciberseguridad Cloudflare
**Objetivo:** `svkenier/zetech-web`  
**Perfil de Auditoría:** Estándar (`standard`)  
**Metodología:** `@cloudflare-security-audit` (Análisis Estático y Arquitectónico Defensivo)  
**Estado de la Ejecución:** Completado (`completed`)  
**Fecha:** Octubre 2026  

---

## 1. Resumen Ejecutivo

Se ha completado una auditoría de seguridad exhaustiva, estática y arquitectónica sobre el repositorio completo de **Zetech Web**, evaluando las capas de **Cloudflare Pages Functions**, bases de datos serverless (**Cloudflare D1**), almacenamiento de objetos (**Cloudflare R2**), capa de sesiones y límites de tasa (**Upstash Redis**) y perímetros de red (**WAF, CSP, Headers HTTP**).

El análisis identificó un diseño de seguridad general **sólido y maduro en el manejo de persistencia y autorización crítica**:
- **Cero inyecciones SQL:** Todas las consultas a SQLite/D1 se encuentran estrictamente parametrizadas mediante `.prepare(...).bind(...)`.
- **Integridad comercial garantizada:** El cálculo de importes y subtotales en las órdenes de compra se ejecuta exclusivamente en el servidor consultando D1, descartando cualquier precio alterado desde el cliente.
- **Revocación de sesiones en tiempo real:** Uso de `tokenVersion` en Redis que invalida tokens JWT anteriores inmediatamente tras un reseteo de clave o cierre de sesión.
- **Control de acceso basado en roles (RBAC):** Jerarquía estricta que previene la escalada de privilegios y protege la cuenta raíz (`owner`).

No obstante, se identificaron **5 hallazgos confirmados** (3 de severidad Media y 2 de severidad Baja) y **1 hipótesis que requiere validación en el panel de Cloudflare**, principalmente asociados a canales laterales de tiempo, agotamiento de cuotas por polling excesivo y optimización de memoria en Workers.

---

## 2. Matriz de Hallazgos y Clasificación de Riesgos

| ID | Título | Severidad | Probabilidad | Impacto | Estado |
| :--- | :--- | :---: | :---: | :---: | :---: |
| **FND-AUTH-TIMING-01** | Enumeración de Usuarios por Discrepancia de Tiempos en Login | **Media** | Alta | Baja | Confirmado |
| **FND-PERF-QUOTA-02** | Agotamiento de Cuota de Redis y DoS por Seeder en Heartbeat | **Media** | Alta | Media | Confirmado |
| **FND-R2-MEM-03** | Agotamiento de Memoria (OOM) en Worker por Base64 Ilimitado | **Media** | Media | Media | Confirmado |
| **FND-CSP-FONTS-04** | Violación de Content Security Policy en `style-src` para Fonts | **Baja** | Alta | Baja | Confirmado |
| **FND-SET-CACHE-05** | Riesgo de Cacheo en Edge CDN de Configuraciones Arbitrarias | **Baja** | Media | Baja | Confirmado |
| **NV-WAF-RATELIMIT-01**| Verificación de Reglas Perimetrales WAF por Fail-Open en Redis | **N/A** | N/A | N/A | Requiere Validación |

---

## 3. Resumen de Hallazgos Confirmados

### FND-AUTH-TIMING-01: Timing Side-Channel en Inicio de Sesión
- **Ubicación:** `functions/api/auth/[action].ts:67`
- **Impacto:** Permite a actores no autenticados enumerar con certeza matemática qué usuarios existen en la plataforma (~120ms para usuarios existentes vs <2ms para inexistentes).
- **Acción:** Introducir un hash bcrypt sintético precomputado (`DUMMY_HASH`) que se evalúe invariablemente cuando el usuario no exista.

### FND-PERF-QUOTA-02: Agotamiento de Cuota Upstash Redis por Seeder en Heartbeat
- **Ubicación:** `functions/api/auth/[action].ts:132` acoplado con `src/ui/components/ProtectedRoute.tsx:51`
- **Impacto:** El polling pasivo de verificación cada 20s invoca `ensureSeeder` (ejecuta `SMEMBERS` y `MGET`), consumiendo ~4,320 comandos diarios por pestaña abierta y alcanzando velozmente la cuota de 10,000 req/día de Upstash. Provoca caída del panel y error 503.
- **Acción:** Remover `ensureSeeder(env)` del endpoint de verificación de sesión `/api/auth/verify`.

### FND-R2-MEM-03: Presión de Memoria y Caída del Isolate por Base64 en Catálogo
- **Ubicación:** `functions/api/admin/products/[[id]].ts:26-48` y `142-162`
- **Impacto:** Subidas de imágenes en base64 de más de 30MB duplican el uso de memoria en el runtime V8, superando el límite de 128MB de RAM del isolate de Cloudflare Workers y causando terminación inmediata del proceso.
- **Acción:** Validar la longitud de la cadena base64 limitándola a un máximo estricto de 5MB antes de ejecutar `atob()`.

### FND-CSP-FONTS-04: Inconsistencia en Política CSP para Fuentes Externas
- **Ubicación:** `functions/_middleware.ts:20`, `public/_headers:7` vs `index.html:28`
- **Impacto:** La directiva `style-src 'self' 'unsafe-inline'` bloquea la hoja de estilos de Google Fonts declarada en el HTML, generando advertencias en consola y fallos de renderizado de tipografías.
- **Acción:** Incorporar `https://fonts.googleapis.com` en `style-src` de middleware y encabezados estáticos.

### FND-SET-CACHE-05: Exposición Perimetral de Configuraciones en Edge CDN
- **Ubicación:** `functions/api/settings.ts:29-36`, `45`
- **Impacto:** Esquema Zod permisivo (`.catchall()`) junto con cabecera `Cache-Control: public, s-maxage=60` almacena en la CDN perimetral cualquier campo arbitrario guardado por administradores.
- **Acción:** Aplicar `.strict()` al esquema de configuración general y separar configuraciones privadas en un endpoint sin caché pública.

---

## 4. Estado de Validación Externa (Needs Validation)

### NV-WAF-RATELIMIT-01: Verificación de Reglas Perimetrales Cloudflare WAF
- **Límite evaluado:** Capa de aplicación vs Perímetro de Cloudflare.
- **Condición:** El archivo `src/core/auth/rate-limit.ts:51-53` aplica una política intencional de **Fail-Open** por disponibilidad de negocio (SEC-07). Para mitigar ataques DoS o fuerza bruta cuando Redis no esté disponible, el propietario debe validar que las reglas de **Cloudflare Rate Limiting WAF** estén activas en el Dashboard de Cloudflare sobre `/api/auth/login` y `/api/public/orders`.

---

## 5. Próximos Pasos Recomendados

1. **Prioridad 1:** Implementar el parche de tiempo constante en `functions/api/auth/[action].ts`.
2. **Prioridad 1:** Remover `ensureSeeder` de `handleVerify` para proteger la cuota de Upstash Redis.
3. **Prioridad 2:** Limitar el tamaño de las cadenas base64 a 5MB en `functions/api/admin/products/[[id]].ts`.
4. **Prioridad 2:** Ajustar las directivas CSP en `functions/_middleware.ts` y `public/_headers`.
5. **Prioridad 3:** Verificar en el Dashboard de Cloudflare la presencia de las reglas de WAF Rate Limiting.
