import React, { useState, useCallback } from 'react';
import { parseExcel, type StagingProduct, evaluateRowStatus } from '@core/excel/excelParser';
import { assignSkusToProducts } from '@core/utils/skuGenerator';
import { optimizeImage } from '@core/media/imageOptimizer';

export interface ProductSummary {
  sku?: string;
  main_image?: string;
  [key: string]: unknown;
}

interface UseFileDropParserOptions {
  stagingData: StagingProduct[] | null;
  setStagingData: React.Dispatch<React.SetStateAction<StagingProduct[] | null>>;
  existingProducts: ProductSummary[];
}

// Utilidad pura: Extraer archivos de forma recursiva desde un FileSystemEntry
function collectFilesFromEntry(entry: FileSystemEntry): Promise<File[]> {
  return new Promise((resolve) => {
    if (entry.isFile) {
      (entry as FileSystemFileEntry).file(
        (file) => resolve([file]),
        () => resolve([])
      );
    } else if (entry.isDirectory) {
      const reader = (entry as FileSystemDirectoryEntry).createReader();
      const allFiles: File[] = [];

      const readBatch = () => {
        reader.readEntries(
          async (entries) => {
            if (entries.length === 0) {
              resolve(allFiles);
              return;
            }
            const batchResults = await Promise.all(entries.map(collectFilesFromEntry));
            allFiles.push(...batchResults.flat());
            readBatch();
          },
          () => resolve(allFiles)
        );
      };

      readBatch();
    } else {
      resolve([]);
    }
  });
}

export function useFileDropParser({
  stagingData,
  setStagingData,
  existingProducts,
}: UseFileDropParserOptions) {
  const [isDragOver, setIsDragOver] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const processDroppedFiles = useCallback(
    async (files: File[]) => {
      setError(null);
      setIsLoading(true);

      try {
        const excelFile = files.find((f) => f.name.endsWith('.xlsx'));
        const imageFiles = files.filter((f) => f.type.startsWith('image/'));

        const stagingMap = new Map<string, StagingProduct>();
        if (stagingData) {
          stagingData.forEach((p) => stagingMap.set(p.ref_num, p));
        }

        if (excelFile) {
          const buffer = await excelFile.arrayBuffer();
          let products = await parseExcel(buffer);
          products = await assignSkusToProducts(products);

          products.forEach((p) => {
            const matched = existingProducts.find((ep) => ep.sku === p.sku);
            if (matched && matched.main_image) {
              p.existingImageUrl = matched.main_image;
            }
            p.status = evaluateRowStatus(p);

            if (stagingMap.has(p.ref_num)) {
              const existing = stagingMap.get(p.ref_num)!;
              stagingMap.set(p.ref_num, {
                ...existing,
                ...p,
                imagenBlob: existing.imagenBlob,
                previewUrl: existing.previewUrl,
                existingImageUrl: existing.existingImageUrl,
                removeImage: existing.removeImage,
              });
            } else {
              stagingMap.set(p.ref_num, p);
            }
          });
        }

        const newStaging = Array.from(stagingMap.values());

        if (imageFiles.length > 0 && newStaging.length > 0) {
          // REF_MATCH: REF-001, REF001, ref-001, ref_001 (case-insensitive, dashes/underscores optional)
          const REF_PATTERN = /^ref[-_]?(\d+)$/i;

          for (const imgFile of imageFiles) {
            const nameWithoutExt = imgFile.name.split('.').slice(0, -1).join('.');

            // Construir clave normalizada del archivo: eliminar separadores y pasar a mayúsculas
            const normalized = nameWithoutExt.replace(/[-_]/g, '').toUpperCase(); // e.g. "REF001"

            const refMatch = normalized.match(REF_PATTERN);

            // Rechazar números planos sueltos (1.jpg, 001.jpg) — no deben matchear
            const isPlainNumber = /^\d+$/.test(nameWithoutExt.trim());
            if (isPlainNumber || !refMatch) continue;

            // Normalizar ref_num del staging igual: eliminar separadores → "REF001"
            const targetIndex = newStaging.findIndex((p) => {
              const pRef = p.ref_num.replace(/[-_]/g, '').toUpperCase();
              const pSku = (p.sku ?? '').replace(/[-_]/g, '').toUpperCase();
              return pRef === normalized || pSku === normalized;
            });

            if (targetIndex !== -1) {
              const optimized = await optimizeImage(imgFile, 0.8, 700);
              const p = newStaging[targetIndex];
              p.imagenBlob = optimized.blob;
              p.previewUrl = optimized.previewUrl;
              p.status = evaluateRowStatus(p);
            }
          }
        }

        setStagingData(newStaging.length > 0 ? newStaging : null);
      } catch (err: unknown) {
        const errorObj = err as Error | undefined;
        if (errorObj?.message === 'INVALID_ORIGIN') {
          setError(
            'El archivo subido no es una plantilla válida del sistema o su estructura ha sido alterada. Por favor descarga y usa la plantilla oficial.'
          );
        } else if (errorObj?.message === 'INVALID_STRUCTURE') {
          setError(
            'La estructura de columnas del archivo ha sido modificada o es inválida. Por favor descarga y usa la plantilla oficial.'
          );
        } else if (errorObj?.message === 'INVALID_REFERENCES') {
          setError('Se detectaron filas sin código de referencia oficial (REF-###).');
        } else if (errorObj?.message === 'INVALID_TEMPLATE') {
          setError(
            'El archivo subido no coincide con la estructura de la plantilla oficial. Por favor descarga y utiliza la plantilla del sistema.'
          );
        } else {
          setError('Error al procesar los archivos. Revisa el formato.');
        }
      } finally {
        setIsLoading(false);
        setIsDragOver(false);
      }
    },
    [existingProducts, stagingData, setStagingData]
  );

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  }, []);

  const handleDragLeave = useCallback(() => {
    setIsDragOver(false);
  }, []);

  const handleDrop = useCallback(
    async (e: React.DragEvent) => {
      e.preventDefault();

      const items = Array.from(e.dataTransfer.items);
      const hasDirectories = items.some((item) => {
        const entry = item.webkitGetAsEntry?.();
        return entry?.isDirectory;
      });

      if (hasDirectories) {
        // Extracción recursiva de archivos desde carpetas y sub-carpetas
        const allEntries = items
          .map((item) => item.webkitGetAsEntry?.())
          .filter((entry): entry is FileSystemEntry => entry !== null && entry !== undefined);

        const allFiles = (await Promise.all(allEntries.map(collectFilesFromEntry))).flat();
        void processDroppedFiles(allFiles);
      } else {
        void processDroppedFiles(Array.from(e.dataTransfer.files));
      }
    },
    [processDroppedFiles]
  );

  const handleFileInput = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      if (e.target.files) {
        void processDroppedFiles(Array.from(e.target.files));
      }
    },
    [processDroppedFiles]
  );

  return {
    isDragOver,
    isLoading,
    error,
    setError,
    handleDragOver,
    handleDragLeave,
    handleDrop,
    handleFileInput,
    processDroppedFiles,
  };
}
