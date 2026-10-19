import { useState, useEffect, useRef } from 'react';
import Dialog from '@mui/material/Dialog';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import IconButton from '@mui/material/IconButton';
import Button from '@mui/material/Button';
import CircularProgress from '@mui/material/CircularProgress';
import Alert from '@mui/material/Alert';
import CloseIcon from '@mui/icons-material/Close';
import FlashOnIcon from '@mui/icons-material/FlashOn';
import FlashOffIcon from '@mui/icons-material/FlashOff';
import PhotoCameraIcon from '@mui/icons-material/PhotoCamera';
import CollectionsIcon from '@mui/icons-material/Collections';

interface CameraScannerModalProps {
  open: boolean;
  onClose: () => void;
  onCapture: (file: File) => void;
  onSelectGallery?: () => void;
  title?: string;
  subtitle?: string;
}

export default function CameraScannerModal({
  open,
  onClose,
  onCapture,
  onSelectGallery,
  title = '✨ Escanear Producto',
  subtitle = 'Apunta al producto o etiqueta',
}: CameraScannerModalProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [torchAvailable, setTorchAvailable] = useState(false);
  const [torchOn, setTorchOn] = useState(false);
  const [isCapturing, setIsCapturing] = useState(false);

  // Detener todos los tracks de la cámara
  const stopTracks = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => {
        try {
          track.stop();
        } catch {
          // ignore
        }
      });
      streamRef.current = null;
    }
    setTorchOn(false);
    setTorchAvailable(false);
  };

  useEffect(() => {
    if (!open) {
      stopTracks();
      return;
    }

    let isMounted = true;
    setLoading(true);
    setErrorMsg(null);

    const initCamera = async () => {
      try {
        if (!navigator.mediaDevices?.getUserMedia) {
          throw new Error('Tu navegador no soporta el acceso directo a la cámara WebRTC.');
        }

        const stream = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: { ideal: 'environment' },
            width: { ideal: 1920, min: 640 },
            height: { ideal: 1080, min: 480 },
          },
          audio: false,
        });

        if (!isMounted) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }

        streamRef.current = stream;

        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play();
        }

        // Detección de linterna / Flash si el hardware lo soporta
        const track = stream.getVideoTracks()[0];
        if (track) {
          const capabilities = track.getCapabilities ? (track.getCapabilities() as { torch?: boolean }) : {};
          if (capabilities.torch) {
            setTorchAvailable(true);
          }
        }

        setLoading(false);
      } catch (err: unknown) {
        if (!isMounted) return;
        setLoading(false);
        const name = (err as Error)?.name || '';
        if (name === 'NotAllowedError' || name === 'PermissionDeniedError') {
          setErrorMsg('Permiso de cámara denegado. Permite el acceso a la cámara en tu navegador o sube una foto desde la galería.');
        } else if (name === 'NotFoundError' || name === 'DevicesNotFoundError') {
          setErrorMsg('No se detectó una cámara trasera disponible en este dispositivo.');
        } else {
          setErrorMsg('No se pudo inicializar la cámara. Puedes subir la foto desde la galería.');
        }
      }
    };

    void initCamera();

    return () => {
      isMounted = false;
      stopTracks();
    };
  }, [open]);

  // Alternar linterna/flash
  const handleToggleTorch = async () => {
    if (!streamRef.current || !torchAvailable) return;
    const track = streamRef.current.getVideoTracks()[0];
    if (!track) return;

    try {
      const nextState = !torchOn;
      await (track as MediaStreamTrack & { applyConstraints: (c: unknown) => Promise<void> }).applyConstraints({
        advanced: [{ torch: nextState }],
      });
      setTorchOn(nextState);
    } catch {
      // ignore torch error
    }
  };

  // Capturar fotograma en vivo
  const handleCaptureFrame = () => {
    const video = videoRef.current;
    if (!video || video.videoWidth === 0) return;

    setIsCapturing(true);

    try {
      const canvas = document.createElement('canvas');
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;

      const ctx = canvas.getContext('2d');
      if (!ctx) {
        throw new Error('No se pudo inicializar el contexto de captura');
      }

      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

      canvas.toBlob((blob) => {
        if (blob) {
          const file = new File([blob], `scanner_${Date.now()}.jpg`, { type: 'image/jpeg' });
          stopTracks();
          onClose();
          onCapture(file);
        } else {
          setIsCapturing(false);
        }
      }, 'image/jpeg', 0.92);
    } catch {
      setIsCapturing(false);
    }
  };

  return (
    <Dialog
      open={open}
      onClose={() => {
        stopTracks();
        onClose();
      }}
      fullScreen
      PaperProps={{
        sx: {
          bgcolor: '#000000',
          color: '#ffffff',
          position: 'relative',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
        },
      }}
    >
      {/* Barra superior */}
      <Box
        sx={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          zIndex: 10,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          p: 2,
          background: 'linear-gradient(to bottom, rgba(0,0,0,0.85) 0%, rgba(0,0,0,0) 100%)',
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Typography variant="subtitle1" fontWeight={700} sx={{ color: '#fff' }}>
            {title}
          </Typography>
        </Box>

        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          {torchAvailable && (
            <IconButton
              onClick={handleToggleTorch}
              sx={{ color: torchOn ? '#f59e0b' : '#ffffff', bgcolor: 'rgba(255,255,255,0.15)' }}
            >
              {torchOn ? <FlashOnIcon /> : <FlashOffIcon />}
            </IconButton>
          )}

          <IconButton
            onClick={() => {
              stopTracks();
              onClose();
            }}
            sx={{ color: '#ffffff', bgcolor: 'rgba(255,255,255,0.15)' }}
          >
            <CloseIcon />
          </IconButton>
        </Box>
      </Box>

      {/* Visor de Video y Máscara de Encuadre */}
      <Box
        sx={{
          position: 'relative',
          width: '100%',
          height: '100%',
          overflow: 'hidden',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <video
          ref={videoRef}
          playsInline
          autoPlay
          muted
          style={{
            width: '100%',
            height: '100%',
            objectFit: 'cover',
          }}
        />

        {/* Badge flotante sutil superior (Full Viewfinder limpio y despejado) */}
        {!loading && !errorMsg && (
          <Box
            sx={{
              position: 'absolute',
              top: 76,
              left: '50%',
              transform: 'translateX(-50%)',
              bgcolor: 'rgba(0, 0, 0, 0.65)',
              backdropFilter: 'blur(8px)',
              border: '1px solid rgba(255, 255, 255, 0.15)',
              px: 2.5,
              py: 0.8,
              borderRadius: 4,
              pointerEvents: 'none',
              zIndex: 5,
              boxShadow: '0 2px 10px rgba(0,0,0,0.4)',
            }}
          >
            <Typography
              variant="caption"
              sx={{
                color: '#ffffff',
                fontWeight: 600,
                letterSpacing: 0.4,
                whiteSpace: 'nowrap',
              }}
            >
              {subtitle}
            </Typography>
          </Box>
        )}

        {/* Loader inicial mientras se negocia el sensor */}
        {loading && (
          <Box
            sx={{
              position: 'absolute',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: 2,
            }}
          >
            <CircularProgress color="primary" size={48} />
            <Typography variant="body2" sx={{ color: '#fff', fontWeight: 600 }}>
              Iniciando sensor de cámara...
            </Typography>
          </Box>
        )}

        {/* Alerta de Error de Permiso o Hardware */}
        {errorMsg && (
          <Box sx={{ position: 'absolute', p: 3, maxWidth: 420 }}>
            <Alert
              severity="warning"
              sx={{ mb: 2, borderRadius: 2 }}
              action={
                onSelectGallery ? (
                  <Button
                    color="inherit"
                    size="small"
                    startIcon={<CollectionsIcon />}
                    onClick={() => {
                      stopTracks();
                      onClose();
                      onSelectGallery();
                    }}
                  >
                    Galería
                  </Button>
                ) : undefined
              }
            >
              {errorMsg}
            </Alert>
          </Box>
        )}
      </Box>

      {/* Barra de control inferior con obturador */}
      <Box
        sx={{
          position: 'absolute',
          bottom: 0,
          left: 0,
          right: 0,
          zIndex: 10,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-around',
          py: 3,
          px: 2,
          background: 'linear-gradient(to top, rgba(0,0,0,0.85) 0%, rgba(0,0,0,0) 100%)',
        }}
      >
        {onSelectGallery ? (
          <Button
            variant="text"
            onClick={() => {
              stopTracks();
              onClose();
              onSelectGallery();
            }}
            startIcon={<CollectionsIcon />}
            sx={{ color: '#ffffff', textTransform: 'none', fontWeight: 600 }}
          >
            Galería
          </Button>
        ) : (
          <Box sx={{ width: 80 }} />
        )}

        {/* Botón Obturador */}
        <Box
          onClick={handleCaptureFrame}
          sx={{
            width: 76,
            height: 76,
            borderRadius: '50%',
            border: '4px solid #ffffff',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: isCapturing || loading || Boolean(errorMsg) ? 'not-allowed' : 'pointer',
            opacity: isCapturing || loading || Boolean(errorMsg) ? 0.5 : 1,
            transition: 'transform 150ms, background-color 150ms',
            '&:active': { transform: 'scale(0.92)' },
          }}
        >
          <Box
            sx={{
              width: 58,
              height: 58,
              borderRadius: '50%',
              bgcolor: '#ffffff',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#000000',
            }}
          >
            {isCapturing ? <CircularProgress size={24} color="inherit" /> : <PhotoCameraIcon sx={{ fontSize: 32 }} />}
          </Box>
        </Box>

        <Box sx={{ width: 80 }} />
      </Box>
    </Dialog>
  );
}
