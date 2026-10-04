import React from 'react';
import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';
import { useQuery } from '@tanstack/react-query';
import { get } from '@core/api/client';
import type { Settings } from '@core/types/settings';
import { useAuth } from '@ui/context/AuthContext';

interface DomainAlertProps {
  preview?: boolean;
}

function getDaysRemaining(targetDate?: string) {
  if (!targetDate) return 0;
  const diff = new Date(targetDate).getTime() - new Date().getTime();
  return Math.ceil(diff / (1000 * 60 * 60 * 24));
}

export default function DomainAlert({ preview = false }: DomainAlertProps) {
  const { user } = useAuth();
  
  const { data: settings, isLoading } = useQuery<Settings>({
    queryKey: ['settings'],
    queryFn: async () => {
      const res = await get<Settings | {}>('/settings');
      if (Object.keys(res).length === 0) return {};
      return res as Settings;
    },
    enabled: !preview && (user?.role === 'owner' || user?.role === 'superadmin'),
    staleTime: 1000 * 60 * 5,
  });

  const diffDays = getDaysRemaining(settings?.domainExpirationDate);

  const isExpiringSoon = diffDays <= 15 && diffDays >= 0;
  const isAlertEnabled = settings?.domainAlertEnabled ?? true; // Si no está definido, asumir true para alertar
  const shouldShowRealAlert = isExpiringSoon && isAlertEnabled;

  if (!preview && (isLoading || !shouldShowRealAlert)) {
    return null;
  }

  return (
    <Alert 
      severity="warning" 
      icon={<InfoOutlinedIcon fontSize="inherit" />}
      sx={{ 
        bgcolor: '#FEF3C7', 
        color: '#78350F', 
        border: '1px solid #F59E0B',
        borderRadius: 2,
        alignItems: 'center',
        '& .MuiAlert-icon': {
          color: '#B45309'
        },
        '& strong': {
          fontWeight: 700
        }
      }}
    >
      {preview && <strong>[MODO PREVISUALIZACIÓN] </strong>}
      {!preview && <strong>Aviso importante: </strong>}
      El servicio de dominio web anual se encuentra próximo a su fecha de corte{preview ? '' : ` (quedan ${diffDays} días)`}. Para garantizar la continuidad de la tienda online y evitar interrupciones en las ventas, por favor gestione la renovación anual con su proveedor de dominio o administrador técnico.
    </Alert>
  );
}
