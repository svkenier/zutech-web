import ExcelJS from 'exceljs';
import type { BaseRecord } from '@core/types/record';
import { downloadBlob } from './templateGenerator';

export async function exportCatalogToExcel(products: BaseRecord[]) {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'Admin Zutech';
  workbook.created = new Date();

  const sheet = workbook.addWorksheet('Catálogo Exportado');

  sheet.columns = [
    { header: 'ID', key: 'id', width: 25 },
    { header: 'Nombre', key: 'nombre', width: 30 },
    { header: 'Precio ($)', key: 'precio', width: 15 },
    { header: 'Categoría', key: 'categoria', width: 25 },
    { header: 'Marca', key: 'marca', width: 20 },
    { header: 'Disponible', key: 'in_stock', width: 15 },
    { header: 'Destacado', key: 'destacado', width: 15 },
    { header: 'Descripción', key: 'descripcion', width: 40 },
    { header: 'Imagen URL', key: 'imagen', width: 40 },
  ];

  // Estilos de cabecera
  const headerRow = sheet.getRow(1);
  headerRow.font = { bold: true, color: { argb: 'FFFFFFFF' } };
  headerRow.fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FF1976D2' },
  };
  headerRow.alignment = { vertical: 'middle', horizontal: 'center' };
  headerRow.height = 30;

  products.forEach(p => {
    sheet.addRow({
      id: p.id,
      nombre: p.title,
      precio: Number(p.attributes?.price || 0),
      categoria: p.attributes?.category || '',
      marca: p.attributes?.brand || '',
      in_stock: p.attributes?.in_stock ? 'Sí' : 'No',
      destacado: p.attributes?.featured || p.attributes?.destacado ? 'Sí' : 'No',
      descripcion: p.description || '',
      imagen: p.main_image || ''
    });
  });

  sheet.views = [{ state: 'frozen', xSplit: 0, ySplit: 1 }];

  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  downloadBlob(blob, `catalogo_zutech_${new Date().toISOString().split('T')[0]}.xlsx`);
}
