import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import { keyframes } from '@mui/material/styles';
import AnimatedSection from './AnimatedSection';

// ─── SVG locales de marcas ────────────────────────────────────────────────────
import NVIDIA_SVG  from '@ui/assets/images/Nvidia.svg';
import AMD_SVG     from '@ui/assets/images/AMD.svg';
import ASUS_SVG    from '@ui/assets/images/Asus.svg';
import INTEL_SVG   from '@ui/assets/images/Intel.svg';
import CORSAIR_SVG from '@ui/assets/images/Corsair-.svg';

const marquee = keyframes`
  0% { transform: translateX(0%); }
  100% { transform: translateX(-50%); }
`;

const BRANDS = [
  { name: 'NVIDIA',  logo: NVIDIA_SVG  },
  { name: 'AMD',     logo: AMD_SVG     },
  { name: 'ASUS',    logo: ASUS_SVG    },
  { name: 'Intel',   logo: INTEL_SVG   },
  { name: 'Corsair', logo: CORSAIR_SVG },
  // Duplicamos para llenar la cinta
  { name: 'NVIDIA',  logo: NVIDIA_SVG  },
  { name: 'AMD',     logo: AMD_SVG     },
  { name: 'ASUS',    logo: ASUS_SVG    },
  { name: 'Intel',   logo: INTEL_SVG   },
  { name: 'Corsair', logo: CORSAIR_SVG },
];

export default function BrandCarousel() {
  return (
    <Box
      sx={{
        overflow: 'hidden',
        bgcolor: '#F8FAFC',
        borderTop: '1px solid',
        borderBottom: '1px solid',
        borderColor: 'divider',
        position: 'relative',
        py: 6,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 4,
      }}
    >
      <AnimatedSection>
        <Typography
          variant="caption"
          sx={{
            display: 'block',
            textAlign: 'center',
            fontWeight: 700,
            letterSpacing: '0.14em',
            textTransform: 'uppercase',
            color: 'text.disabled',
            fontSize: '0.7rem',
            mb: 1,
          }}
        >
          Distribuidores Oficiales
        </Typography>
      </AnimatedSection>

      {/* Marquee */}
      <Box
        sx={{
          width: '100%',
          overflow: 'hidden',
          position: 'relative',
          '&::before, &::after': {
            content: '""',
            position: 'absolute',
            top: 0, bottom: 0, width: { xs: '60px', md: '160px' },
            zIndex: 2, pointerEvents: 'none',
          },
          '&::before': { left: 0, background: 'linear-gradient(to right, #F8FAFC 0%, transparent 100%)' },
          '&::after':  { right: 0, background: 'linear-gradient(to left, #F8FAFC 0%, transparent 100%)' },
        }}
      >
        <Box
          sx={{
            display: 'flex',
            width: 'max-content',
            animation: `${marquee} 30s linear infinite`,
            '&:hover': { animationPlayState: 'paused' },
          }}
        >
          {[...BRANDS, ...BRANDS].map((brand, i) => (
            <Box
              key={i}
              component="img"
              src={brand.logo}
              alt={brand.name}
              title={brand.name}
              sx={{
                height: { xs: 22, md: 32 },
                mx: { xs: 5, md: 10 },
                filter: 'grayscale(100%) opacity(0.35)',
                transition: 'filter 0.35s ease, transform 0.35s ease',
                cursor: 'default',
                userSelect: 'none',
                '&:hover': {
                  filter: 'grayscale(0%) opacity(1)',
                  transform: 'scale(1.12)',
                },
              }}
            />
          ))}
        </Box>
      </Box>
    </Box>
  );
}
