import { useState, useMemo, useEffect } from 'react';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Card from '@mui/material/Card';
import Switch from '@mui/material/Switch';
import FormControlLabel from '@mui/material/FormControlLabel';
import Button from '@mui/material/Button';
import RadioGroup from '@mui/material/RadioGroup';
import Radio from '@mui/material/Radio';
import TextField from '@mui/material/TextField';
import MenuItem from '@mui/material/MenuItem';
import CircularProgress from '@mui/material/CircularProgress';
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';

import DialogActions from '@mui/material/DialogActions';
import Chip from '@mui/material/Chip';
import Divider from '@mui/material/Divider';
import WarningAmberRoundedIcon from '@mui/icons-material/WarningAmberRounded';
import DomainAlert from '@ui/components/DomainAlert';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { get, put } from '@core/api/client';
import { DEFAULT_SETTINGS } from '@core/types/settings';
import type { Settings } from '@core/types/settings';

function getDaysRemaining(targetDate: string) {
  if (!targetDate) return 0;
  const diff = new Date(targetDate).getTime() - new Date().getTime();
  return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
}

function formatDate(dateStr: string) {
  if (!dateStr) return 'No configurado';
  const date = new Date(dateStr);
  if (isNaN(date.getTime())) return 'Fecha inválida';
  date.setMinutes(date.getMinutes() + date.getTimezoneOffset());
  return new Intl.DateTimeFormat('es-VE', { 
    day: '2-digit', month: 'long', year: 'numeric' 
  }).format(date);
}

export default function DomainManagement() {
  const qc = useQueryClient();
  const [previewAlert, setPreviewAlert] = useState(false);
  
  const [renewalMode, setRenewalMode] = useState<'preset' | 'manual'>('preset');
  const [yearsToAdd, setYearsToAdd] = useState(1);
  const [manualDate, setManualDate] = useState('');
  
  const [masterAlertEnabled, setMasterAlertEnabled] = useState(true);
  const [confirmModalOpen, setConfirmModalOpen] = useState(false);

  const { data: settings, isLoading } = useQuery<Settings>({
    queryKey: ['settings'],
    queryFn: async () => {
      const res = await get<Settings | {}>('/settings');
      if (Object.keys(res).length === 0) return DEFAULT_SETTINGS;
      return { ...DEFAULT_SETTINGS, ...res } as Settings;
    },
    initialData: DEFAULT_SETTINGS,
  });

  const mutation = useMutation({
    mutationFn: (newSettings: Settings) => put('/settings', newSettings),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['settings'] });
      setManualDate('');
      setYearsToAdd(1);
      setRenewalMode('preset');
    },
  });

  const toggleMutation = useMutation({
    mutationFn: (newSettings: Settings) => put('/settings', newSettings),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['settings'] });
    },
  });

  const currentExpiry = settings?.domainExpirationDate || new Date().toISOString().split('T')[0];
  const daysRemaining = getDaysRemaining(currentExpiry);

  const calculatedNewDate = useMemo(() => {
    if (renewalMode === 'preset') {
      const date = new Date(currentExpiry);
      date.setFullYear(date.getFullYear() + yearsToAdd);
      return date.toISOString().split('T')[0];
    }
    return manualDate;
  }, [currentExpiry, renewalMode, yearsToAdd, manualDate]);

  const isManualInvalid = renewalMode === 'manual' && manualDate !== '' && new Date(manualDate).getTime() <= new Date().getTime();

  const handleSave = () => {
    const newDate = renewalMode === 'preset' ? calculatedNewDate : manualDate;
    mutation.mutate({
      ...settings,
      domainExpirationDate: newDate,
      domainAlertEnabled: masterAlertEnabled,
    });
  };

  const handleMasterSwitchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.checked) {
      setConfirmModalOpen(true);
    } else {
      setMasterAlertEnabled(true);
      toggleMutation.mutate({ ...settings, domainAlertEnabled: true });
    }
  };

  const confirmDisableMonitoring = () => {
    setMasterAlertEnabled(false);
    setConfirmModalOpen(false);
    toggleMutation.mutate({ ...settings, domainAlertEnabled: false });
  };

  useEffect(() => {
    if (settings && settings.domainAlertEnabled !== undefined) {
      setMasterAlertEnabled(settings.domainAlertEnabled);
    }
  }, [settings]);

  const isCritical = daysRemaining <= 15;

  if (isLoading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '50vh' }}>
        <CircularProgress color="primary" />
      </Box>
    );
  }

  return (
    <Box sx={{ p: { xs: 2, md: 4 }, minHeight: '100%', bgcolor: 'transparent', maxWidth: 800 }}>
      {/* NIVEL 1: HERO CARD OPERATIVA */}
      <Box sx={{ mb: 4 }}>
        <Typography variant="h5" fontWeight={700} sx={{ letterSpacing: '-0.02em', color: 'text.primary', mb: 1 }}>
          Gestión de Dominio
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
          Panel exclusivo para el Owner. Administre la renovación anual del dominio y visualice el tiempo restante.
        </Typography>

        <Card variant="outlined" sx={{ borderRadius: 2 }}>
          <Box sx={{ p: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid', borderColor: 'divider' }}>
            <Typography variant="overline" sx={{ color: 'text.secondary', fontWeight: 700, letterSpacing: '0.1em' }}>
              ESTADO DEL SERVICIO
            </Typography>
            <FormControlLabel
              control={<Switch checked={masterAlertEnabled} onChange={handleMasterSwitchChange} color="primary" />}
              label={<Typography variant="body2" fontWeight={600} color="text.primary">Monitoreo Activo</Typography>}
              sx={{ m: 0 }}
            />
          </Box>
          <Box sx={{ p: 3 }}>
            <Typography variant="h4" fontWeight={600} sx={{ color: 'text.primary', mb: 1 }}>
              {formatDate(currentExpiry)}
            </Typography>
            {masterAlertEnabled ? (
              <Chip 
                label={`Quedan ${daysRemaining} días`} 
                color={isCritical ? 'error' : 'success'} 
                size="small" 
                sx={{ fontWeight: 600 }} 
              />
            ) : (
              <Typography variant="body2" sx={{ color: 'text.secondary', fontWeight: 500 }}>
                ○ Monitoreo pausado (Sin alertas globales)
              </Typography>
            )}
          </Box>
        </Card>
      </Box>

      {/* NIVEL 2: BLOQUE CENTRAL DE RENOVACIÓN */}
      <Box sx={{ mb: 4 }}>
        <Typography variant="subtitle1" fontWeight={600} sx={{ mb: 2, color: 'text.primary' }}>
          Extender Vigencia del Dominio
        </Typography>
        
        <RadioGroup
          value={renewalMode}
          onChange={(e) => setRenewalMode(e.target.value as 'preset' | 'manual')}
          sx={{ display: 'flex', flexDirection: 'column' }}
        >
          {/* Opción A: Preset */}
          <Box 
            sx={{ 
              p: 2.5, 
              mb: 2.5,
              border: '1px solid', 
              borderColor: renewalMode === 'preset' ? 'primary.main' : 'divider', 
              borderRadius: 2, 
              transition: 'all 0.2s ease-in-out',
              bgcolor: renewalMode === 'preset' ? 'action.hover' : 'transparent'
            }}
          >
            <FormControlLabel 
              value="preset" 
              control={<Radio color="primary" />} 
              label={<Typography fontWeight={renewalMode === 'preset' ? 600 : 400} color={renewalMode === 'preset' ? 'text.primary' : 'text.secondary'}>Renovación automática por años (+1, +2, +3, +5)</Typography>} 
              sx={{ m: 0, width: '100%' }}
            />
            
            {renewalMode === 'preset' && (
              <Box sx={{ mt: 2, ml: { xs: 0, sm: 4 }, display: 'flex', flexDirection: 'column', gap: 2 }}>
                <TextField
                  select
                  label="Periodo a Renovar"
                  value={yearsToAdd}
                  onChange={(e) => setYearsToAdd(Number(e.target.value))}
                  fullWidth
                  variant="outlined"
                >
                  <MenuItem value={1}>+1 Año</MenuItem>
                  <MenuItem value={2}>+2 Años</MenuItem>
                  <MenuItem value={3}>+3 Años</MenuItem>
                  <MenuItem value={5}>+5 Años</MenuItem>
                </TextField>
                <Typography variant="body2" color="text.secondary">
                  Fecha de corte actual: <strong>{formatDate(currentExpiry)}</strong> → Nueva fecha calculada: <strong style={{ color: 'var(--mui-palette-primary-main)' }}>{formatDate(calculatedNewDate)}</strong>
                </Typography>
              </Box>
            )}
          </Box>

          {/* Opción B: Manual */}
          <Box 
            sx={{ 
              p: 2.5, 
              border: '1px solid', 
              borderColor: renewalMode === 'manual' ? 'primary.main' : 'divider', 
              borderRadius: 2, 
              transition: 'all 0.2s ease-in-out',
              bgcolor: renewalMode === 'manual' ? 'action.hover' : 'transparent'
            }}
          >
            <FormControlLabel 
              value="manual" 
              control={<Radio color="primary" />} 
              label={<Typography fontWeight={renewalMode === 'manual' ? 600 : 400} color={renewalMode === 'manual' ? 'text.primary' : 'text.secondary'}>Ingresar fecha exacta del registrador (Manual)</Typography>} 
              sx={{ m: 0, width: '100%' }}
            />
            
            {renewalMode === 'manual' && (
              <Box sx={{ mt: 2, ml: { xs: 0, sm: 4 } }}>
                <TextField
                  type="date"
                  label="Fecha de Expiración Exacta"
                  InputLabelProps={{ shrink: true }}
                  value={manualDate}
                  onChange={(e) => setManualDate(e.target.value)}
                  fullWidth
                  variant="outlined"
                  error={isManualInvalid}
                  helperText={isManualInvalid ? "La fecha de renovación debe ser posterior al día de hoy." : "Seleccione una fecha futura."}
                />
              </Box>
            )}
          </Box>
        </RadioGroup>

        <Box sx={{ mt: 3, display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: 2 }}>
          {mutation.isPending && <CircularProgress size={24} color="primary" />}
          <Button 
            variant="contained" 
            color="primary"
            size="large"
            onClick={handleSave}
            disabled={mutation.isPending || (renewalMode === 'manual' && (!manualDate || isManualInvalid))}
            sx={{ fontWeight: 700 }}
          >
            Registrar Renovación
          </Button>
        </Box>
      </Box>

      {/* NIVEL 3: ZONA DE DIAGNÓSTICO / TESTING */}
      <Divider sx={{ my: 4 }} />

      <Box sx={{ p: 2.5, borderRadius: 2, bgcolor: 'rgba(255, 255, 255, 0.02)', border: '1px solid', borderColor: 'divider' }}>
        <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 0.5, fontWeight: 600 }}>
          Herramientas de Previsualización
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          Permite simular el despliegue del banner de advertencia para verificar contrastes y legibilidad antes de que ocurra una alerta real.
        </Typography>
        <FormControlLabel
          control={<Switch checked={previewAlert} onChange={(e) => setPreviewAlert(e.target.checked)} color="default" size="small" />}
          label={<Typography variant="body2" color="text.secondary">Mostrar banner de prueba</Typography>}
          sx={{ ml: 0, mb: previewAlert ? 2 : 0 }}
        />
        
        {previewAlert && (
          <DomainAlert preview={true} />
        )}
      </Box>

      {/* MODAL DE CONFIRMACIÓN: SUSPENDER MONITOREO */}
      <Dialog 
        open={confirmModalOpen} 
        onClose={() => setConfirmModalOpen(false)}
        PaperProps={{
          sx: {
            borderRadius: 3,
            bgcolor: 'background.paper',
            backgroundImage: 'none',
            border: '1px solid',
            borderColor: 'divider',
            boxShadow: 24,
            maxWidth: 480,
            width: '100%',
            p: 1,
          },
        }}
      >
        <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1.5, pb: 1 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: 40, height: 40, borderRadius: 2, bgcolor: 'rgba(245, 158, 11, 0.15)', color: 'warning.light' }}>
            <WarningAmberRoundedIcon />
          </Box>
          <Box>
            <Typography variant="h6" fontWeight={700} lineHeight={1.2}>
              ¿Suspender monitoreo?
            </Typography>
            <Typography variant="caption" color="text.secondary">
              Confirmación de acción administrativa
            </Typography>
          </Box>
        </DialogTitle>
        <DialogContent sx={{ py: 2 }}>
          <Typography variant="body2" color="text.secondary" mb={2}>
            Al pausar el monitoreo, el sistema no calculará los días restantes ni mostrará los avisos preventivos en el panel principal cuando el dominio se acerque a su corte anual.
          </Typography>
          
          <Box sx={{ p: 1.75, borderRadius: 2, border: '1px dashed', borderColor: 'divider', bgcolor: 'action.hover' }}>
            <Typography variant="caption" color="text.secondary" display="block">
              💡 <strong>Nota técnica:</strong> Se recomienda mantener esta pausa solo si la plataforma aún no tiene un dominio oficial asignado o se encuentra en pruebas.
            </Typography>
          </Box>
        </DialogContent>
        <DialogActions sx={{ px: 2, pb: 1.5, gap: 1 }}>
          <Button onClick={() => setConfirmModalOpen(false)}
            variant="outlined"
            color="inherit"
            disabled={toggleMutation.isPending}
            sx={{
              textTransform: 'none',
              fontWeight: 600,
              borderRadius: 2,
            }}
          >
            Cancelar
          </Button>
          <Button onClick={confirmDisableMonitoring}
            variant="contained"
            color="warning" 
            disabled={toggleMutation.isPending}
            startIcon={toggleMutation.isPending ? <CircularProgress color="inherit" size={16}/> : null}
            sx={{
              textTransform: 'none',
              fontWeight: 600,
              borderRadius: 2,
              boxShadow: 'none',
              '&:hover': {
                boxShadow: 'none',
              },
            }}
          >
            Suspender Monitoreo
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
