export const SKU_CATEGORY_MAP: Record<string, string> = {
  'placas base': 'MB',
  'tarjetas madre': 'MB',
  'motherboard': 'MB',
  'procesadores': 'CPU',
  'cpus': 'CPU',
  'tarjetas graficas': 'GPU',
  'tarjetas de video': 'GPU',
  'gpus': 'GPU',
  'memorias ram': 'RAM',
  'ram': 'RAM',
  'ssd': 'SSD',
  'nvme': 'SSD',
  'm.2': 'SSD',
  'discos duros': 'HDD',
  'hdd': 'HDD',
  'almacenamiento': 'STR',
  'fuentes de poder': 'PSU',
  'alimentacion': 'PSU',
  'psu': 'PSU',
  'chasis': 'CASE',
  'gabinetes': 'CASE',
  'cases': 'CASE',
  'torres': 'CASE',
  'refrigeracion': 'COOL',
  'coolers': 'COOL',
  'disipadores': 'COOL',
  'monitores': 'MON',
  'pantallas': 'MON',
  'perifericos': 'PER',
  'teclados': 'PER',
  'mouse': 'PER',
  'auriculares': 'PER',
  'redes': 'NET',
  'conectividad': 'NET',
  'wi-fi': 'NET',
  'wifi': 'NET',
  'laptops': 'LAP',
  'portatiles': 'LAP',
  'pcs': 'PC',
  'computadoras': 'PC',
  'pc': 'PC'
};

export function getSkuPrefix(categoria: string): string {
  const normalized = categoria
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();

  // Buscar coincidencia exacta o parcial
  for (const [key, prefix] of Object.entries(SKU_CATEGORY_MAP)) {
    if (normalized.includes(key)) {
      return prefix;
    }
  }

  return 'GEN'; // Fallback
}

async function generateShortHash(text: string): Promise<string> {
  const msgUint8 = new TextEncoder().encode(text);
  const hashBuffer = await crypto.subtle.digest('SHA-256', msgUint8);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  return hashHex.substring(0, 6).toUpperCase();
}

function extractSemanticTokens(nombre: string): { marca: string, modelo: string } {
  // Limpiar caracteres extraños, dejar solo alfanuméricos y espacios
  const cleanName = nombre.toUpperCase().replace(/[^A-Z0-9\s]/g, '').trim();
  const words = cleanName.split(/\s+/).filter(w => w.length > 0);
  
  // Fallbacks seguros si no hay palabras suficientes o son muy cortas
  const marca = words[0] && words[0].length >= 2 ? words[0].substring(0, 4) : 'GEN';
  const modelo = words[1] && words[1].length >= 2 ? words[1].substring(0, 4) : 'M01';
  
  return { marca, modelo };
}

/**
 * Genera SKUs semánticos, autónomos y criptográficamente deterministas.
 * Formato: PREFIJO-MARCA-MODELO-HASH6
 */
export async function generateSemanticSku(categoria: string, nombre: string, existingSkus: Set<string>): Promise<string> {
  const prefix = getSkuPrefix(categoria);
  const { marca, modelo } = extractSemanticTokens(nombre);
  
  const titleHash = await generateShortHash(nombre.toLowerCase().trim());
  let newSku = `${prefix}-${marca}-${modelo}-${titleHash}`;
  
  let collisionCount = 0;
  while (existingSkus.has(newSku)) {
    collisionCount++;
    newSku = `${prefix}-${marca}-${modelo}-${titleHash}${collisionCount}`;
  }
  
  existingSkus.add(newSku);
  return newSku;
}

/**
 * Normaliza un conjunto de productos generando SKUs únicos basados en categoría y nombre.
 * Utiliza un Set local para prevenir colisiones en el lote actual.
 */
export async function assignSkusToProducts<T extends { categoria: string, nombre: string, sku?: string }>(
  products: T[]
): Promise<T[]> {
  const localSkus = new Set<string>();
  
  // Registrar SKUs que ya vienen asignados (si los hay)
  products.forEach(p => {
    if (p.sku) localSkus.add(p.sku);
  });
  
  const newProducts = [];
  for (const product of products) {
    if (product.sku) {
      newProducts.push(product);
      continue;
    }
    
    const newSku = await generateSemanticSku(product.categoria, product.nombre, localSkus);
    newProducts.push({ ...product, sku: newSku });
  }
  return newProducts;
}
