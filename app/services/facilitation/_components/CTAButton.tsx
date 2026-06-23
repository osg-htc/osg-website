import type { ReactNode } from 'react';
import { Button } from '@mui/material';

export function CTAButton({ href, children }: { href: string; children: ReactNode }) {
  return (
    <Button
      href={href}
      variant='outlined'
      sx={{ display: 'block', width: 'fit-content', mx: 'auto', my: 2 }}
    >
      {children}
    </Button>
  );
}
