'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import useSWR from 'swr';
import {
  Box,
  Card,
  CardContent,
  CardHeader,
  Container,
  Grid,
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
import { PieChart } from '@/components/services/PieChart';
import {
  formatBytes,
  getProjectsForRange,
  type ProjectUsage,
} from '@/utils/adstash';
import { slugify } from '@/utils/slug';

const TOP_N = 15;
type ChartData = { labels: string[]; data: number[] };

function topNByField(
  items: ProjectUsage[],
  labelOf: (p: ProjectUsage) => string | undefined,
  valueOf: (p: ProjectUsage) => number
): ChartData {
  const totals = new Map<string, number>();
  for (const item of items) {
    const label = labelOf(item);
    const value = valueOf(item);
    if (!label || value <= 0) continue;
    totals.set(label, (totals.get(label) ?? 0) + value);
  }
  const sorted = [...totals.entries()].sort((a, b) => b[1] - a[1]);
  const top = sorted.slice(0, TOP_N);
  const otherTotal = sorted.slice(TOP_N).reduce((s, [, v]) => s + v, 0);
  const labels = top.map(([k]) => k);
  const data = top.map(([, v]) => Math.round(v));
  if (otherTotal > 0) {
    labels.push('Other');
    data.push(Math.round(otherTotal));
  }
  return { labels, data };
}

function ChartCard({ title, chart }: { title: string; chart: ChartData }) {
  return (
    <Card sx={{ bgcolor: 'grey.900', color: 'common.white', height: '100%' }}>
      <CardHeader title={title} titleTypographyProps={{ variant: 'h6' }} />
      <CardContent>
        {chart.labels.length ? (
          <PieChart labels={chart.labels} data={chart.data} ariaLabel={title} legendColor='#fff' />
        ) : (
          <Skeleton variant='rounded' height={240} />
        )}
      </CardContent>
    </Card>
  );
}

interface Column {
  id: keyof ProjectUsage;
  label: string;
  numeric?: boolean;
  render: (p: ProjectUsage) => React.ReactNode;
}
const COLUMNS: Column[] = [
  { id: 'projectName', label: 'Name', render: (p) => p.projectName },
  { id: 'projectInstitutionName', label: 'Institution', render: (p) => p.projectInstitutionName ?? '—' },
  { id: 'detailedFieldOfScience', label: 'Field Of Science', render: (p) => p.detailedFieldOfScience ?? '—' },
  {
    id: 'osdfFileTransferCount',
    label: 'Objects Transferred',
    numeric: true,
    render: (p) => Math.floor(p.osdfFileTransferCount).toLocaleString(),
  },
  {
    id: 'osdfByteTransferCount',
    label: 'Bytes Transferred',
    numeric: true,
    render: (p) => formatBytes(p.osdfByteTransferCount),
  },
];

export function OsdfProjectsExplorer() {
  const router = useRouter();
  const { data, isLoading } = useSWR('osdf-projects', getProjectsForRange, {
    revalidateOnFocus: false,
  });

  const [search, setSearch] = useState('');
  const [orderBy, setOrderBy] = useState<keyof ProjectUsage>('osdfFileTransferCount');
  const [order, setOrder] = useState<'asc' | 'desc'>('desc');
  const [page, setPage] = useState(0);
  const rowsPerPage = 50;

  // Only projects that actually transferred OSDF data.
  const all = useMemo(
    () =>
      (data ?? []).filter(
        (p) => p.osdfFileTransferCount > 0 && p.osdfByteTransferCount > 0
      ),
    [data]
  );

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return all;
    return all.filter((p) =>
      [p.projectName, p.projectInstitutionName, p.detailedFieldOfScience]
        .filter(Boolean)
        .some((f) => String(f).toLowerCase().includes(q))
    );
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

  const charts = useMemo(
    () => ({
      filesByFos: topNByField(all, (p) => p.detailedFieldOfScience, (p) => p.osdfFileTransferCount),
      bytesByFos: topNByField(all, (p) => p.detailedFieldOfScience, (p) => p.osdfByteTransferCount),
      filesByProject: topNByField(all, (p) => p.projectName, (p) => p.osdfFileTransferCount),
      bytesByProject: topNByField(all, (p) => p.projectName, (p) => p.osdfByteTransferCount),
    }),
    [all]
  );

  const aggregate = useMemo(() => {
    const files = filtered.reduce((s, p) => s + p.osdfFileTransferCount, 0);
    const bytes = filtered.reduce((s, p) => s + p.osdfByteTransferCount, 0);
    const institutions = new Set(filtered.map((p) => p.projectInstitutionName).filter(Boolean));
    const fields = new Set(filtered.map((p) => p.majorFieldOfScience).filter(Boolean));
    return { count: filtered.length, files, bytes, institutions: institutions.size, fields: fields.size };
  }, [filtered]);

  const handleSort = (id: keyof ProjectUsage) => {
    if (orderBy === id) setOrder(order === 'asc' ? 'desc' : 'asc');
    else {
      setOrderBy(id);
      setOrder(typeof all[0]?.[id] === 'number' ? 'desc' : 'asc');
    }
  };

  const pageRows = sorted.slice(page * rowsPerPage, (page + 1) * rowsPerPage);

  return (
    <Box>
      <Box sx={{ bgcolor: 'grey.900', py: 3 }}>
        <Container maxWidth='xl'>
          <Grid container spacing={2}>
            <Grid size={{ xs: 12, md: 6 }}>
              <ChartCard title='Objects Transferred by Project' chart={charts.filesByProject} />
            </Grid>
            <Grid size={{ xs: 12, md: 6 }}>
              <ChartCard title='Bytes Transferred by Project' chart={charts.bytesByProject} />
            </Grid>
            <Grid size={{ xs: 12, md: 6 }}>
              <ChartCard title='Objects Transferred by Field of Science' chart={charts.filesByFos} />
            </Grid>
            <Grid size={{ xs: 12, md: 6 }}>
              <ChartCard title='Bytes Transferred by Field of Science' chart={charts.bytesByFos} />
            </Grid>
          </Grid>
        </Container>
      </Box>

      <Container maxWidth='lg' sx={{ py: 4 }}>
        {data && (
          <Typography color='text.secondary' paragraph>
            In the past 12 months {aggregate.count.toLocaleString()} OSPool
            projects transferred {aggregate.files.toLocaleString()} objects (
            {formatBytes(aggregate.bytes)}) over the OSDF, from{' '}
            {aggregate.institutions} institutions representing {aggregate.fields}{' '}
            fields of science.
          </Typography>
        )}

        <TextField
          fullWidth
          size='small'
          type='search'
          placeholder='Search projects'
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
                  key={row.projectName}
                  hover
                  onClick={() => router.push(`/projects/${slugify(row.projectName)}/`)}
                  sx={{ cursor: 'pointer' }}
                >
                  {COLUMNS.map((col) => (
                    <TableCell
                      key={col.id}
                      align={col.numeric ? 'right' : 'left'}
                      sx={col.id === 'projectName' ? { textDecoration: 'underline' } : undefined}
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
      </Container>
    </Box>
  );
}
