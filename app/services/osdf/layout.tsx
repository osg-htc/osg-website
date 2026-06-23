import {
  AccountTree,
  FolderOpen,
  HomeRounded,
  Person,
  Storage,
  YouTube,
} from '@mui/icons-material';
import { ServiceNav } from '@/components/services/ServiceNav';
import styles from '../../page.module.css';

const OSDF_LINKS = [
  { label: 'Overview', href: '/services/osdf', icon: <HomeRounded /> },
  { label: 'Projects', href: '/services/osdf/projects', icon: <Person /> },
  { label: 'Data', href: '/services/osdf/data', icon: <FolderOpen /> },
  {
    label: 'AlphaFold3 Cache',
    href: '/services/osdf/alphafold',
    icon: <AccountTree />,
  },
  {
    label: 'Training',
    href: 'https://www.youtube.com/watch?v=KFg5ApsIGN8',
    icon: <YouTube />,
  },
];

export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <main className={styles.pages}>
      <ServiceNav title='OSDF' icon={<Storage />} links={OSDF_LINKS} />
      {children}
    </main>
  );
}
