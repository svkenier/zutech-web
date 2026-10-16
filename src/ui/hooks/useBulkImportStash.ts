import { useState, useEffect, useRef, useCallback } from 'react';
import type { StagingProduct } from '@core/excel/excelParser';
import { saveStash, loadStash, clearStash } from '@core/storage/importStash';

interface ConfirmDialogState {
  open: boolean;
  title: string;
  content: string;
  onConfirm: () => void;
}

export function useBulkImportStash(open: boolean) {
  const [stagingData, setStagingData] = useState<StagingProduct[] | null>(null);
  const [stashConfirmDialog, setStashConfirmDialog] = useState<ConfirmDialogState | null>(null);

  // Check and load stash on open
  useEffect(() => {
    if (open) {
      loadStash().then((data) => {
        if (data && data.length > 0) {
          setStashConfirmDialog({
            open: true,
            title: 'Borrador Encontrado',
            content: 'Recuperamos un borrador de importación de tu última sesión. ¿Deseas continuar con estos productos o limpiar la mesa?',
            onConfirm: () => {
              setStagingData(data);
              setStashConfirmDialog(null);
            },
          });
        }
      }).catch((err) => {
        console.warn('Error loading stash:', err);
      });
    }
  }, [open]);

  // Autosave to stash when stagingData changes
  useEffect(() => {
    if (stagingData) {
      void saveStash(stagingData);
    }
  }, [stagingData]);

  // Clean up object URLs on unmount to prevent memory leaks
  const stagingDataRef = useRef(stagingData);
  useEffect(() => {
    stagingDataRef.current = stagingData;
  }, [stagingData]);

  useEffect(() => {
    return () => {
      if (stagingDataRef.current) {
        stagingDataRef.current.forEach((p) => {
          if (p.previewUrl) {
            URL.revokeObjectURL(p.previewUrl);
          }
        });
      }
    };
  }, []);

  const handleClearStash = useCallback(async () => {
    if (stagingData) {
      stagingData.forEach((p) => {
        if (p.previewUrl) {
          URL.revokeObjectURL(p.previewUrl);
        }
      });
    }
    setStagingData(null);
    await clearStash();
  }, [stagingData]);

  return {
    stagingData,
    setStagingData,
    stashConfirmDialog,
    setStashConfirmDialog,
    handleClearStash,
  };
}
