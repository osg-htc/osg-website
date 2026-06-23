import type { ElementType, ReactNode } from 'react';
import { Box, Typography } from '@mui/material';

export function MiniBarHeading({
  children,
  component = 'h2',
  variant = 'h4',
}: {
  children: ReactNode;
  component?: ElementType;
  variant?: 'h2' | 'h3' | 'h4' | 'h5';
}) {
  return (
    <Box sx={{ mt: 2 }}>
      <Box sx={{ width: '2rem', height: 4, bgcolor: 'primary.main', mb: 1.5 }} />
      <Typography variant={variant} component={component}>
        {children}
      </Typography>
    </Box>
  );
}
