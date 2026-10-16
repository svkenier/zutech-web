import TableRow from '@mui/material/TableRow';
import TableCell from '@mui/material/TableCell';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import IconButton from '@mui/material/IconButton';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import Tooltip from '@mui/material/Tooltip';
import TextField from '@mui/material/TextField';
import SaveIcon from '@mui/icons-material/Save';
import CloseIcon from '@mui/icons-material/Close';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';
import VisibilityOffIcon from '@mui/icons-material/VisibilityOff';
import Chip from '@mui/material/Chip';
import Autocomplete from '@mui/material/Autocomplete';
import type { StagingProduct } from '@core/excel/excelParser';

interface StagingRowProps {
  prod: StagingProduct;
  isEditing: boolean;
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

export default function StagingRow({
  prod,
  isEditing,
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
}: StagingRowProps) {
  return (
    <TableRow hover>
      <TableCell>
        <Typography variant="caption" display="block" color="primary">{prod.sku}</Typography>
        <Typography variant="caption" color="text.secondary">Ref: {prod.ref_num}</Typography>
      </TableCell>
      <TableCell>
        {prod.previewUrl || (prod.existingImageUrl && !prod.removeImage) ? (
          <Box sx={{ position: 'relative', width: 40, height: 40 }}>
            <Box
              component="img"
              src={prod.previewUrl || prod.existingImageUrl}
              width={40}
              height={40}
              sx={{ objectFit: 'contain', bgcolor: '#fff', border: '1px solid #ccc' }}
            />
            <IconButton
              size="small"
              aria-label="Eliminar foto"
              sx={{ position: 'absolute', top: -10, right: -10, p: 0.2, bgcolor: 'background.paper' }}
              onClick={() => onRemoveImage(prod)}
            >
              <CloseIcon sx={{ fontSize: 14 }} />
            </IconButton>
          </Box>
        ) : (
          <Tooltip title="Foto Pendiente. Haz clic para subir.">
            <IconButton component="label" size="small" color="warning" aria-label="Subir foto">
              <input
                type="file"
                hidden
                accept="image/*"
                onChange={(e) => {
                  if (e.target.files?.[0]) {
                    onImageUpload(prod.id, e.target.files[0]);
                  }
                }}
              />
              <WarningAmberIcon fontSize="small" />
            </IconButton>
          </Tooltip>
        )}
      </TableCell>
      <TableCell>
        {isEditing ? (
          <TextField
            size="small"
            value={editForm.nombre || ''}
            onChange={(e) => onEditChange({ ...editForm, nombre: e.target.value })}
          />
        ) : (
          prod.nombre
        )}
      </TableCell>
      <TableCell sx={{ whiteSpace: 'nowrap' }}>
        {isEditing ? (
          <Autocomplete
            freeSolo
            options={existingBrands}
            value={editForm.marca || ''}
            onChange={(_, newValue) => onEditChange({ ...editForm, marca: newValue || '' })}
            onInputChange={(_, newInputValue) => onEditChange({ ...editForm, marca: newInputValue || '' })}
            renderInput={(params) => <TextField {...params} size="small" placeholder="Marca" />}
            sx={{ minWidth: 140 }}
          />
        ) : (
          prod.marca
        )}
      </TableCell>
      <TableCell>
        {isEditing ? (
          <TextField
            size="small"
            type="number"
            value={editForm.precio || 0}
            onChange={(e) => onEditChange({ ...editForm, precio: Number(e.target.value) })}
            sx={{ width: 80 }}
          />
        ) : (
          `$${prod.precio}`
        )}
      </TableCell>
      <TableCell sx={{ whiteSpace: 'nowrap' }}>
        {isEditing ? (
          <TextField
            size="small"
            value={editForm.categoria || ''}
            onChange={(e) => onEditChange({ ...editForm, categoria: e.target.value })}
            sx={{ minWidth: 140 }}
          />
        ) : (
          prod.categoria
        )}
      </TableCell>
      <TableCell>
        {isEditing ? (
          <TextField
            size="small"
            select
            SelectProps={{ native: true }}
            value={editForm.in_stock ? 'si' : 'no'}
            onChange={(e) => onEditChange({ ...editForm, in_stock: e.target.value === 'si' })}
          >
            <option value="si">Sí</option>
            <option value="no">No</option>
          </TextField>
        ) : (
          prod.in_stock ? 'Sí' : 'No'
        )}
      </TableCell>
      <TableCell>
        {prod.status === 'Listo' ? (
          <Chip label={prod.allowNoPhoto && !prod.imagenBlob ? 'Listo (sin foto)' : 'Listo'} color="success" size="small" />
        ) : prod.status === 'Sin foto' ? (
          <Chip label="Sin foto" color="warning" size="small" />
        ) : (
          <Tooltip title={prod.errors.length > 0 ? prod.errors.join(', ') : 'Datos incompletos'}>
            <Chip label="Incompleto" color="error" size="small" />
          </Tooltip>
        )}
      </TableCell>
      <TableCell align="right" sx={{ whiteSpace: 'nowrap' }}>
        {isEditing ? (
          <>
            <IconButton size="small" color="primary" onClick={onSaveRow} disabled={isLoading} aria-label="Guardar fila">
              <SaveIcon fontSize="small" />
            </IconButton>
            <IconButton size="small" onClick={onCancelEdit} disabled={isLoading} aria-label="Cancelar edición">
              <CloseIcon fontSize="small" />
            </IconButton>
          </>
        ) : (
          <>
            {prod.status === 'Sin foto' && (
              <Tooltip title="Permitir sin foto">
                <IconButton size="small" onClick={() => onAllowNoPhoto(prod.id)} aria-label="Permitir producto sin foto">
                  <VisibilityOffIcon fontSize="small" />
                </IconButton>
              </Tooltip>
            )}
            <IconButton size="small" color="primary" onClick={() => onStartEdit(prod)} disabled={isLoading} aria-label="Editar fila">
              <EditIcon fontSize="small" />
            </IconButton>
            <IconButton size="small" color="error" onClick={() => onDiscard(prod.id)} disabled={isLoading} aria-label="Descartar fila">
              <DeleteIcon fontSize="small" />
            </IconButton>
          </>
        )}
      </TableCell>
    </TableRow>
  );
}
