import type { Metadata } from 'next';
import Link from 'next/link';
import {
  Accordion,
  AccordionDetails,
  AccordionSummary,
  Box,
  Button,
  Container,
  Paper,
  Typography,
} from '@mui/material';
import { ExpandMore } from '@mui/icons-material';
import { FacilityExplorer } from '@/components/FacilityExplorer';
import ccStar from '@/utils/cc-star.json';

export const metadata: Metadata = {
  title:
    'OSG’s Support for Campus Cyberinfrastructure Proposals and Awardees — OSG Consortium',
  description:
    'How the PATh team and OSG support NSF Campus Cyberinfrastructure (CC*) proposals and awardees.',
};

const SOLICITATION =
  'https://new.nsf.gov/funding/opportunities/campus-cyberinfrastructure-cc/nsf24-530/solicitation';

export default function Page() {
  return (
    <Container maxWidth='md' sx={{ py: 5 }}>
      <Typography variant='h2' component='h1' gutterBottom>
        OSG’s Support for Campus Cyberinfrastructure Proposals and Awardees
      </Typography>

      <Paper elevation={2} sx={{ p: 3, my: 4 }}>
        <Typography variant='h5' component='h2' textAlign='center' gutterBottom>
          We are here to help with your{' '}
          <Link href={SOLICITATION}>CC* Proposal (NSF 24-530)!</Link>
        </Typography>
        <Typography textAlign='center'>
          Campuses with awards from the{' '}
          <Link href='https://www.nsf.gov/funding/pgm_summ.jsp?pims_id=504748'>
            NSF Campus Cyberinfrastructure (CC*)
          </Link>{' '}
          Program play an important role in supporting Open Science. CC* campuses
          contribute to the processing and storage capacity of the{' '}
          <Link href='/services/ospool'>Open Science Pool (OSPool)</Link> that is
          harnessed weekly by more than 3M jobs.
        </Typography>
        <Box sx={{ display: 'flex', justifyContent: 'center', gap: 1, mt: 3 }}>
          <Button href='mailto:cc-star-proposals@osg-htc.org' variant='contained' color='secondary'>
            Email Us
          </Button>
          <Button href='#how-we-can-help' variant='outlined' color='secondary'>
            How We Can Help
          </Button>
        </Box>
      </Paper>

      <Typography paragraph>
        Enhancing the capacity of Research Computing of US campuses through local
        deployment and cross-campus sharing is fully aligned with the vision of
        our NSF-funded project —{' '}
        <Link href='https://path-cc.io'>
          Partnership to Advance Throughput Computing (PATh)
        </Link>
        . Our project is committed to support CC* projects from proposal, through
        deployment, to operation.
      </Typography>

      <Typography variant='h4' component='h2' gutterBottom mt={4}>
        <Link href={SOLICITATION}>Proposal</Link>
      </Typography>
      <Paper variant='outlined' sx={{ p: 3, bgcolor: 'grey.100', my: 2 }}>
        <Typography paragraph>
          Please contact us at{' '}
          <Link href='mailto:cc-star-proposals@osg-htc.org'>cc-star-proposals@osg-htc.org</Link>{' '}
          (the earlier the better!) with any questions or requests regarding the
          involvement of <Link href='https://path-cc.io'>PATh</Link> in your
          proposed project. The NSF 24-530 solicitation explicitly mentions the
          OSG services we provide as a means to meet requirements for:
        </Typography>
        <Typography fontWeight='bold'>
          (2) Computing and the Computing Continuum for the Campus or Region
        </Typography>
        <Typography paragraph>
          All Area (2) proposals should commit to a minimum of 20% shared time.
          NSF strongly encourages joining the PATh campus federation and adopting
          an appropriate subset of PATh services to make the resource available on
          a national scale.
        </Typography>
        <Typography fontWeight='bold'>
          (4) Data Storage and Digital Archives for the Campus or Region
        </Typography>
        <Typography>
          All Area (4) proposals are required to have interoperability with a
          national and federated data sharing fabric such as PATh/OSDF. At least
          20% of the storage should be made available as part of the chosen
          federated data sharing fabric.
        </Typography>
      </Paper>

      <Typography variant='h4' component='h2' gutterBottom mt={4} id='how-we-can-help'>
        Let the PATh team help with your proposal
      </Typography>
      <Typography paragraph>
        The NSF Campus Cyberinfrastructure (CC*) program invests in coordinated
        campus and regional-level cyberinfrastructure improvements and innovation.{' '}
        <Link href='https://path-cc.io'>PATh</Link> has experience offering
        consulting to CC* projects during the proposal phase for:
      </Typography>
      <ul>
        <li>
          Sharing data with authorized users via the{' '}
          <Link href='/services/osdf'>Open Science Data Federation (OSDF)</Link>
        </li>
        <li>
          Bringing the power of high throughput computing via the{' '}
          <Link href='/services/ospool'>OSPool</Link> to your researchers
        </li>
        <li>Meeting CC*-required resource sharing, and other options for integrating with the OSG Consortium</li>
        <li>Providing connections to help with data storage systems for shared resources</li>
        <li>Building regional computing networks and developing science gateways</li>
      </ul>

      <Typography variant='h5' component='h3' gutterBottom mt={3} id='deployment'>
        Deployment
      </Typography>
      <Typography paragraph>
        Our experienced and friendly team of engineers and facilitators is
        dedicated to supporting system engineers and campus research groups,
        providing networking, computing and data storage consulting in support of
        proposals. Post-award, these teams continue their support to ensure smooth
        integration and onboarding into the OSPool or OSDF. Contact us at{' '}
        <Link href='mailto:help@osg-htc.org'>help@osg-htc.org</Link> to schedule a
        consultation.
      </Typography>

      <Typography variant='h5' component='h3' gutterBottom mt={3} id='operation'>
        Operation
      </Typography>
      <Typography paragraph>
        After your campus has integrated with the OSPool or OSDF, our team offers
        continued support to make the best use of computational resources at your
        campus, including troubleshooting and accounting data. Our CC* liaison
        meets with you periodically. If you or your researchers have any questions,
        contact us at <Link href='mailto:support@osg-htc.org'>support@osg-htc.org</Link>.
      </Typography>

      <Box sx={{ my: 3 }}>
        <iframe
          title='CC* facility map'
          width='100%'
          height='500'
          frameBorder='0'
          src='https://map.osg-htc.org/map/iframe?view=CCStar#38.61687,-97.86621|4|hybrid'
          style={{ border: 'none' }}
        />
      </Box>

      <Accordion>
        <AccordionSummary expandIcon={<ExpandMore />}>
          <Typography fontWeight='bold'>CC* Institutional Contributions</Typography>
        </AccordionSummary>
        <AccordionDetails sx={{ p: 0 }}>
          <FacilityExplorer ccStarOnly />
        </AccordionDetails>
      </Accordion>
      <Accordion>
        <AccordionSummary expandIcon={<ExpandMore />}>
          <Typography fontWeight='bold'>All CC* Institutions</Typography>
        </AccordionSummary>
        <AccordionDetails>
          <ul>
            {ccStar.map((site) => (
              <li key={site.name}>
                {site.href ? <Link href={site.href}>{site.name}</Link> : site.name}
              </li>
            ))}
          </ul>
        </AccordionDetails>
      </Accordion>

      <Typography variant='h4' component='h2' gutterBottom mt={4}>
        CC* Campus impact on Open Science
      </Typography>
      <Typography paragraph>
        The OSG Consortium has been working with CC* campuses pre- and post-award
        for several years. These campuses have made significant contributions in
        support of science, both on their own campus and for the entire country.
      </Typography>
      <Typography variant='h5' component='h3' gutterBottom>
        Computing
      </Typography>
      <Typography paragraph>
        Campuses contribute core hours to researchers via the{' '}
        <Link href='/services/ospool'>OSPool</Link>, a compute resource accessible
        to any researcher affiliated with a US academic institution. These
        contributions support more than 230 research groups, campuses, multi-campus
        collaborations, and gateways, in fields ranging from medicine to economics,
        and from genomics to physics.
      </Typography>
      <Typography variant='h5' component='h3' gutterBottom>
        Data Storage
      </Typography>
      <Typography>
        The <Link href='/services/osdf'>Open Science Data Federation</Link>{' '}
        integrates data origins, making data accessible via caches, many of which
        are strategically located in the R&amp;E network backbone. The CC*
        solicitation of 2024 (NSF 24-530) requires interoperability with a
        national and federated data sharing fabric such as PATh/OSDF.
      </Typography>
    </Container>
  );
}
