'use client';

import { useEffect, useRef, useState } from 'react';
import useSWR from 'swr';
import { Box, Typography } from '@mui/material';
import { formatCompactNumber } from '@/utils/adstash';

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

interface AlphafoldData {
  date: string;
  alignmentsCached: number;
  uniqueProteins: number;
  species: number;
  communityContributed: number;
  queriesToday: number;
}

const fetcher = (url: string): Promise<{ data: AlphafoldData }> =>
  fetch(url).then((r) => r.json());

function useCountUp(end: number | undefined, steps = 20, intervalMs = 50) {
  const [value, setValue] = useState(0);
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);
  useEffect(() => {
    if (end === undefined) return;
    let index = 0;
    timer.current = setInterval(() => {
      index += 1;
      if (index >= steps) {
        setValue(end);
        if (timer.current) clearInterval(timer.current);
      } else {
        setValue(Math.floor(end * Math.sqrt(index / steps)));
      }
    }, intervalMs);
    return () => {
      if (timer.current) clearInterval(timer.current);
    };
  }, [end, steps, intervalMs]);
  return value;
}

function Stat({ value }: { value: number | undefined }) {
  const count = useCountUp(value);
  return <>{value === undefined ? '—' : formatCompactNumber(count)}</>;
}

export default function AlphafoldStats() {
  const { data: res } = useSWR('/data/alphafold-caching.json', fetcher, {
    revalidateOnFocus: false,
  });
  const data = res?.data;

  const dateLabel = data
    ? (() => {
        const d = new Date(data.date);
        return `${MONTHS[d.getUTCMonth()]} ${d.getUTCDate()}, ${d.getUTCFullYear()}`;
      })()
    : '…';

  return (
    <Box sx={{ py: 4, textAlign: 'center' }}>
      <Typography variant='h4' component='h2' sx={{ '& b': { fontWeight: 700 } }}>
        <Box component='span' display='inline-block'>
          As of <b>{dateLabel}</b>
        </Box>
        <br />
        <Box component='span' display='inline-block' py={1}>
          <b>
            <Stat value={data?.alignmentsCached} /> alignments
          </b>{' '}
          cached
        </Box>
        <br />
        <Box component='span' display='inline-block'>
          Representing{' '}
          <b>
            <Stat value={data?.uniqueProteins} /> unique protein sequences
          </b>
        </Box>
        <br />
        <Box component='span' display='inline-block'>
          Annotated across{' '}
          <b>
            <Stat value={data?.species} /> source organisms
          </b>
        </Box>
        <br />
        <Box component='span' display='inline-block'>
          Including{' '}
          <b>
            <Stat value={data?.communityContributed} /> community-contributed records
          </b>
        </Box>
        <br />
        <Box component='span' display='inline-block'>
          With{' '}
          <b>
            <Stat value={data?.queriesToday} /> queries today
          </b>
        </Box>
      </Typography>
    </Box>
  );
}
