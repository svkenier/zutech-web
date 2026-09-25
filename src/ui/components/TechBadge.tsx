import Box from '@mui/material/Box';

import { alpha } from '@mui/material/styles';

interface TechBadgeProps {
  label: string;
  color?: 'primary' | 'secondary' | 'error' | 'success' | 'warning' | 'info';
  variant?: 'solid' | 'outline' | 'glass';
}

export default function TechBadge({ label, color = 'primary', variant = 'glass' }: TechBadgeProps) {
  return (
    <Box
      sx={(theme) => {
        const mainColor = theme.palette[color].main;
        
        let bg = 'transparent';
        let border = `1px solid ${mainColor}`;
        let textColor = mainColor;

        if (variant === 'solid') {
          bg = mainColor;
          textColor = theme.palette[color].contrastText;
        } else if (variant === 'glass') {
          bg = alpha(mainColor, 0.1);
          border = `1px solid ${alpha(mainColor, 0.3)}`;
        }

        return {
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          px: 1.5,
          py: 0.5,
          borderRadius: '4px',
          bgcolor: bg,
          border: border,
          color: textColor,
          textTransform: 'uppercase',
          letterSpacing: '0.1em',
          fontSize: '0.7rem',
          fontWeight: 700,
          whiteSpace: 'nowrap',
          backdropFilter: variant === 'glass' ? 'blur(4px)' : 'none',
        };
      }}
    >
      {label}
    </Box>
  );
}
