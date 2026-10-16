import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableContainer from '@mui/material/TableContainer';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import Paper from '@mui/material/Paper';
import type { StagingProduct } from '@core/excel/excelParser';
import StagingRow from './StagingRow';

interface StagingTableProps {
  stagingData: StagingProduct[];
  editRowId: string | null;
  editForm: Partial<StagingProduct>;
  existingBrands: string[];
  isLoading: boolean;
  onEditChange: (form: Partial<StagingProduct>) => void;
  onSaveRow: () => void;
  onCancelEdit: () => void;
  onStartEdit: (prod: StagingProduct) => void;
  onDiscard: (id: string) => void;
  onRemoveImage: (prod: StagingProduct) => void;
  onImageUpload: (id: string, file: File) => void;
  onAllowNoPhoto: (id: string) => void;
}

export default function StagingTable({
  stagingData,
  editRowId,
  editForm,
  existingBrands,
  isLoading,
  onEditChange,
  onSaveRow,
  onCancelEdit,
  onStartEdit,
  onDiscard,
  onRemoveImage,
  onImageUpload,
  onAllowNoPhoto,
}: StagingTableProps) {
  return (
    <TableContainer component={Paper} variant="outlined" sx={{ borderRadius: 0, maxHeight: 400, overflowX: 'auto' }}>
      <Table size="small" stickyHeader sx={{ tableLayout: 'auto', minWidth: 800 }}>
        <TableHead>
          <TableRow>
            <TableCell sx={{ minWidth: 100 }}>SKU / REF</TableCell>
            <TableCell>Imagen</TableCell>
            <TableCell sx={{ minWidth: 200 }}>Nombre</TableCell>
            <TableCell sx={{ minWidth: 140 }}>Marca</TableCell>
            <TableCell sx={{ minWidth: 100 }}>Precio</TableCell>
            <TableCell sx={{ minWidth: 140 }}>Categoría</TableCell>
            <TableCell sx={{ minWidth: 120 }}>Stock</TableCell>
            <TableCell sx={{ minWidth: 100 }}>Estado</TableCell>
            <TableCell align="right" sx={{ minWidth: 100 }}>Acciones</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {stagingData.map((prod) => (
            <StagingRow
              key={prod.id}
              prod={prod}
              isEditing={editRowId === prod.id}
              editForm={editForm}
              existingBrands={existingBrands}
              isLoading={isLoading}
              onEditChange={onEditChange}
              onSaveRow={onSaveRow}
              onCancelEdit={onCancelEdit}
              onStartEdit={onStartEdit}
              onDiscard={onDiscard}
              onRemoveImage={onRemoveImage}
              onImageUpload={onImageUpload}
              onAllowNoPhoto={onAllowNoPhoto}
            />
          ))}
        </TableBody>
      </Table>
    </TableContainer>
  );
}
