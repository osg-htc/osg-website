import type { ReactNode } from 'react';
import { Box, Typography } from '@mui/material';

export function MiniBarHeading({ children, id }: { children: ReactNode; id?: string }) {
  return (
    <Box sx={{ mt: 4 }} id={id}>
      <Box sx={{ width: '2rem', height: 4, bgcolor: 'primary.main', mb: 1 }} />
      <Typography variant='h4' component='h3'>
        {children}
      </Typography>
    </Box>
  );
}
