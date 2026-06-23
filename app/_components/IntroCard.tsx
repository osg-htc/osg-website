import type { ReactNode } from 'react';
import ExportedImage from 'next-image-export-optimizer';
import { Box, Button, Card, CardContent, Typography } from '@mui/material';
import { MiniBarHeading } from './MiniBarHeading';

export function IntroCard({
  image,
  alt,
  title,
  subtitle,
  children,
  buttons,
}: {
  image: string;
  alt: string;
  title: string;
  subtitle?: string;
  children: ReactNode;
  buttons: { href: string; label: string }[];
}) {
  return (
    <Card
      variant='outlined'
      sx={{ border: 0, height: '100%', display: 'flex', flexDirection: 'column' }}
    >
      <Box sx={{ display: 'flex', justifyContent: 'center', p: 2, height: 170 }}>
        <ExportedImage
          src={image}
          alt={alt}
          width={350}
          height={350}
          style={{ height: '100%', width: 'auto', maxWidth: '100%', objectFit: 'contain' }}
        />
      </Box>
      <CardContent sx={{ display: 'flex', flexDirection: 'column', flex: 1 }}>
        <MiniBarHeading variant='h5'>{title}</MiniBarHeading>
        {subtitle && (
          <Typography variant='subtitle1' color='text.secondary' mt={1}>
            {subtitle}
          </Typography>
        )}
        <Box sx={{ '& p': { mb: 1 } }}>{children}</Box>
        <Box sx={{ mt: 'auto', pt: 2, display: 'flex', flexWrap: 'wrap', gap: 1 }}>
          {buttons.map((b) => (
            <Button
              key={b.href + b.label}
              href={b.href}
              variant='contained'
              color='secondary'
              size='small'
            >
              {b.label}
            </Button>
          ))}
        </Box>
      </CardContent>
    </Card>
  );
}
