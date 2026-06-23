'use client';

import { useMemo, useState } from 'react';
import useSWR from 'swr';
import {
  Box,
  Card,
  CardContent,
  Container,
  Dialog,
  DialogContent,
  DialogTitle,
  Grid,
  IconButton,
  Skeleton,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TablePagination,
  TableRow,
  TableSortLabel,
  TextField,
  Typography,
} from '@mui/material';
import { Close } from '@mui/icons-material';
import { getFacilities, type MergedFacility } from '@/utils/adstash';

interface Column {
  id: keyof MergedFacility;
  label: string;
  numeric?: boolean;
  render: (f: MergedFacility) => React.ReactNode;
}
const COLUMNS: Column[] = [
  { id: 'name', label: 'Name', render: (f) => f.name },
  { id: 'jobsRan', label: 'Jobs Ran', numeric: true, render: (f) => Math.floor(f.jobsRan).toLocaleString() },
  { id: 'numFieldsOfScience', label: 'Impacted Fields of Science', numeric: true, render: (f) => f.numFieldsOfScience.toLocaleString() },
  { id: 'numProjects', label: 'Impacted Research Projects', numeric: true, render: (f) => f.numProjects.toLocaleString() },
];

function StatTile({ label, value }: { label: string; value: number }) {
  return (
    <Card sx={{ bgcolor: 'grey.900', color: 'common.white' }}>
      <CardContent>
        <Typography variant='h5'>{Math.round(value).toLocaleString()}</Typography>
        <Typography variant='caption'>{label}</Typography>
      </CardContent>
    </Card>
  );
}

function FacilityDialog({
  facility,
  onClose,
}: {
  facility: MergedFacility | null;
  onClose: () => void;
}) {
  return (
    <Dialog open={!!facility} onClose={onClose} maxWidth='md' fullWidth>
      {facility && (
        <>
          <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', gap: 2 }}>
            {facility.name}
            <IconButton onClick={onClose} aria-label='Close'>
              <Close />
            </IconButton>
          </DialogTitle>
          <DialogContent dividers>
            <Grid container spacing={1}>
              {[
                { label: 'Jobs Ran', value: facility.jobsRan },
                { label: 'CPU Core Hours Provided', value: facility.cpuProvided },
                { label: 'GPU Hours Provided', value: facility.gpuProvided },
                { label: 'Research Projects Supported', value: facility.numProjects },
                { label: 'Fields of Science Supported', value: facility.numFieldsOfScience },
                { label: 'Organizations Supported', value: facility.numOrganizations },
              ].map((s) => (
                <Grid key={s.label} size={{ xs: 6, md: 4 }}>
                  <StatTile label={s.label} value={s.value} />
                </Grid>
              ))}
            </Grid>
          </DialogContent>
        </>
      )}
    </Dialog>
  );
}

export function FacilityExplorer({ ccStarOnly = false }: { ccStarOnly?: boolean }) {
  const { data, isLoading } = useSWR(
    ccStarOnly ? 'facilities-ccstar' : 'facilities',
    () => getFacilities(ccStarOnly),
    { revalidateOnFocus: false }
  );

  const [search, setSearch] = useState('');
  const [orderBy, setOrderBy] = useState<keyof MergedFacility>('jobsRan');
  const [order, setOrder] = useState<'asc' | 'desc'>('desc');
  const [page, setPage] = useState(0);
  const [selected, setSelected] = useState<MergedFacility | null>(null);
  const rowsPerPage = ccStarOnly ? 10 : 50;

  const all = useMemo(() => data ?? [], [data]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return all;
    return all.filter((f) => f.name.toLowerCase().includes(q));
  }, [all, search]);

  const sorted = useMemo(() => {
    const factor = order === 'asc' ? 1 : -1;
    return [...filtered].sort((a, b) => {
      const av = a[orderBy];
      const bv = b[orderBy];
      if (typeof av === 'number' && typeof bv === 'number') return (av - bv) * factor;
      return String(av ?? '').localeCompare(String(bv ?? '')) * factor;
    });
  }, [filtered, orderBy, order]);

  const totals = useMemo(
    () => ({
      jobs: filtered.reduce((s, f) => s + f.jobsRan, 0),
      count: filtered.length,
    }),
    [filtered]
  );

  const handleSort = (id: keyof MergedFacility) => {
    if (orderBy === id) setOrder(order === 'asc' ? 'desc' : 'asc');
    else {
      setOrderBy(id);
      setOrder(id === 'name' ? 'asc' : 'desc');
    }
  };

  const pageRows = sorted.slice(page * rowsPerPage, (page + 1) * rowsPerPage);

  return (
    <Container maxWidth='lg' sx={{ py: 2 }}>
      {data && (
        <Typography color='text.secondary' sx={{ mb: 2 }}>
          {totals.count.toLocaleString()} facilities · {Math.round(totals.jobs).toLocaleString()} jobs in the last year.
        </Typography>
      )}

      <TextField
        fullWidth
        size='small'
        type='search'
        placeholder='Search facilities'
        value={search}
        onChange={(e) => {
          setSearch(e.target.value);
          setPage(0);
        }}
        sx={{ mb: 2 }}
      />

      <TableContainer component={Box}>
        <Table size='small' stickyHeader>
          <TableHead>
            <TableRow>
              {COLUMNS.map((col) => (
                <TableCell
                  key={col.id}
                  align={col.numeric ? 'right' : 'left'}
                  sortDirection={orderBy === col.id ? order : false}
                >
                  <TableSortLabel
                    active={orderBy === col.id}
                    direction={orderBy === col.id ? order : 'asc'}
                    onClick={() => handleSort(col.id)}
                  >
                    {col.label}
                  </TableSortLabel>
                </TableCell>
              ))}
            </TableRow>
          </TableHead>
          <TableBody>
            {isLoading &&
              Array.from({ length: 10 }).map((_, i) => (
                <TableRow key={i}>
                  <TableCell colSpan={COLUMNS.length}>
                    <Skeleton />
                  </TableCell>
                </TableRow>
              ))}
            {pageRows.map((row) => (
              <TableRow
                key={row.name}
                hover
                onClick={() => setSelected(row)}
                sx={{ cursor: 'pointer' }}
              >
                {COLUMNS.map((col) => (
                  <TableCell
                    key={col.id}
                    align={col.numeric ? 'right' : 'left'}
                    sx={col.id === 'name' ? { textDecoration: 'underline' } : undefined}
                  >
                    {col.render(row)}
                  </TableCell>
                ))}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
      <TablePagination
        component='div'
        count={sorted.length}
        page={page}
        onPageChange={(_, p) => setPage(p)}
        rowsPerPage={rowsPerPage}
        rowsPerPageOptions={[rowsPerPage]}
      />

      <FacilityDialog facility={selected} onClose={() => setSelected(null)} />
    </Container>
  );
}
