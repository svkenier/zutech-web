/**
 * Utilidad de compresión y normalización EXIF para escaneo móvil con IA.
 * Utiliza createImageBitmap con imageOrientation: 'from-image' para orientar
 * correctamente las fotos verticales tomadas en iOS y Android.
 */

const MAX_SCAN_DIMENSION_PX = 1600;
const SCAN_JPEG_QUALITY = 0.8;

/**
 * Comprime y normaliza la orientación de una foto capturada por la cámara móvil.
 * Mantiene la relación de aspecto dentro de 1600x1600 px y exporta a JPEG (calidad 0.8).
 * Libera de inmediato los recursos de memoria del bitmap y del canvas.
 *
 * @param file - Archivo de imagen original obtenido del input de cámara
 * @returns Promesa con la cadena DataURL (data:image/jpeg;base64,...)
 */
export async function compressScannerImage(file: File): Promise<string> {
  // 1. Intentar decodificación con corrección nativa de orientación EXIF
  let bitmap: ImageBitmap | null = null;

  try {
    bitmap = await createImageBitmap(file, { imageOrientation: 'from-image' });
  } catch {
    try {
      bitmap = await createImageBitmap(file);
    } catch {
      // Fallback para navegadores antiguos que no soporten createImageBitmap con Blob
      return fallbackCompressWithImage(file);
    }
  }

  try {
    let width = bitmap.width;
    let height = bitmap.height;

    if (width > MAX_SCAN_DIMENSION_PX || height > MAX_SCAN_DIMENSION_PX) {
      if (width > height) {
        height = Math.round((height * MAX_SCAN_DIMENSION_PX) / width);
        width = MAX_SCAN_DIMENSION_PX;
      } else {
        width = Math.round((width * MAX_SCAN_DIMENSION_PX) / height);
        height = MAX_SCAN_DIMENSION_PX;
      }
    }

    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;

    const ctx = canvas.getContext('2d');
    if (!ctx) {
      throw new Error('No se pudo obtener el contexto 2D del Canvas');
    }

    // Fondo blanco para evitar transparencias accidentales en caso de PNG/WebP
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(0, 0, width, height);

    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(bitmap, 0, 0, width, height);

    const dataUrl = canvas.toDataURL('image/jpeg', SCAN_JPEG_QUALITY);

    // Liberación estricta de memoria del canvas
    canvas.width = 0;
    canvas.height = 0;

    return dataUrl;
  } finally {
    if (bitmap) {
      bitmap.close();
    }
  }
}

/**
 * Fallback basado en elemento <img> y URL.createObjectURL si createImageBitmap falla.
 */
function fallbackCompressWithImage(file: File): Promise<string> {
  return new Promise<string>((resolve, reject) => {
    const objectUrl = URL.createObjectURL(file);
    const img = new Image();

    img.onload = () => {
      URL.revokeObjectURL(objectUrl);
      try {
        let width = img.naturalWidth || img.width;
        let height = img.naturalHeight || img.height;

        if (width > MAX_SCAN_DIMENSION_PX || height > MAX_SCAN_DIMENSION_PX) {
          if (width > height) {
            height = Math.round((height * MAX_SCAN_DIMENSION_PX) / width);
            width = MAX_SCAN_DIMENSION_PX;
          } else {
            width = Math.round((width * MAX_SCAN_DIMENSION_PX) / height);
            height = MAX_SCAN_DIMENSION_PX;
          }
        }

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext('2d');
        if (!ctx) {
          reject(new Error('No se pudo obtener el contexto 2D del Canvas'));
          return;
        }

        ctx.fillStyle = '#FFFFFF';
        ctx.fillRect(0, 0, width, height);
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';
        ctx.drawImage(img, 0, 0, width, height);

        const dataUrl = canvas.toDataURL('image/jpeg', SCAN_JPEG_QUALITY);

        canvas.width = 0;
        canvas.height = 0;

        resolve(dataUrl);
      } catch (err) {
        reject(err);
      }
    };

    img.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      reject(new Error('Error al cargar la imagen para compresión'));
    };

    img.src = objectUrl;
  });
}
