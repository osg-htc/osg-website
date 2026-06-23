'use client';

import * as React from 'react';
import {
  AuthenticatedClient,
  usePelicanClient,
} from '@pelicanplatform/components';
import { registerPelicanSw } from '@pelicanplatform/web-client';
import { Box, Skeleton, Tab, Tabs } from '@mui/material';

import { pelicanObjectUrl } from '@/utils/dataRepositories';

export interface RepositoryFileBrowserProps {
  namespaces: string[];
}

export default function RepositoryFileBrowser({
  namespaces,
}: RepositoryFileBrowserProps) {
  const { setObjectUrl, namespace } = usePelicanClient();
  const [activeNamespace, setActiveNamespace] = React.useState(
    namespaces[0] ?? ''
  );
  // The Pelican client relies on browser APIs, so only render it once mounted
  // on the client to stay compatible with the static export prerender.
  const [mounted, setMounted] = React.useState(false);

  React.useEffect(() => {
    registerPelicanSw('/downloadServiceWorker.js');
    setMounted(true);
  }, []);

  const handleChange = (_event: React.SyntheticEvent, namespace: string) => {
    const params = new URLSearchParams(window.location.search);
    params.delete('url');
    const newSearch = params.toString();
    window.history.replaceState(
      {},
      '',
      newSearch ? `?${newSearch}` : window.location.pathname
    );
    setObjectUrl(pelicanObjectUrl(namespace));
    setActiveNamespace(namespace);
  };

  if (namespaces.length === 0) {
    return null;
  }

  return (
    <Box>
      {namespaces.length > 1 && (
        <Tabs
          value={activeNamespace}
          onChange={handleChange}
          variant='scrollable'
          scrollButtons='auto'
          allowScrollButtonsMobile
          sx={{
            mb: 2,
            borderBottom: 1,
            borderColor: 'divider',
            '& .MuiTab-root': { fontFamily: 'monospace', textTransform: 'none' },
          }}
        >
          {namespaces.map((namespace) => (
            <Tab key={namespace} value={namespace} label={namespace} />
          ))}
        </Tabs>
      )}

      {mounted ? (
        <AuthenticatedClient key={namespace?.prefix} />
      ) : (
        <Skeleton variant='rounded' height={420} />
      )}
    </Box>
  );
}
