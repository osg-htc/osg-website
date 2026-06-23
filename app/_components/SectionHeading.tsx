import type { ReactNode } from 'react';
import { Box, Typography } from '@mui/material';

export function SectionHeading({ children }: { children: ReactNode }) {
  return (
    <Box sx={{ textAlign: 'center', mb: 4 }}>
      <Box
        sx={{ width: '2.5rem', height: 4, bgcolor: 'primary.main', borderRadius: 2, mx: 'auto', mb: 1.5 }}
      />
      <Typography variant='h4' component='h2'>
        {children}
      </Typography>
    </Box>
  );
}
