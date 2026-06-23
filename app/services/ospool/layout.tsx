import {
  Apartment,
  Description,
  HomeRounded,
  MenuBook,
  Memory,
  Person,
} from '@mui/icons-material';
import { ServiceNav } from '@/components/services/ServiceNav';
import styles from '../../page.module.css';

const OSPOOL_LINKS = [
  { label: 'Overview', href: '/services/ospool', icon: <HomeRounded /> },
  { label: 'Projects', href: '/services/ospool/projects', icon: <Person /> },
  {
    label: 'Institutions',
    href: '/services/ospool/institutions',
    icon: <Apartment />,
  },
  {
    label: 'Documentation',
    href: 'https://portal.osg-htc.org/documentation/',
    icon: <Description />,
  },
  {
    label: 'Training',
    href: '/services/facilitation/monthly-training',
    icon: <MenuBook />,
  },
];

export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <main className={styles.pages}>
      <ServiceNav title='OSPool' icon={<Memory />} links={OSPOOL_LINKS} />
      {children}
    </main>
  );
}
