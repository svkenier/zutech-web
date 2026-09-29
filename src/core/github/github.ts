/**
 * Utilidades para la GitHub Contents API.
 *
 * Gestiona la base de datos almacenada en el repositorio público:
 *   /data/items.json         → JSON maestro de registros
 *   /data/settings/general.json → Configuración global
 *   /images/items/{id}.webp  → foto principal
 *   /images/items/{id}-extra-{n}.webp → fotos secundarias
 *
 * Variables de entorno requeridas (backend-only):
 *   GITHUB_TOKEN   — Personal Access Token con permisos repo
 *   GITHUB_OWNER   — Propietario del repositorio
 *   GITHUB_REPO    — Nombre del repositorio
 *   GITHUB_BRANCH  — Rama (default: main)
 */

import type { Env } from '../auth/auth.js';

function getGhConfig(env: Env) {
  const missingVars: string[] = [];
  if (!env.GITHUB_TOKEN) missingVars.push('GITHUB_TOKEN');
  if (!env.GITHUB_OWNER) missingVars.push('GITHUB_OWNER');
  if (!env.GITHUB_REPO) missingVars.push('GITHUB_REPO');

  if (missingVars.length > 0) {
    console.error(`[GitHub Config Error]: Faltan variables de entorno requeridas: ${missingVars.join(', ')}`);
  }

  return {
    GITHUB_TOKEN:  env.GITHUB_TOKEN ?? '',
    GITHUB_OWNER:  env.GITHUB_OWNER ?? '',
    GITHUB_REPO:   env.GITHUB_REPO  ?? '',
    GITHUB_BRANCH: env.GITHUB_BRANCH ?? '',
  };
}

const GH_BASE = (env: Env) => `https://api.github.com/repos/${getGhConfig(env).GITHUB_OWNER}/${getGhConfig(env).GITHUB_REPO}/contents`;

const GH_HEADERS = (env: Env) => ({
  'Authorization':       `token ${getGhConfig(env).GITHUB_TOKEN}`,
  'Accept':              'application/vnd.github+json',
  'Content-Type':        'application/json',
  'X-GitHub-Api-Version': '2022-11-28',
  'User-Agent':          'Cloudflare-Pages-App',
});

// ─── Tipos internos ───────────────────────────────────────────────────────────

export interface GHFileInfo {
  sha:     string;
  content: string; // base64 encoded
  name:    string;
  path:    string;
}

export class ConfigurationError extends Error {
  constructor(public provider: 'GitHub' | 'Upstash', message: string) {
    super(message);
    this.name = 'ConfigurationError';
  }
}

// ─── Helper genérico de petición ─────────────────────────────────────────────

async function ghRequest<T = unknown>(
  method: string,
  path: string,
  env: Env,
  body?: Record<string, unknown>,
): Promise<T> {
  const response = await fetch(`${GH_BASE(env)}/${path}`, {
    method,
    headers: GH_HEADERS(env),
    body: body ? JSON.stringify(body) : undefined,
  });

  const cfg = getGhConfig(env);
  console.log(`[GitHub API] Request: ${method} ${cfg.GITHUB_OWNER}/${cfg.GITHUB_REPO} -> /${path} (Status: ${response.status})`);

  if (response.status === 204) return undefined as T;

  let json: Record<string, unknown> = {};
  const text = await response.text();
  try {
    json = JSON.parse(text);
  } catch {
    json = { message: text || `GitHub API error: ${response.status}` };
  }

  if (!response.ok) {
    const errorMsg = (json['message'] as string) ?? `GitHub API error: ${response.status} ${response.statusText}`;
    console.error(`[GitHub Request Failed]: ${response.status} ${response.statusText} - ${JSON.stringify(json)}`);
    if (response.status === 401 || response.status === 403) {
      throw new ConfigurationError('GitHub', `Token inválido o sin permisos: ${errorMsg}`);
    }
    throw new Error(`[Status ${response.status}] ${errorMsg}`);
  }

  return json as T;
}

// ─── Operaciones de archivo ───────────────────────────────────────────────────

export async function getFile(path: string, env: Env): Promise<GHFileInfo | null> {
  try {
    return await ghRequest<GHFileInfo>('GET', path, env);
  } catch (err) {
    if (err instanceof Error) {
      const msg = err.message;
      if (msg.includes('Not Found') || msg.includes('This repository is empty') || msg.includes('Git Repository is empty')) {
        return null;
      }
    }
    throw err;
  }
}

export interface GHEtagResponse {
  data: GHFileInfo | null;
  etag: string | null;
  notModified: boolean;
}

export async function getFileWithETag(path: string, env: Env, ifNoneMatch?: string): Promise<GHEtagResponse> {
  const headers: Record<string, string> = { ...GH_HEADERS(env) };
  if (ifNoneMatch) {
    headers['If-None-Match'] = ifNoneMatch;
  }

  const response = await fetch(`${GH_BASE(env)}/${path}`, {
    method: 'GET',
    headers,
  });

  const cfg = getGhConfig(env);
  console.log(`[GitHub API] Request: GET ${cfg.GITHUB_OWNER}/${cfg.GITHUB_REPO} -> /${path} (Status: ${response.status})`);

  if (response.status === 304) {
    return { data: null, etag: response.headers.get('ETag'), notModified: true };
  }

  if (response.status === 404 || response.status === 409) {
    return { data: null, etag: null, notModified: false };
  }

  let json: Record<string, unknown> = {};
  const text = await response.text();
  try {
    json = JSON.parse(text);
  } catch {
    json = { message: text || `GitHub API error: ${response.status}` };
  }

  if (!response.ok) {
    const errorMsg = (json['message'] as string) ?? `GitHub API error: ${response.status}`;
    if (response.status === 401 || response.status === 403) {
      console.error(`[GitHub Config Error]: ${errorMsg}`);
      throw new ConfigurationError('GitHub', `Token inválido o sin permisos: ${errorMsg}`);
    }
    throw new Error(errorMsg);
  }

  return {
    data: json as unknown as GHFileInfo,
    etag: response.headers.get('ETag'),
    notModified: false,
  };
}

export async function putFile(
  path: string,
  content: string,
  message: string,
  env: Env,
  sha?: string,
): Promise<void> {
  // Corrección para Base64 segura en Edge
  let finalBase64 = content;
  if (!isBase64(content)) {
    const bytes = new TextEncoder().encode(content);
    const binString = Array.from(bytes, (byte) => String.fromCodePoint(byte)).join('');
    finalBase64 = btoa(binString);
  }

  const branch = getGhConfig(env).GITHUB_BRANCH;
  const bodyPayload: any = {
    message,
    content: finalBase64,
    ...(sha ? { sha } : {}),
  };
  if (branch) {
    bodyPayload.branch = branch;
  }

  await ghRequest('PUT', path, env, bodyPayload);
}

export async function deleteFile(
  path: string,
  message: string,
  env: Env,
): Promise<void> {
  const branch = getGhConfig(env).GITHUB_BRANCH;
  
  // 1. Obtener SHA del archivo
  const fileInfo = await getFile(path, env);
  if (!fileInfo || !fileInfo.sha) {
    console.warn(`[GitHub Delete] Archivo no encontrado o ya eliminado: ${path}`);
    return;
  }

  // 2. Ejecutar borrado
  const bodyPayload: any = { message, sha: fileInfo.sha };
  if (branch) {
    bodyPayload.branch = branch;
  }
  
  try {
    await ghRequest('DELETE', path, env, bodyPayload);
  } catch (e: any) {
    console.error(`[GitHub Delete Error]: falló el borrado de ${path}`, e);
  }
}

// ─── Helpers específicos ───────────────────────────────────────────────────


export const SHELTER_INFO_PATH = 'data/settings/general.json';

export const cdnImageUrl = (relativePath: string, env: Env) => {
  const cfg = getGhConfig(env);
  const branchPart = cfg.GITHUB_BRANCH ? `@${cfg.GITHUB_BRANCH}` : '@main';
  return `https://cdn.jsdelivr.net/gh/${cfg.GITHUB_OWNER}/${cfg.GITHUB_REPO}${branchPart}/${relativePath}`;
};

export function isBase64(str: string): boolean {
  return /^[A-Za-z0-9+/]+=*$/.test(str.replace(/\s/g, ''));
}

export function generateItemId(): string {
  return `record-${Date.now()}`;
}

export function extractPathFromCdnUrl(url: string, env: Env): string | null {
  const cfg = getGhConfig(env);
  const branchPart = cfg.GITHUB_BRANCH ? `@${cfg.GITHUB_BRANCH}` : '@main';
  const prefix = `https://cdn.jsdelivr.net/gh/${cfg.GITHUB_OWNER}/${cfg.GITHUB_REPO}${branchPart}/`;
  if (url.startsWith(prefix)) {
    let path = url.substring(prefix.length);
    if (path.includes('?')) path = path.split('?')[0]; 
    return path;
  }
  return null;
}
