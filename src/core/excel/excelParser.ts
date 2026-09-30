import ExcelJS from 'exceljs';
import { optimizeImage } from '../media/imageOptimizer';

export interface StagingProduct {
  id: string; // crypto.randomUUID()
  nombre: string;
  precio: number;
  categoria: string;
  descripcion: string;
  in_stock: boolean;
  imagenBlob?: Blob | null; // compressed WebP blob
  imagenUrl?: string; // Original URL or R2 URL
  previewUrl?: string; // Blob URL for UI preview
  status: 'valid' | 'invalid';
  errors: string[];
}

export async function parseExcel(buffer: ArrayBuffer): Promise<StagingProduct[]> {
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(buffer);
  const worksheet = workbook.worksheets[0];
  if (!worksheet) throw new Error('No worksheets found');

  const products: StagingProduct[] = [];
  
  // Extraer imágenes embebidas
  const images = worksheet.getImages();
  const rowImages = new Map<number, any>();
  
  for (const image of images) {
    if (image.range.tl.row !== undefined) {
      // row is 0-indexed in range. tl.row is the top-left row.
      const rowIndex = image.range.tl.row + 1; // getRow is 1-indexed
      const imgInfo = workbook.model.media?.find(m => m.index === image.imageId);
      if (imgInfo) {
        rowImages.set(rowIndex, imgInfo);
      }
    }
  }

  const headerRow = worksheet.getRow(1);
  const headers = new Map<string, number>();
  
  headerRow.eachCell((cell, colNumber) => {
    const text = cell.text?.trim().toUpperCase();
    if (text) {
      if (text.includes('ID')) headers.set('ID', colNumber);
      else if (text.includes('NOMBRE')) headers.set('NOMBRE', colNumber);
      else if (text.includes('PRECIO')) headers.set('PRECIO', colNumber);
      else if (text.includes('CATEGOR')) headers.set('CATEGORIA', colNumber);
      else if (text.includes('DESCRIPCI')) headers.set('DESCRIPCION', colNumber);
      else if (text.includes('DISPONIBLE') || text.includes('STOCK')) headers.set('STOCK', colNumber);
      else if (text.includes('IMAGEN') || text.includes('FOTO')) headers.set('IMAGEN', colNumber);
    }
  });

  // Iterar filas (asumiendo que la cabecera es la fila 1)
  for (let i = 2; i <= worksheet.rowCount; i++) {
    const row = worksheet.getRow(i);
    
    const colNombre = headers.get('NOMBRE') || 1;
    const colPrecio = headers.get('PRECIO') || 2;
    const colCat = headers.get('CATEGORIA') || 3;
    const colDesc = headers.get('DESCRIPCION') || 4;
    const colStock = headers.get('STOCK') || 5;
    const colImg = headers.get('IMAGEN') || 6;
    const colId = headers.get('ID');

    const nombre = row.getCell(colNombre).text?.trim();
    if (!nombre) continue; // Saltar filas vacías

    const precioRaw = row.getCell(colPrecio).value;
    const precio = Number(precioRaw);
    
    const categoria = row.getCell(colCat).text?.trim();
    const descripcion = row.getCell(colDesc).text?.trim() || '';
    
    const inStockText = row.getCell(colStock).text?.trim().toLowerCase();
    const in_stock = inStockText !== 'no' && inStockText !== 'falso' && inStockText !== 'false';
    
    let imagenUrl = row.getCell(colImg).text?.trim() || '';
    
    const errors: string[] = [];
    if (!nombre) errors.push('Nombre es requerido');
    if (isNaN(precio) || precio < 0) errors.push('Precio debe ser número positivo');
    if (!categoria) errors.push('Categoría es requerida');
    
    let imagenBlob: Blob | null = null;
    let previewUrl: string | undefined = undefined;

    // ¿Imagen embebida en la fila?
    const embeddedImage = rowImages.get(i);
    if (embeddedImage && embeddedImage.buffer) {
      const extension = embeddedImage.extension || 'png';
      const file = new File([embeddedImage.buffer], `img.${extension}`, { type: `image/${extension}` });
      try {
        const optimized = await optimizeImage(file, 0.8, 700); // Max width 700px, 80% quality
        imagenBlob = optimized.blob;
        previewUrl = optimized.previewUrl;
      } catch (e) {
        // En lugar de fallar la fila entera, marcamos advertencia pero permitimos continuar
        errors.push('No se pudo procesar la imagen embebida');
      }
    } else if (imagenUrl) {
      // ¿Es una URL externa ajena al CDN local?
      if (imagenUrl.startsWith('http') && !imagenUrl.includes('pub-zutech.r2.dev') && !imagenUrl.includes('cdn.zutech.com')) {
        try {
          const res = await fetch(imagenUrl);
          if (!res.ok) throw new Error('Fetch failed');
          const blob = await res.blob();
          const file = new File([blob], 'ext.jpg', { type: blob.type });
          const optimized = await optimizeImage(file, 0.8, 700);
          imagenBlob = optimized.blob;
          previewUrl = optimized.previewUrl;
        } catch (e) {
          // Add error but let product be valid if images are optional
          errors.push('No se pudo descargar la imagen externa');
        }
      } else {
         // Es una URL de R2 o relativa, no se procesa
         previewUrl = imagenUrl;
      }
    }

    const providedId = colId ? row.getCell(colId).text?.trim() : undefined;

    products.push({
      id: providedId || crypto.randomUUID(),
      nombre,
      precio: isNaN(precio) ? 0 : precio,
      categoria,
      descripcion,
      in_stock,
      imagenUrl,
      imagenBlob,
      previewUrl,
      status: errors.length > 0 ? 'invalid' : 'valid',
      errors
    });
  }
  
  return products;
}
