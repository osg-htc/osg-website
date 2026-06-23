import Link from 'next/link';
import { Box, Container, Stack, Typography } from '@mui/material';

export interface ServiceNavLink {
  label: string;
  href: string;
  icon?: React.ReactNode;
}

/**
 * A dark secondary-bar of sub-navigation links for a service section
 * (e.g. OSPool: Overview / Projects / Institutions / Documentation / Training).
 * Hidden on small screens, where the main header navigation is used instead.
 */
export function ServiceNav({
  title,
  icon,
  links,
}: {
  title: string;
  icon?: React.ReactNode;
  links: ServiceNavLink[];
}) {
  return (
    <Box
      sx={{
        display: { xs: 'none', md: 'block' },
        bgcolor: 'grey.900',
        py: 1,
      }}
    >
      <Container maxWidth='xl'>
        <Stack
          direction='row'
          alignItems='center'
          sx={{ position: 'relative', minHeight: 32 }}
        >
          <Typography
            variant='subtitle1'
            sx={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 0.5,
              color: 'grey.500',
            }}
          >
            {icon}
            {title}
          </Typography>
          <Stack
            direction='row'
            spacing={3}
            sx={{
              alignItems: 'center',
              position: 'absolute',
              left: '50%',
              transform: 'translateX(-50%)',
            }}
          >
            {links.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                style={{ textDecoration: 'none' }}
              >
                <Box
                  sx={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 0.5,
                    color: 'grey.400',
                    fontSize: '0.95rem',
                    '&:hover': { color: 'primary.main' },
                    '& svg': { fontSize: '1.1rem' },
                  }}
                >
                  {link.icon}
                  {link.label}
                </Box>
              </Link>
            ))}
          </Stack>
        </Stack>
      </Container>
    </Box>
  );
}
