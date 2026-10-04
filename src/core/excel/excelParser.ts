import ExcelJS from 'exceljs';


export interface StagingProduct {
  id: string; // crypto.randomUUID()
  ref_num: string; // From col A
  sku?: string; // Generado
  nombre: string;
  marca: string;
  precio: number;
  categoria: string;
  descripcion: string;
  in_stock: boolean;
  imagenBlob?: Blob | null; // compressed WebP blob
  imagenUrl?: string; // Final URL after upload to R2
  previewUrl?: string; // Blob URL for UI preview
  allowNoPhoto?: boolean;
  status: 'Incompleto' | 'Sin foto' | 'Listo';
  errors: string[];
  existingImageUrl?: string;
  removeImage?: boolean;
}


/**
 * Normaliza un valor de precio proveniente de Excel a un número con 2 decimales.
 *
 * Casos soportados:
 *   "105.33"      → 105.33  (punto decimal US)
 *   "105,33"      → 105.33  (coma decimal EU)
 *   "1.250,50"    → 1250.50 (miles con punto, decimal con coma)
 *   "1,250.50"    → 1250.50 (miles con coma, decimal con punto)
 *   "$105.33"     → 105.33  (símbolo monetario)
 *   "USD 105"     → 105.00  (etiqueta textual)
 *   105.33        → 105.33  (número nativo de ExcelJS)
 */
function normalizePrice(raw: unknown): number {
  // ExcelJS puede devolver el número directamente
  if (typeof raw === 'number') {
    return Number(raw.toFixed(2));
  }

  let s = String(raw ?? '')
    .replace(/[$USD\s"']/gi, '') // quitar símbolo, etiqueta USD, espacios y comillas
    .trim();

  if (!s) return NaN;

  const hasComma = s.includes(',');
  const hasDot   = s.includes('.');

  if (hasComma && hasDot) {
    // Determinar cuál es separador de miles y cuál de decimales
    const lastComma = s.lastIndexOf(',');
    const lastDot   = s.lastIndexOf('.');

    if (lastComma > lastDot) {
      // Formato EU: 1.250,50 → quitar puntos de miles, cambiar coma decimal por punto
      s = s.replace(/\./g, '').replace(',', '.');
    } else {
      // Formato US: 1,250.50 → quitar comas de miles
      s = s.replace(/,/g, '');
    }
  } else if (hasComma && !hasDot) {
    // Sólo coma: podría ser decimal EU (105,33) o miles sin decimales (1,250)
    const parts = s.split(',');
    if (parts.length === 2 && parts[1].length <= 2) {
      // Decimal EU: 105,33 o 1250,5
      s = s.replace(',', '.');
    } else {
      // Miles sin decimal: 1,250 → 1250
      s = s.replace(/,/g, '');
    }
  }
  // Si sólo hay punto, es formato estándar → sin cambio

  const num = parseFloat(s);
  return isNaN(num) ? NaN : Number(num.toFixed(2));
}

export function evaluateRowStatus(row: Partial<StagingProduct>): 'Incompleto' | 'Sin foto' | 'Listo' {
  const isCompleteText = !!(row.nombre && row.marca && row.precio !== undefined && !isNaN(row.precio) && row.precio > 0 && row.categoria);
  
  if (!isCompleteText) {
    return 'Incompleto';
  }

  if (row.imagenBlob || (row.existingImageUrl && !row.removeImage) || row.allowNoPhoto) {
    return 'Listo';
  }

  return 'Sin foto';
}

export async function parseExcel(buffer: ArrayBuffer): Promise<StagingProduct[]> {

  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(buffer);
  const worksheet = workbook.worksheets[0];
  if (!worksheet) throw new Error('No worksheets found');

  // Anillo 1 - Validación de Origen del Sistema (Intemporal)
  const metaSheet = workbook.getWorksheet('__sys_manifest__');
  const manifestValue = metaSheet?.getCell('A1').value;
  if (!metaSheet || manifestValue !== 'APP_CATALOG_OFFICIAL_TEMPLATE') {
    throw new Error('INVALID_ORIGIN');
  }

  const products: StagingProduct[] = [];

  const headerRow = worksheet.getRow(1);
  const headers = new Map<string, number>();
  
  headerRow.eachCell((cell, colNumber) => {
    let text = cell.text?.trim().toLowerCase() || '';
    text = text.normalize("NFD").replace(/[\u0300-\u036f]/g, ""); // strip accents
    text = text.replace(/[^a-z0-9#]/g, ''); // alphanumeric and # only

    if (text.includes('ref#') || text.includes('ref')) headers.set('REF', colNumber);
    else if (text.includes('nombre')) headers.set('NOMBRE', colNumber);
    else if (text.includes('marca')) headers.set('MARCA', colNumber);
    else if (text.includes('precio')) headers.set('PRECIO', colNumber);
    else if (text.includes('categoria')) headers.set('CATEGORIA', colNumber);
    else if (text.includes('descripcion')) headers.set('DESCRIPCION', colNumber);
    else if (text.includes('disponible') || text.includes('stock')) headers.set('STOCK', colNumber);
    else if (text.includes('imagen') || text.includes('url')) headers.set('IMAGEN', colNumber);
  });

  // Anillo 2 - Validación Estricta de Cabeceras (Fila 1)
  const isValidTemplate = 
    headers.get('REF') === 1 &&
    headers.get('NOMBRE') === 2 &&
    headers.get('MARCA') === 3 &&
    headers.get('PRECIO') === 4 &&
    headers.get('CATEGORIA') === 5;

  if (!isValidTemplate) {
    throw new Error('INVALID_STRUCTURE');
  }

  for (let i = 2; i <= worksheet.rowCount; i++) {
    const row = worksheet.getRow(i);
    
    const colRef = headers.get('REF') || 1;
    const colNombre = headers.get('NOMBRE') || 2;
    const colMarca = headers.get('MARCA') || 3;
    const colPrecio = headers.get('PRECIO') || 4;
    const colCat = headers.get('CATEGORIA') || 5;
    const colDesc = headers.get('DESCRIPCION') || 6;
    const colStock = headers.get('STOCK') || 7;

    const nombreRaw = row.getCell(colNombre).text?.trim() || '';
    const marcaRaw = row.getCell(colMarca).text?.trim() || '';
    const precioCell = row.getCell(colPrecio).value;
    const catRaw = row.getCell(colCat).text?.trim() || '';
    const descRaw = row.getCell(colDesc).text?.trim() || '';
    
    // Ignorar filas totalmente vacías
    if (!nombreRaw && !marcaRaw && precioCell === null && !catRaw) continue;

    // Ignorar la fila de ejemplo permanente
    const refRaw = row.getCell(colRef).text?.trim() || '';
    if (refRaw.toUpperCase() === 'EJEMPLO' || nombreRaw.startsWith('(Ejemplo)')) continue;

    // Anillo 3 - Validación de Referencias Oficiales
    if (!refRaw || !/^REF-\d{3,}$/i.test(refRaw)) {
      throw new Error('INVALID_REFERENCES');
    }

    const ref_num = refRaw;
    const nombre = nombreRaw;
    const marca = marcaRaw;

    // Normalizar precio: soporta punto/coma decimales y separadores de miles
    const precio = normalizePrice(precioCell);
    
    const categoria = catRaw;
    const descripcion = descRaw;
    
    // Disponible: denylist — solo 'no'/'false'/'0' ⇒ false; vacío o cualquier otro ⇒ true (por defecto)
    const inStockText = row.getCell(colStock).text?.trim().toLowerCase() ?? '';
    const in_stock = !['no', 'false', '0'].includes(inStockText);

    const errors: string[] = [];
    if (!nombre) errors.push('Nombre es requerido');
    if (!marca) errors.push('Marca es requerida');
    if (isNaN(precio) || precio <= 0) errors.push('Precio debe ser mayor a 0');
    if (!categoria) errors.push('Categoría es requerida');
    
    const partialProduct: Partial<StagingProduct> = {
      nombre,
      marca,
      precio: isNaN(precio) ? 0 : precio,
      categoria,
      imagenBlob: null,
      allowNoPhoto: false,
    };

    products.push({
      id: crypto.randomUUID(),
      ref_num,
      nombre,
      marca,
      precio: isNaN(precio) ? 0 : precio,
      categoria,
      descripcion,
      in_stock,
      imagenBlob: null,
      allowNoPhoto: false,
      status: evaluateRowStatus(partialProduct),
      errors
    });
  }
  
  return products;
}
