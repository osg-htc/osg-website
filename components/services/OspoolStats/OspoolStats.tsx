'use client';

import { useEffect, useRef, useState } from 'react';
import useSWR from 'swr';
import { Box, Typography } from '@mui/material';
import {
  formatCompactNumber,
  getLatestOSPoolOverview,
  type DatedOspoolOverview,
} from '@/utils/adstash';

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

/**
 * Animate a value from 0 up to `end`, easing with a square-root curve so the
 * counter decelerates as it approaches the target (mirrors the legacy script).
 */
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
  return <>{value === undefined ? '…' : formatCompactNumber(count)}</>;
}

export default function OspoolStats() {
  const { data } = useSWR<DatedOspoolOverview>(
    'ospool-overview',
    getLatestOSPoolOverview,
    { revalidateOnFocus: false }
  );

  const dateLabel = data
    ? `${MONTHS[data.date.getUTCMonth()]} ${data.date.getUTCDate()}`
    : '…';

  return (
    <Box sx={{ py: 4, textAlign: 'center' }}>
      <Typography variant='h4' component='h2' sx={{ '& b': { fontWeight: 700 } }}>
        <Box component='span' display='inline-block'>
          On <b>{dateLabel}</b>
        </Box>
        <br />
        <Box component='span' display='inline-block' py={1}>
          <b>
            <Stat value={data?.numJobs} /> jobs
          </b>{' '}
          completed
        </Box>
        <br />
        <Box component='span' display='inline-block'>
          Placed by{' '}
          <b>
            <Stat value={data?.numProjects} /> research projects
          </b>
        </Box>
        <br />
        <Box component='span' display='inline-block'>
          Triggering{' '}
          <b>
            <Stat value={data?.fileTransferCount} /> file transfers
          </b>
        </Box>
        <br />
        <Box component='span' display='inline-block'>
          Consuming{' '}
          <b>
            <Stat value={data?.cpuHours} /> core hours
          </b>
        </Box>
        <br />
        <Box component='span' display='inline-block'>
          Harnessing capacity from{' '}
          <b>
            <Stat value={data?.numInstitutions} /> institutions.
          </b>
        </Box>
      </Typography>
    </Box>
  );
}
