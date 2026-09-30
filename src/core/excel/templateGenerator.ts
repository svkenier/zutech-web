import ExcelJS from 'exceljs';

export async function generateExcelTemplate(): Promise<Blob> {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'Admin Zutech';
  workbook.created = new Date();

  const sheet = workbook.addWorksheet('Plantilla Importación');

  // Definir columnas fijas
  sheet.columns = [
    { header: 'Nombre *', key: 'nombre', width: 30 },
    { header: 'Precio ($) *', key: 'precio', width: 15 },
    { header: 'Categoría *', key: 'categoria', width: 25 },
    { header: 'Descripción', key: 'descripcion', width: 40 },
    { header: 'Disponible (Sí/No)', key: 'in_stock', width: 20 },
    { header: 'Imagen (Foto pegada o URL)', key: 'imagen', width: 35 },
  ];

  // Estilos de la cabecera
  const headerRow = sheet.getRow(1);
  headerRow.font = { bold: true, color: { argb: 'FFFFFFFF' } };
  headerRow.fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FF1976D2' },
  };
  headerRow.alignment = { vertical: 'middle', horizontal: 'center' };
  headerRow.height = 30;

  // Fila de ejemplo
  const exampleRow = sheet.addRow({
    nombre: 'Ejemplo Producto',
    precio: 99.99,
    categoria: 'Electrónica',
    descripcion: 'Un producto de ejemplo para la plantilla.',
    in_stock: 'Sí',
    imagen: 'https://ejemplo.com/foto.webp'
  });
  
  exampleRow.font = { italic: true, color: { argb: 'FF888888' } };

  // Congelar la fila de cabecera
  sheet.views = [{ state: 'frozen', xSplit: 0, ySplit: 1 }];

  // Generar Blob para descarga
  const buffer = await workbook.xlsx.writeBuffer();
  return new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
}

export function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  setTimeout(() => {
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, 100);
}
