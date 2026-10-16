# Elementos que Requieren Validación Externa (Needs Validation)
**Proyecto:** Zetech Web (`svkenier/zetech-web`)  
**Auditoría:** Cloudflare Security Audit  
**Fecha:** Octubre 2026  

---

## NV-WAF-RATELIMIT-01: Verificación de Reglas Perimetrales Cloudflare WAF por Política Fail-Open en Redis

### 1. Descripción de la Hipótesis
En `src/core/auth/rate-limit.ts`, la función `checkRateLimit` implementa deliberadamente una política de **Fail-Open** por disponibilidad operativa:
```typescript
// src/core/auth/rate-limit.ts:51-53
} catch (err) {
  console.error('[RateLimit Fallback Active]: Fallo en Upstash Redis. Concediendo acceso por política de disponibilidad.');
  // Fallback: Si el rate limit falla o no es compatible con el runtime local (Miniflare), permitimos la petición.
  return { success: true, limit: 10, remaining: 10, reset: Date.now() + 10000 };
}
```

El código fuente contiene documentación explícita justificando este compromiso de diseño:
> *POLÍTICA ARQUITECTÓNICA DE SEGURIDAD (SEC-07):*  
> *1. Política de Capa de Aplicación: Fail-Open por disponibilidad de negocio para no interrumpir ventas si Upstash sufre caídas de red o cuotas agotadas.*  
> *2. Mitigación Perimetral Requerida: La defensa estricta contra ataques de fuerza bruta y denegación de servicio debe residir en las reglas de Cloudflare WAF Rate Limiting en el perímetro sobre `/api/auth/login` y `/api/public/orders`.*

### 2. Bloqueadores para la Confirmación Estática
- **Ausencia de configuración perimetral en repositorio:** Las reglas de Cloudflare WAF Rate Limiting se definen directamente en la consola web de Cloudflare o mediante pipelines de Terraform/API no versionados en este repositorio de código de aplicación.
- **Principio de seguridad y no agresión:** La política de auditoría prohíbe terminantemente realizar pruebas de carga, inundación HTTP o ataques de denegación de servicio contra los dominios en producción.

---

### 3. Plan de Verificación para el Propietario / Operador

#### A. Verificación en Despliegue (Cloudflare Dashboard)
1. Iniciar sesión en [Cloudflare Dashboard](https://dash.cloudflare.com/).
2. Seleccionar la zona/dominio de **Zetech Web**.
3. Navegar a **Security** -> **WAF** -> pestaña **Rate limiting rules**.
4. Confirmar que existan al menos dos reglas activas:
   - **Regla 1 (Protección contra Fuerza Bruta en Login):**
     - Expresión: `http.request.uri.path eq "/api/auth/login" and http.request.method eq "POST"`
     - Umbral de tasa: `5 requests per 1 minute per IP`
     - Acción: `Block` (duración: 15 minutos)
   - **Regla 2 (Protección de Checkout / Órdenes Públicas):**
     - Expresión: `http.request.uri.path eq "/api/public/orders" and http.request.method eq "POST"`
     - Umbral de tasa: `10 requests per 1 minute per IP`
     - Acción: `Block` o `Managed Challenge` (duración: 10 minutos)
5. Si las reglas no están configuradas, crearlas de inmediato siguiendo los parámetros anteriores.

#### B. Verificación Local (Sandbox Miniflare)
1. Ejecutar localmente `npm run build` y levantar el servidor de desarrollo `npx wrangler pages dev dist --binding UPSTASH_REDIS_REST_URL=http://127.0.0.1:9999 --binding UPSTASH_REDIS_REST_TOKEN=invalid`.
2. Realizar una petición a `POST /api/auth/login`.
3. Comprobar en los logs que se emite la advertencia:  
   `[RateLimit Fallback Active]: Fallo en Upstash Redis. Concediendo acceso por política de disponibilidad.`
4. Confirmar que la aplicación concede la solicitud y no sufre una caída por excepción no capturada.
