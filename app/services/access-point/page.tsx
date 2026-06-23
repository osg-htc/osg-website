import type { Metadata } from 'next';
import Link from 'next/link';
import { Box, Button, Container, Grid, Paper, Typography } from '@mui/material';

export const metadata: Metadata = {
  title: 'OSG-Operated Access Points — OSG Consortium',
  description:
    "A researcher's home for High Throughput Computing work on the nation's cyberinfrastructure.",
};

export default function Page() {
  return (
    <Container maxWidth='lg' sx={{ py: 5 }}>
      <Typography variant='h2' component='h1' gutterBottom>
        OSG-Operated Access Points
      </Typography>

      <Grid container spacing={4} alignItems='center'>
        <Grid size={{ xs: 12, md: 6 }}>
          <Typography variant='h6' component='p' paragraph>
            The OSG offers access points that serve as a researcher&rsquo;s home
            for their High Throughput Computing work. Researchers can place their
            workloads and data on the access point, which automates the execution
            of jobs and data movement across associated resources, like the{' '}
            <Link href='/services/ospool'>Open Science Pool (OSPool)</Link> and{' '}
            <Link href='/services/osdf'>Open Science Data Federation (OSDF)</Link>.
          </Typography>
          <Typography variant='h6' component='p' paragraph>
            Working with an access point requires no resources beyond your
            personal computer — it is your &ldquo;home&rdquo; on the nation&rsquo;s
            cyberinfrastructure, leading to our slogan of Submit Locally, Run
            Globally.
          </Typography>
          <Typography variant='h6' component='p'>
            Powered by the{' '}
            <Link href='https://htcondor.org'>HTCondor Software Suite (HTCSS)</Link>,
            access points can also be configured to support &ldquo;Bring Your Own
            Capacity&rdquo; (BYOC) — harnessing capacity from sources such as
            national facilities (e.g. XRAC allocations),{' '}
            <Link href='https://path-cc.io/facility/index.html'>
              PATh Facility credits
            </Link>
            , and commercial cloud resources.
          </Typography>
        </Grid>
        <Grid size={{ xs: 12, md: 6 }}>
          <Paper variant='outlined' sx={{ p: 2, bgcolor: 'grey.100' }}>
            <Box
              component='img'
              src='/images/Access-Point.svg'
              alt='Access Point diagram'
              sx={{ width: '100%', height: 'auto', display: 'block' }}
            />
          </Paper>
        </Grid>
      </Grid>

      <Grid container spacing={4} alignItems='center' sx={{ my: 4 }}>
        <Grid size={{ xs: 12, md: 6 }} sx={{ textAlign: 'center' }}>
          <Link href='https://portal.osg-htc.org/'>
            <Box
              component='img'
              src='/images/logos/OSG-Portal-Logo.png'
              alt='OSG Portal'
              sx={{ maxWidth: '100%', height: 'auto' }}
            />
          </Link>
        </Grid>
        <Grid size={{ xs: 12, md: 6 }}>
          <Typography variant='h4' component='h2' gutterBottom>
            Free for US Researchers
          </Typography>
          <Typography variant='h6' component='p' paragraph>
            OSG operated access points are available to any US-based research
            projects and collaborators via the{' '}
            <Link href='https://portal.osg-htc.org'>OSG Portal</Link>.
          </Typography>
          <Box
            sx={{
              textAlign: 'center',
              bgcolor: 'grey.900',
              color: 'common.white',
              borderRadius: 1,
              px: 3,
              py: 2,
              mb: 2,
            }}
          >
            <Typography component='p' sx={{ mb: 1 }}>
              See who is placing their workloads on our Access Points on our
            </Typography>
            <Button href='/services/ospool/projects' variant='contained' color='secondary'>
              Projects Page
            </Button>
          </Box>
          <Typography variant='h6' component='p' paragraph>
            Via an OSG-Operated Access Point, researchers have Fair-Share access
            to the capacity of the <Link href='/services/ospool'>OSPool</Link> and
            the <Link href='/services/osdf'>OSDF</Link>, with options for
            integrating with BYOC.
          </Typography>
          <Typography variant='h6' component='p'>
            <strong>Test-drive an access point today</strong> by signing up for an
            account on the{' '}
            <Link href='https://portal.osg-htc.org'>OSG Portal</Link>!
          </Typography>
        </Grid>
      </Grid>

      <Box sx={{ mt: 5 }}>
        <Typography variant='h4' component='h2' gutterBottom>
          Interested in Operating an Access Point?
        </Typography>
        <Typography variant='h6' component='p' paragraph>
          Most researchers are best served by using one of the access points we
          support.
        </Typography>
        <Typography variant='h6' component='p'>
          If you are an IT professional, and your organization wants to consider
          operating an access point for its community of researchers, our
          organization-specific{' '}
          <Link href='/organization/access-point'>Access Point</Link> page
          specifies how we can help!
        </Typography>
      </Box>

      <Paper
        variant='outlined'
        sx={{ mt: 5, p: 4, borderWidth: 2, borderColor: 'secondary.main' }}
      >
        <Typography variant='h4' component='h2' gutterBottom>
          Want to learn more about Access Points?
        </Typography>
        <ul>
          <li>
            <Link href='https://youtu.be/t2-bpkoeVZM?t=519'>
              Miron Livny in &ldquo;The PATh Forward&rdquo; at HTCondor Week 2022
            </Link>
          </li>
        </ul>
      </Paper>
    </Container>
  );
}
