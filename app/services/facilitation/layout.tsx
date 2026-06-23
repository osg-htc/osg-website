import {
  Description,
  HomeRounded,
  MenuBook,
  PersonSearch,
} from '@mui/icons-material';
import { ServiceNav } from '@/components/services/ServiceNav';
import styles from '../../page.module.css';

const FACILITATION_LINKS = [
  { label: 'The Team', href: '/services/facilitation', icon: <HomeRounded /> },
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
      <ServiceNav
        title='Facilitation'
        icon={<PersonSearch />}
        links={FACILITATION_LINKS}
      />
      {children}
    </main>
  );
}
