import ExcelJS from 'exceljs';

export async function generateExcelTemplate(): Promise<Blob> {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'Admin Zutech';
  workbook.created = new Date();

  const sheet = workbook.addWorksheet('Plantilla Importación');

  // Hoja Oculta de Identidad del Sistema (Intemporal)
  const metaSheet = workbook.addWorksheet('__sys_manifest__', { state: 'veryHidden' });
  metaSheet.getCell('A1').value = 'APP_CATALOG_OFFICIAL_TEMPLATE';
  metaSheet.protect('sys-lock-salt-2026', { selectLockedCells: false, selectUnlockedCells: false });

  // Definir columnas fijas
  sheet.columns = [
    { header: '🔒 REF #', key: 'ref', width: 15 },
    { header: 'Nombre *', key: 'nombre', width: 30 },
    { header: 'Marca *', key: 'marca', width: 20 },
    { header: 'Precio ($) *', key: 'precio', width: 15 },
    { header: 'Categoría *', key: 'categoria', width: 25 },
    { header: 'Descripción', key: 'descripcion', width: 40 },
    { header: 'Disponible (Sí/No)', key: 'in_stock', width: 20 },
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

  // ─── Fila 2: Fila de ejemplo fija y bloqueada ───────────────────────────────
  const exampleRow = sheet.getRow(2);
  const exampleStyle = {
    fill: { type: 'pattern' as const, pattern: 'solid' as const, fgColor: { argb: 'FFF8FAFC' } },
    font: { italic: true, color: { argb: 'FF9CA3AF' } },
    protection: { locked: true },
  };

  const exampleValues = [
    'EJEMPLO',
    '(Ejemplo) Tarjeta Gráfica ASUS Dual RTX 4060 8GB',
    'ASUS',
    299.99,
    'Tarjetas Gráficas',
    'Doble ventilador, 8GB GDDR6, PCIe 4.0',
    'Sí',
  ];

  exampleValues.forEach((val, idx) => {
    const cell = exampleRow.getCell(idx + 1);
    cell.value = val;
    cell.fill = exampleStyle.fill;
    cell.font = exampleStyle.font;
    cell.protection = exampleStyle.protection;
  });

  // ─── Filas de usuario (Filas 3 a 102): REF-001 … REF-100 ─────────────────────
  for (let i = 3; i <= 102; i++) {
    const row = sheet.getRow(i);
    const refNum = String(i - 2).padStart(3, '0');

    // Columna A (REF #) — bloqueada
    const refCell = row.getCell(1);
    refCell.value = `REF-${refNum}`;
    refCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF1F5F9' } };
    refCell.font = { color: { argb: 'FF888888' } };
    refCell.alignment = { horizontal: 'center' };

    // Col B — Nombre *
    row.getCell(2).dataValidation = {
      type: 'textLength',
      operator: 'between',
      formulae: [3, 150],
      allowBlank: false,
      showInputMessage: true,
      promptTitle: 'Nombre del Producto',
      prompt: 'Ingresa entre 3 y 150 caracteres. Campo obligatorio.',
      showErrorMessage: true,
      errorStyle: 'stop',
      errorTitle: 'Nombre Inválido',
      error: 'El nombre debe tener entre 3 y 150 caracteres y no puede quedar vacío.',
    };

    // Col C — Marca *
    row.getCell(3).dataValidation = {
      type: 'textLength',
      operator: 'between',
      formulae: [2, 50],
      allowBlank: false,
      showInputMessage: true,
      promptTitle: 'Marca del Producto',
      prompt: 'Ingresa la marca del producto (ej: ASUS, Samsung).',
      showErrorMessage: true,
      errorStyle: 'information',
      errorTitle: 'Marca',
      error: 'La marca debe tener entre 2 y 50 caracteres.',
    };

    // Col D — Precio ($) *
    const priceCell = row.getCell(4);
    priceCell.numFmt = '#,##0.00';
    priceCell.dataValidation = {
      type: 'decimal',
      operator: 'greaterThan',
      formulae: [0],
      allowBlank: true,
      showInputMessage: true,
      promptTitle: 'Precio en USD',
      prompt: 'Precio en USD. Puedes escribir con punto o coma (ej: 105.33 o 105,33).',
    };

    // Col E — Categoría *
    row.getCell(5).dataValidation = {
      type: 'list',
      allowBlank: false,
      formulae: ['"Placas Base,Procesadores,Tarjetas Gráficas,Memorias RAM,Almacenamiento,Fuentes de Poder,Chasis,Refrigeración,Monitores,Periféricos,Redes,Otros"'],
      showInputMessage: true,
      promptTitle: 'Categoría',
      prompt: 'Selecciona una categoría de la lista desplegable.',
      showErrorMessage: true,
      errorStyle: 'warning',
      errorTitle: 'Categoría No Estándar',
      error: 'No pertenece a la lista oficial. Si continúas, se le asignará el prefijo GEN- a su SKU.',
    };

    // Col F — Descripción (Opcional)
    row.getCell(6).dataValidation = {
      type: 'textLength',
      operator: 'lessThanOrEqual',
      formulae: [500],
      allowBlank: true,
      showInputMessage: true,
      promptTitle: 'Descripción (Opcional)',
      prompt: 'Detalles técnicos breves (máximo 500 caracteres).',
    };

    // Col G — Disponible (Sí/No) *
    const stockCell = row.getCell(7);
    stockCell.value = 'Sí'; // valor por defecto: la mayoría de productos están disponibles
    stockCell.dataValidation = {
      type: 'list',
      allowBlank: false,
      formulae: ['"Sí,No"'],
      showInputMessage: true,
      promptTitle: 'Disponibilidad',
      prompt: 'Selecciona "Sí" o "No".',
      showErrorMessage: true,
      errorStyle: 'stop',
      errorTitle: 'Opción Inválida',
      error: 'Solo se admite "Sí" o "No".',
    };

    // Re-aplicar desbloqueo al final para evitar que dataValidation resetee la protección
    for (let col = 2; col <= 7; col++) {
      row.getCell(col).protection = { locked: false };
    }
  }

  // Asegurar explícitamente que la columna 1 y la fila 1 estén bloqueadas
  sheet.getColumn(1).protection = { locked: true };
  sheet.getRow(1).eachCell(cell => {
    cell.protection = { locked: true };
  });

  // Proteger la hoja permitiendo únicamente seleccionar e interactuar con celdas desbloqueadas
  await sheet.protect('', {
    selectLockedCells: true,
    selectUnlockedCells: true,
    formatCells: false,
    formatColumns: false,
    formatRows: false,
    insertColumns: false,
    insertRows: true,
    deleteColumns: false,
    deleteRows: true,
    sort: false,
    autoFilter: false,
    pivotTables: false,
  });

  // Congelar cabecera y fila de ejemplo
  sheet.views = [{ state: 'frozen', xSplit: 0, ySplit: 2 }];

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
