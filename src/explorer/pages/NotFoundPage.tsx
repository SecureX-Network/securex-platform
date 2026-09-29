import { Link } from 'react-router-dom';
import { Compass } from 'lucide-react';
import { PageHeader } from '../components/ExplorerWidgets';
import { Card, EmptyState } from '../components/primitives';
import { explorerRoutes } from '../utils/format';

export default function NotFoundPage() {
  return (
    <>
      <PageHeader
        title="Page not found"
        crumbs={[{ label: 'Explorer', to: explorerRoutes.overview }, { label: '404' }]}
      />
      <Card padded={false}>
        <EmptyState
          icon={<Compass aria-hidden="true" className="h-6 w-6" />}
          title="That page is not part of the Explorer"
          description="The SecureX Blockchain Explorer is read-only and exposes only blocks, transactions, validators and network status."
          action={
            <Link
              to={explorerRoutes.overview}
              className="text-sm font-medium text-explorer-accent hover:text-blue-300"
            >
              Back to the explorer overview
            </Link>
          }
        />
      </Card>
    </>
  );
}
