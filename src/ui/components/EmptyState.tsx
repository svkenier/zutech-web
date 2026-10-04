import React from 'react';
import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Typography from '@mui/material/Typography';
import AnimatedSection from '@ui/components/AnimatedSection';

interface EmptyStateProps {
  icon: React.ReactElement<any>;
  title: string;
  description: string;
  action?: React.ReactNode;
}

export default function EmptyState({ icon, title, description, action }: EmptyStateProps) {
  return (
    <AnimatedSection>
      <Box 
        component={Card} 
        elevation={0} 
        sx={{ 
          bgcolor: 'rgba(6, 13, 23, 0.6)',
          backdropFilter: 'blur(12px)',
          border: '1px solid rgba(0, 240, 255, 0.15)',
          borderRadius: 4, 
          textAlign: 'center', 
          py: 8,
          px: 4,
          position: 'relative',
          overflow: 'hidden',
          boxShadow: '0 8px 32px rgba(0, 0, 0, 0.2)'
        }}
      >
        {/* Subtle glow effect behind icon */}
        <Box sx={{
          position: 'absolute',
          top: '30%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          width: 120,
          height: 120,
          background: 'radial-gradient(circle, rgba(0, 240, 255, 0.15) 0%, rgba(0, 0, 0, 0) 70%)',
          zIndex: 0,
          pointerEvents: 'none'
        }} />

        <Box sx={{ position: 'relative', zIndex: 1 }}>
          <Box sx={{ 
            display: 'inline-flex',
            p: 2,
            borderRadius: '50%',
            bgcolor: 'rgba(0, 240, 255, 0.05)',
            border: '1px solid rgba(0, 240, 255, 0.2)',
            mb: 3
          }}>
            {React.cloneElement(icon, { sx: { fontSize: 48, color: '#00F0FF' } })}
          </Box>
          <Typography variant="h5" component="h3" color="#FFFFFF" fontWeight={700} gutterBottom sx={{ letterSpacing: '-0.01em' }}>
            {title}
          </Typography>
          <Typography variant="body1" sx={{ color: 'rgba(255, 255, 255, 0.65)', maxWidth: 400, mx: 'auto', mb: action ? 4 : 0 }}>
            {description}
          </Typography>
          {action && (
            <Box sx={{ mt: 2 }}>
              {action}
            </Box>
          )}
        </Box>
      </Box>
    </AnimatedSection>
  );
}
