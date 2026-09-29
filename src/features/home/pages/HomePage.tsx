import { useAuth } from '@/hooks/useAuth';
import { HolderHome } from '@/features/home/components/HolderHome';
import { InstitutionHome } from '@/features/home/components/InstitutionHome';
import { IssuerHome } from '@/features/home/components/IssuerHome';
import { EmployerHome } from '@/features/home/components/EmployerHome';
import { OperatorsHome } from '@/features/home/components/OperatorsHome';

export default function HomePage() {
  const { user } = useAuth();
  const role = user?.role ?? 'HOLDER';

  if (role === 'INSTITUTION') return <InstitutionHome />;
  if (role === 'ISSUER') return <IssuerHome />;
  if (role === 'EMPLOYER') return <EmployerHome />;
  if (role === 'ADMIN' || role === 'SECURITY_ADMIN' || role === 'NETWORK_ADMIN' || role === 'AUDITOR') {
    return <OperatorsHome />;
  }
  return <HolderHome />;
}