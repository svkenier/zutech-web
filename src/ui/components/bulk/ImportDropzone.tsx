import React from 'react';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import CloudUploadIcon from '@mui/icons-material/CloudUpload';

interface ImportDropzoneProps {
  isDragOver: boolean;
  onDragOver: (e: React.DragEvent) => void;
  onDragLeave: () => void;
  onDrop: (e: React.DragEvent) => void;
  onFileInput: (e: React.ChangeEvent<HTMLInputElement>) => void;
  isCompact?: boolean;
}

export default function ImportDropzone({
  isDragOver,
  onDragOver,
  onDragLeave,
  onDrop,
  onFileInput,
  isCompact = false,
}: ImportDropzoneProps) {
  return (
    <Box
      onDragOver={onDragOver}
      onDragLeave={onDragLeave}
      onDrop={onDrop}
      sx={{
        border: '2px dashed',
        borderColor: isDragOver ? 'primary.main' : 'divider',
        bgcolor: isDragOver ? 'action.hover' : 'background.paper',
        borderRadius: 1,
        p: isCompact ? 3 : 5,
        width: '100%',
        minHeight: 180,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        textAlign: 'center',
        cursor: 'pointer',
        mb: isCompact ? 2 : 0,
        transition: 'background-color 0.2s, border-color 0.2s',
      }}
      component="label"
    >
      <input type="file" hidden multiple accept=".xlsx,image/*" onChange={onFileInput} />
      <CloudUploadIcon color={isDragOver ? 'primary' : 'action'} sx={{ fontSize: 48, mb: 1 }} />
      <Typography variant="h6" color={isDragOver ? 'primary' : 'textPrimary'}>
        Arrastra aquí el Excel y/o las fotos, o haz clic para subir
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
        (Puedes subir el .xlsx primero y luego arrojar las fotos)
      </Typography>
    </Box>
  );
}
