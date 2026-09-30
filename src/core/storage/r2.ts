import { Env } from '../auth/auth.js';
import { cfg } from '../coreConfig.js';

/**
 * r2.ts - Adaptador de Almacenamiento para Cloudflare R2
 * Reemplaza a github.ts
 */

export async function putFile(
  env: Env,
  path: string,
  content: ArrayBuffer | Uint8Array | string,
  contentType: string = 'application/octet-stream'
): Promise<boolean> {
  try {
    await env.BUCKET.put(path, content, {
      httpMetadata: { contentType },
    });
    return true;
  } catch (error) {
    console.error(`[R2] Error uploading ${path}:`, error);
    return false;
  }
}

export async function deleteFile(env: Env, path: string): Promise<boolean> {
  try {
    await env.BUCKET.delete(path);
    return true;
  } catch (error) {
    console.error(`[R2] Error deleting ${path}:`, error);
    return false;
  }
}

export async function getFileWithETag(env: Env, path: string, ifNoneMatch?: string): Promise<{ data: any; etag: string | null; status: number }> {
  try {
    const object = await env.BUCKET.get(path);
    
    if (!object) {
      return { data: null, etag: null, status: 404 };
    }

    const etag = object.httpEtag;
    
    if (ifNoneMatch && etag && ifNoneMatch === etag) {
      return { data: null, etag, status: 304 };
    }

    const text = await object.text();
    let data = text;
    try {
      data = JSON.parse(text);
    } catch (e) {
      // Not JSON
    }

    return { data, etag, status: 200 };
  } catch (error) {
    console.error(`[R2] Error reading ${path}:`, error);
    return { data: null, etag: null, status: 500 };
  }
}

/**
 * Resuelve la URL de la imagen. Si es un archivo local del bucket, retorna la URL del R2 público.
 */
export function cdnImageUrl(relativePath: string | undefined): string {
  if (!relativePath) return '';
  if (relativePath.startsWith('http')) return relativePath; // Retrocompatibilidad
  
  // Asumimos un dominio público configurado para el bucket R2 o el worker.
  const baseUrl = cfg.R2_PUBLIC_URL || 'https://cdn.zutech.com';
  return `${baseUrl}/${relativePath}`;
}

export function extractPathFromCdnUrl(url: string): string | null {
  if (!url) return null;
  const baseUrl = cfg.R2_PUBLIC_URL || 'https://cdn.zutech.com';
  if (url.startsWith(baseUrl)) {
    let relative = url.replace(baseUrl, '');
    if (relative.startsWith('/')) relative = relative.substring(1);
    return relative;
  }
  // Fallback para imágenes antiguas en github
  if (url.includes('cdn.jsdelivr.net/gh/')) {
    const match = url.match(/cdn\.jsdelivr\.net\/gh\/[^/]+\/[^/]+@[^/]+\/(.*)/);
    if (match && match[1]) {
      return match[1];
    }
  }
  return null;
}
