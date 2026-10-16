import * as readline from 'node:readline';

const message = `
======================================================================
🚨 RECORDATORIO CRÍTICO DE PERÍMETRO Y PROTECCIÓN (SEC-CF-09)
======================================================================
Para proteger tu cuota gratuita de Upstash Redis (10.000 req/día) contra
ataques de fuerza bruta y bots en producción, debes activar esta regla:

PASO A PASO EN CLOUDFLARE DASHBOARD:
1. Inicia sesión en https://dash.cloudflare.com
2. Selecciona tu dominio (ej. zutech.com).
3. En el menú lateral izquierdo ve a:
   Seguridad (Security) > WAF > Reglas de limitación de velocidad (Rate limiting rules).
4. Haz clic en "Crear regla" (Create rule) y configura:
   - Nombre de la regla: "Rate Limit Login - Proteccion Upstash"
   - Si la solicitud entrante coincide con:
     * Campo: "URI Path" (Ruta de URI)
     * Operador: "equals" (es igual a)
     * Valor: "/api/auth/login"
     * Y (And):
     * Campo: "Request Method" (Método de solicitud)
     * Operador: "equals" (es igual a)
     * Valor: "POST"
   - Con una tasa que exceda:
     * 5 solicitudes por 1 minuto
   - Tomar acción:
     * Selecciona: "Managed Challenge" (Desafío interactivo/Turnstile) o "Block" (Bloquear por 15 min).
5. Haz clic en "Implementar" (Deploy).

(Opcional recomendado): Crear una regla similar para "/api/public/orders"
con límite de 10 solicitudes por 1 minuto.
======================================================================
`;

console.log(message);

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

rl.on('SIGINT', () => {
  console.log('\n❌ Despliegue cancelado por el usuario.');
  rl.close();
  process.exit(1);
});

rl.question('¿Has verificado/configurado esta regla o deseas continuar con el despliegue? (s/n): ', (answer) => {
  rl.close();
  const trimmed = answer.trim().toLowerCase();
  if (trimmed === 's') {
    console.log('✅ Verificación confirmada. Continuando con el despliegue...\n');
    process.exit(0);
  } else {
    console.log('❌ Despliegue abortado. Por favor, revisa la configuración perimetral en Cloudflare antes de desplegar.\n');
    process.exit(1);
  }
});
