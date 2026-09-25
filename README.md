# ZUTECH Web & E-Commerce Platform

## Stack Tecnológico
- **Frontend:** React 18, TypeScript, Tailwind CSS, Vite.
- **Serverless & Edge:** Cloudflare Pages Functions.
- **Base de Datos Relacional:** Cloudflare D1 (SQLite en el Edge).
- **Auth, Sesiones y Rate-Limiting:** Upstash Redis (REST API) + JWT.
- **Almacenamiento & CDN de Imágenes:** Repositorio externo (`argos-tech-solutions/-zutech-assets`) servido vía jsDelivr CDN.

## Estructura del Proyecto
- `src/ui/`: Componentes de interfaz de usuario, vistas, contextos y hooks de React.
- `src/core/`: Lógica de negocio, esquemas de validación, tipos y utilidades.
- `functions/api/`: Cloudflare Pages Functions (endpoints de API serverless).
- `public/`: Archivos estáticos.

## Configuración de Entorno Local

### Instalación
Instala las dependencias del proyecto usando pnpm:
```bash
pnpm install
```

### Variables de Entorno
Copia el archivo de ejemplo y configúralo con tus credenciales:
```bash
cp .dev.vars.example .dev.vars
```
Asegúrate de configurar los valores en `.dev.vars` con tus credenciales, especialmente el `JWT_SECRET`. **NOTA:** El archivo `.dev.vars` nunca debe subirse al repositorio de código.

### Ejecución Local
Inicia el servidor de desarrollo local:
```bash
pnpm dev
```

## Arquitectura de Seguridad & Checkout
- **Validación:** Se utiliza Zod para la validación estricta de esquemas de datos tanto en el cliente como en el servidor.
- **Seguridad en Base de Datos:** Parametrización SQL en consultas a Cloudflare D1 para prevenir ataques de Inyección SQL (SQLi).
- **Rate Limiting:** Implementación de rate limiter estricto (ej. 3 req/min/IP en órdenes) utilizando Upstash Redis.
- **Checkout:** Flujo de checkout simplificado vía WhatsApp sin almacenamiento de información personal sensible (PII) de ubicación.
