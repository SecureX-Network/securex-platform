import { useEffect } from 'react';
import { PageLoader } from './PageLoader';

export function ExternalRedirect({ to }: { to: string }) {
  useEffect(() => {
    window.location.replace(to);
  }, [to]);

  return <PageLoader label="Redirecting to SecureX website…" />;
}