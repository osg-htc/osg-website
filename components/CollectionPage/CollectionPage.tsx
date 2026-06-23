import { Container, Typography } from '@mui/material';
import MarkdownContainer from '@/components/MarkdownContainer';
import type { CollectionDoc } from '@/utils/collections';

/** Renders a single markdown collection document (title + body). */
export function CollectionPage({ doc }: { doc: CollectionDoc }) {
  return (
    <Container maxWidth='md' sx={{ py: 5 }}>
      <Typography variant='h2' component='h1' gutterBottom>
        {doc.title}
      </Typography>
      <MarkdownContainer content={doc.content} />
    </Container>
  );
}
