import { optimizeForScanner } from './imageOptimizer';

/**
 * Fachada para compatibilidad retroactiva.
 * Delega al optimizador canónico WebP (700x700) para inferencia ultraligera en IA.
 *
 * @param file - Archivo de imagen original obtenido del input o cámara
 * @returns Promesa con la cadena DataURL (data:image/webp;base64,...)
 */
export async function compressScannerImage(file: File): Promise<string> {
  const { dataUrl } = await optimizeForScanner(file);
  return dataUrl;
}
