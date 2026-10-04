import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, '..');
const devVarsPath = path.join(rootDir, '.dev.vars');

if (fs.existsSync(devVarsPath)) {
  const content = fs.readFileSync(devVarsPath, 'utf-8');
  for (const line of content.split('\n')) {
    const trimmed = line.trim();
    if (trimmed && !trimmed.startsWith('#')) {
      const match = trimmed.match(/^([^=]+)=(.*)$/);
      if (match) {
        let key = match[1].trim();
        let value = match[2].trim();
        if (value.startsWith('"') && value.endsWith('"')) value = value.slice(1, -1);
        else if (value.startsWith("'") && value.endsWith("'")) value = value.slice(1, -1);
        process.env[key] = value;
      }
    }
  }
}

const reqVars = ['UPSTASH_REDIS_REST_URL', 'UPSTASH_REDIS_REST_TOKEN'];
const missing = reqVars.filter(v => !process.env[v]);
if (missing.length > 0) {
  console.log('[Migrate]: Faltan credenciales.');
  process.exit(1);
}

const env = process.env as any;
import { listUsers, setUser, getUser } from '../src/core/auth/kv.js';

async function migrate() {
  const users = await listUsers(env);
  let updated = 0;
  for (const u of users) {
    if (u.role === 'superadmin' && u.isProtected) {
      const fullUser = await getUser(u.username, env);
      if (fullUser) {
        fullUser.role = 'owner';
        await setUser(fullUser, env);
        console.log(`[Migrate]: Usuario ${u.username} migrado a owner.`);
        updated++;
      }
    }
  }
  console.log(`[Migrate]: ${updated} usuarios actualizados.`);
}

migrate();
