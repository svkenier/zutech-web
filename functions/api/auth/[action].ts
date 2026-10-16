import { getAuthRateLimit, checkRateLimit } from '../../../src/core/auth/rate-limit.js';
import { signToken, verifyToken, getAuthPayload, type Env } from '../../../src/core/auth/auth.js';
import { getUser, updateLastLogin, activateTTL, cancelTTL, listUsers, setUser, updateUserPreservingTTL } from '../../../src/core/auth/kv.js';
import { verifyPassword, hashPassword } from '../../../src/core/auth/crypto.js';

async function timingSafeEqual(a: string, b: string): Promise<boolean> {
  const encoder = new TextEncoder();
  const aBuf = await crypto.subtle.digest('SHA-256', encoder.encode(a));
  const bBuf = await crypto.subtle.digest('SHA-256', encoder.encode(b));
  return crypto.subtle.timingSafeEqual(aBuf, bBuf);
}

export const onRequest: PagesFunction<Env> = async (context) => {
  const { request, env, params } = context;
  const action = params.action as string;

  if (request.method === 'OPTIONS') return new Response(null, { status: 204 });

  if (action === 'login' && request.method === 'POST') return handleLogin(request, env);
  if (action === 'logout' && request.method === 'POST') return handleLogout(request, env);
  if (action === 'verify' && request.method === 'GET') return handleVerify(request, env);

  return new Response(JSON.stringify({ error: 'Ruta no encontrada' }), { status: 404, headers: { 'Content-Type': 'application/json' } });
};

async function handleLogin(request: Request, env: Env) {
  try {
    await ensureSeeder(env);
  } catch (err) {
    if (err && (err as any).name === 'ConfigurationError') {
      console.error('[Upstash Config Error]:', err);
      return new Response(JSON.stringify({
        ok: false,
        error: 'Servicio de autenticación no disponible temporalmente'
      }), { status: 503, headers: { 'Content-Type': 'application/json' } });
    }
    console.error('ensureSeeder error:', err);
  }

  const ip = request.headers.get('cf-connecting-ip') ?? '127.0.0.1';
  const limitRes = await checkRateLimit(getAuthRateLimit(env), ip);

  if (!limitRes.success) {
    return new Response(JSON.stringify({ error: 'Demasiados intentos. Intenta más tarde.' }), { 
      status: 429, 
      headers: { 'Content-Type': 'application/json', 'X-RateLimit-Limit': limitRes.limit.toString(), 'X-RateLimit-Remaining': limitRes.remaining.toString() } 
    });
  }

  try {
    let { username, password } = await request.json() as any;
    if (!username || !password) {
      return new Response(JSON.stringify({ error: 'Credenciales incompletas' }), { status: 400, headers: { 'Content-Type': 'application/json' } });
    }

    const usernameClean = String(username).trim().toLowerCase();
    let user = await getUser(usernameClean, env) as any;
    
    if (typeof user === 'string') {
      try {
        user = JSON.parse(user);
      } catch {
        // failed to parse
      }
    }

    const DUMMY_HASH = '$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy';
    const hashToVerify = user?.password_hash || DUMMY_HASH;
    let valid = await verifyPassword(password, hashToVerify);
    if (!user?.password_hash) {
      valid = false;
    }

    const envUser = (env.ADMIN_USER ?? '').replace(/^"|"$/g, '').trim();
    const envPass = (env.ADMIN_PASSWORD ?? '').replace(/^"|"$/g, '').trim();

    // Fallback de Desarrollo / Sincronización Automática (Tiempo constante):
    const isPasswordMatch = envPass ? await timingSafeEqual(password, envPass) : false;
    if (!valid && envUser && envPass && usernameClean === envUser.toLowerCase() && isPasswordMatch) {
      valid = true;
      console.log('[Auth Debug] Fallback activado: ADMIN_PASSWORD coincide. Resincronizando hash en Redis...');
      const newHash = await hashPassword(password);
      await updateUserPreservingTTL(usernameClean, { password_hash: newHash }, env);
    }


    if (!user || !valid) {
      return new Response(JSON.stringify({ error: 'Usuario o contraseña incorrectos' }), { status: 401, headers: { 'Content-Type': 'application/json' } });
    }

    const token = signToken(user.username, user.role, user.tokenVersion ?? 1, env);
    
    const now = new Date();
    const expiresAt = new Date(now);
    if (user.role === 'superadmin') expiresAt.setDate(expiresAt.getDate() + 180);
    else if (user.role !== 'owner') expiresAt.setDate(expiresAt.getDate() + 30);
    
    const updates: any = { last_login: now.toISOString() };
    if (user.role !== 'owner') updates.expires_at = expiresAt.toISOString();

    await updateUserPreservingTTL(user.username, updates, env);
    await cancelTTL(user.username, env);

    const headers = new Headers();
    headers.set('Content-Type', 'application/json');
    headers.set('Set-Cookie', `auth_session_token=${token}; HttpOnly; Path=/; Max-Age=604800; SameSite=Strict; Secure`);

    return new Response(JSON.stringify({ 
      ok: true, 
      user: { username: user.username, role: user.role, last_login: user.last_login } 
    }), { status: 200, headers });
  } catch (err) {
    console.error('Error in login:', err);
    return new Response(JSON.stringify({ error: 'Error interno del servidor' }), { status: 500, headers: { 'Content-Type': 'application/json' } });
  }
}

async function handleLogout(request: Request, env: Env) {
  const payload = await getAuthPayload(request, env);
  if (payload) {
    const user = await getUser(payload.sub, env);
    if (user) {
      await updateUserPreservingTTL(payload.sub, { tokenVersion: (user.tokenVersion || 1) + 1 }, env);
    }
    await activateTTL(payload.sub, env);
  }

  const headers = new Headers();
  headers.set('Content-Type', 'application/json');
  headers.set('Set-Cookie', `auth_session_token=; HttpOnly; Path=/; Max-Age=0; SameSite=Strict; Secure`);

  return new Response(JSON.stringify({ ok: true }), { status: 200, headers });
}

async function handleVerify(request: Request, env: Env) {
  const payload = await getAuthPayload(request, env);
  if (!payload) {
    return new Response(JSON.stringify({ error: 'No autenticado' }), { status: 401, headers: { 'Content-Type': 'application/json' } });
  }

  return new Response(JSON.stringify({ 
    user: { username: payload.sub, role: payload.role } 
  }), { status: 200, headers: { 'Content-Type': 'application/json' } });
}

async function ensureSeeder(env: Env) {
  const users = await listUsers(env);
  if (users.length === 0) {
    const envUser = (env.ADMIN_USER ?? '').replace(/^"|"$/g, '').trim();
    const envPass = (env.ADMIN_PASSWORD ?? '').replace(/^"|"$/g, '').trim();

    if (!envPass || !envUser) {
      throw new Error("ADMIN_USER or ADMIN_PASSWORD is missing. Initial seeding aborted for security.");
    }
    const hashed = await hashPassword(envPass);
    await setUser({
      username: envUser,
      password_hash: hashed,
      role: 'owner',
      tokenVersion: 1,
      last_login: new Date().toISOString(),
      created_by: 'system-seeder',
      created_at: new Date().toISOString(),
      isProtected: true
    }, env);
  }
}
