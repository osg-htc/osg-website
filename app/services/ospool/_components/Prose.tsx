import type { ReactNode } from 'react';
import { Container } from '@mui/material';

/** Constrains the prose column the way the Jekyll layout did. */
export function Prose({ children }: { children: ReactNode }) {
  return (
    <Container maxWidth='md' sx={{ '& p': { mb: 2 } }}>
      {children}
    </Container>
  );
}
