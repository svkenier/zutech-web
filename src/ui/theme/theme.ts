import { createTheme, type PaletteOptions } from '@mui/material/styles';

const palette: PaletteOptions = {
  mode: 'light',

  primary: {
    main:        '#0A1322', // ZUTECH Navy
    contrastText: '#FFFFFF',
  },

  secondary: {
    main:        '#00E5FF', // ZUTECH Cyan
    contrastText: '#0A1322',
  },

  error: { main: '#DC2626' },
  warning: { main: '#F59E0B' },
  success: { main: '#10B981' },
  info: { main: '#3B82F6' },

  background: {
    default: '#FFFFFF', // Base luminosa
    paper:   '#F8FAFC', // Slate 50
  },

  text: {
    primary:   '#0A1322', // ZUTECH Navy para lectura
    secondary: '#475569', // Slate 600
    disabled:  '#94A3B8', // Slate 400
  },

  divider: '#E2E8F0', // Slate 200 para bordes ultra finos
};

const fontFamily = [
  '"Inter"',
  '"Roboto Flex"',
  '"Geist"',
  '-apple-system',
  'BlinkMacSystemFont',
  '"Segoe UI"',
  'sans-serif',
].join(', ');



const theme = createTheme({
  palette,
  typography: {
    fontFamily,
    fontSize: 14,
    h1: { fontWeight: 800, fontSize: 'clamp(2.5rem, 5vw, 4rem)', lineHeight: 1.1, letterSpacing: '-0.03em', color: '#0A1322' },
    h2: { fontWeight: 800, fontSize: 'clamp(1.75rem, 4vw, 2.75rem)', lineHeight: 1.15, letterSpacing: '-0.02em', color: '#0A1322' },
    h3: { fontWeight: 700, fontSize: 'clamp(1.5rem, 3vw, 2rem)', lineHeight: 1.2, letterSpacing: '-0.01em', color: '#0A1322' },
    h4: { fontWeight: 700, fontSize: 'clamp(1.25rem, 2.5vw, 1.5rem)', lineHeight: 1.3, color: '#0A1322' },
    h5: { fontWeight: 600, fontSize: '1.125rem' },
    h6: { fontWeight: 600, fontSize: '1rem' },
    subtitle1: { fontWeight: 500, fontSize: '1rem', lineHeight: 1.5 },
    subtitle2: { fontWeight: 500, fontSize: '0.875rem', lineHeight: 1.5 },
    body1: { fontSize: '1rem', lineHeight: 1.7, color: '#334155' },
    body2: { fontSize: '0.875rem', lineHeight: 1.6, color: '#475569' },
    caption: { fontSize: '0.75rem', color: '#64748B' },
    button: { fontWeight: 600, textTransform: 'none', letterSpacing: '0.01em' },
    overline: { fontWeight: 700, fontSize: '0.75rem', letterSpacing: '0.12em', textTransform: 'uppercase' },
  },
  shape: { borderRadius: 8 },
  components: {
    MuiCssBaseline: {
      styleOverrides: {
        '*, *::before, *::after': { boxSizing: 'border-box' },
        html: { scrollBehavior: 'smooth', WebkitFontSmoothing: 'antialiased' },
        body: { backgroundColor: '#FFFFFF', color: '#0A1322' },
      },
    },
    MuiCard: {
      defaultProps: { elevation: 0 },
      styleOverrides: {
        root: {
          backgroundColor: '#FFFFFF',
          border: '1px solid #E2E8F0',
          borderRadius: 12,
          transition: 'transform 200ms ease-in-out, box-shadow 200ms ease-in-out, border-color 200ms',
          '&:hover': {
            boxShadow: '0 10px 40px -10px rgba(10, 19, 34, 0.08)',
            borderColor: '#CBD5E1',
          },
        },
      },
    },
    MuiButton: {
      defaultProps: { disableElevation: true },
      styleOverrides: {
        root: {
          borderRadius: 6,
          fontWeight: 600,
          padding: '8px 20px',
          transition: 'transform 0.2s',
          '&:active': { transform: 'scale(0.98)' },
        },
      },
    },
    MuiOutlinedInput: {
      styleOverrides: {
        root: {
          borderRadius: 6,
          backgroundColor: '#FFFFFF',
          '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
            borderColor: '#0A1322',
            borderWidth: '2px',
          },
        },
      },
    },
    MuiChip: {
      styleOverrides: {
        root: {
          borderRadius: 4,
          fontWeight: 600,
          fontSize: '0.75rem',
          letterSpacing: '0.05em',
          textTransform: 'uppercase',
        },
      },
    },
  },
});

export default theme;
