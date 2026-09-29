import { useCallback, useEffect, useMemo, useState } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import {
  Copy,
  Info,
  Link2,
  Mail,
  QrCode,
  ShieldCheck,
} from 'lucide-react';
import {
  Alert,
  Badge,
  Button,
  Card,
  EmptyState,
  Select,
  Spinner,
} from '@/components/ui';
import { useAuth } from '@/hooks/useAuth';
import { getHolderCredentialsView, getRealQrReference } from '@/features/holder-admin/services/holderAdminService';
import type { Credential } from '@/types';
import { formatDate } from '@/utils';

interface ShareRecord {
  id: string;
  credentialTitle: string;
  method: 'link' | 'email';
  createdAt: string;
}

export default function HolderSharePage() {
  const { user } = useAuth();
  const holderId = user?.id ?? 'usr-holder-001';

  const [credentials, setCredentials] = useState<Credential[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedId, setSelectedId] = useState('');
  const [generatedLink, setGeneratedLink] = useState<string | null>(null);
  const [recentShares, setRecentShares] = useState<ShareRecord[]>([]);
  const [qrPayload, setQrPayload] = useState<string | null>(null);
  const [verifyUrl, setVerifyUrl] = useState<string | null>(null);

  const loadCredentials = useCallback(async () => {
    setLoading(true);
    try {
      const data = await getHolderCredentialsView(holderId);
      setCredentials(data.filter((c) => c.status === 'VALID'));
      if (data.length > 0) {
        const valid = data.find((c) => c.status === 'VALID');
        if (valid) setSelectedId(valid.id);
      }
    } catch {
      setCredentials([]);
    } finally {
      setLoading(false);
    }
  }, [holderId]);

  useEffect(() => {
    void loadCredentials();
  }, [loadCredentials]);

  useEffect(() => {
    setGeneratedLink(null);
  }, [selectedId]);

  const selectedCredential = useMemo(
    () => credentials.find((c) => c.id === selectedId),
    [credentials, selectedId],
  );

  useEffect(() => {
    let active = true;
    if (!selectedCredential) {
      setQrPayload(null);
      setVerifyUrl(null);
      return;
    }
    setQrPayload(null);
    setVerifyUrl(null);
    getRealQrReference(selectedCredential.credentialId)
      .then((ref) => {
        if (!active) return;
        // `qrContent` is the opaque SXQR1 payload the SecureX scanner accepts;
        // `verificationUrl` is the human-readable page. They are NOT
        // interchangeable — encoding the URL into the QR makes the scanner
        // reject it.
        setQrPayload(ref.qrContent);
        setVerifyUrl(ref.verificationUrl);
      })
      .catch(() => {
        if (!active) return;
        setQrPayload(null);
        setVerifyUrl(null);
      });
    return () => {
      active = false;
    };
  }, [selectedCredential]);

  const credentialOptions = useMemo(
    () =>
      credentials.map((c) => ({
        label: c.title,
        value: c.id,
      })),
    [credentials],
  );

  const generateLink = () => {
    if (!selectedCredential) return;
    const link =
      verifyUrl ??
      `${window.location.origin}/verify/${encodeURIComponent(selectedCredential.credentialId)}`;
    setGeneratedLink(link);
    setRecentShares((prev) => [
      {
        id: `share-${Date.now()}`,
        credentialTitle: selectedCredential.title,
        method: 'link',
        createdAt: new Date().toISOString(),
      },
      ...prev.slice(0, 4),
    ]);
  };

  const shareViaEmail = () => {
    if (!selectedCredential) return;
    const subject = encodeURIComponent(
      `Credential: ${selectedCredential.title}`,
    );
    const link =
      verifyUrl ??
      `${window.location.origin}/verify/${encodeURIComponent(selectedCredential.credentialId)}`;
    const body = encodeURIComponent(
      `Here is a secure verification link for my credential "${selectedCredential.title}":\n\n${link}`,
    );
    setRecentShares((prev) => [
      {
        id: `share-${Date.now()}`,
        credentialTitle: selectedCredential.title,
        method: 'email',
        createdAt: new Date().toISOString(),
      },
      ...prev.slice(0, 4),
    ]);
    window.location.href = `mailto:?subject=${subject}&body=${body}`;
  };

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <Spinner size="lg" color="#7c3aed" label="Loading credentials" />
      </div>
    );
  }

  if (credentials.length === 0) {
    return (
      <div className="space-y-4">
        <h1 className="text-xl font-bold text-neutral-900">Share a Credential</h1>
        <EmptyState
          title="No credentials to share"
          description="You need at least one active credential in your wallet before you can share it."
        />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <section>
        <h1 className="text-xl font-bold text-neutral-900">Share a Credential</h1>
        <p className="mt-0.5 text-sm text-neutral-500">
          Generate a secure verification link or display a QR code for a
          verifier.
        </p>
      </section>

      <Card>
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-neutral-400">
          1. Choose a credential
        </h2>
        <Select
          label="Credential"
          value={selectedId}
          onChange={(event) => setSelectedId(event.target.value)}
          options={credentialOptions}
        />
        {selectedCredential && (
          <div className="mt-3 flex items-center justify-between rounded-lg bg-neutral-50 p-3">
            <div className="min-w-0">
              <p className="truncate text-sm font-medium text-neutral-800">
                {selectedCredential.title}
              </p>
              <p className="text-xs text-neutral-500">
                {selectedCredential.institutionName}
              </p>
            </div>
            <Badge variant="success">{selectedCredential.status}</Badge>
          </div>
        )}
      </Card>

      <Card>
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-neutral-400">
          2. Verification QR code
        </h2>
        <div className="flex flex-col items-center gap-3 rounded-xl bg-neutral-50 p-5">
          <div className="flex h-44 w-44 items-center justify-center rounded-lg border border-neutral-200 bg-white p-2">
            {qrPayload ? (
              <QRCodeSVG value={qrPayload} size={152} level="M" includeMargin={false} />
            ) : (
              <span className="text-center">
                <QrCode className="mx-auto h-9 w-9 text-neutral-400" />
                <span className="mt-1 block text-[11px] text-neutral-400">
                  Preparing QR…
                </span>
              </span>
            )}
          </div>
          <p className="text-center text-xs text-neutral-500">
            Display this QR code for a verifier to scan in the SecureX verifier.
          </p>
        </div>
        <p className="mt-3 flex items-start gap-1.5 text-xs text-neutral-500">
          <Info className="mt-0.5 h-3.5 w-3.5 shrink-0 text-neutral-400" />
          The QR encodes an opaque SecureX payload, not a readable link — the
          credential ID stays hidden in the image. The SecureX scanner only accepts
          this payload format, so it cannot be replaced by a plain URL.
        </p>
      </Card>

      <Card>
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-neutral-400">
          3. Share options
        </h2>
        <div className="grid gap-3 sm:grid-cols-2">
          <Button
            leftIcon={<Link2 className="h-4 w-4" />}
            onClick={generateLink}
          >
            Generate link
          </Button>
          <Button
            variant="outline"
            leftIcon={<Mail className="h-4 w-4" />}
            onClick={shareViaEmail}
          >
            Share via email
          </Button>
        </div>

        {generatedLink && (
          <div className="mt-4 rounded-lg border border-securex-200 bg-securex-50 p-4">
            <p className="mb-2 flex items-center gap-1.5 text-xs font-medium uppercase tracking-wider text-securex-700">
              <Link2 className="h-3.5 w-3.5" /> Secure share link
            </p>
            <p className="mb-3 break-all rounded-md bg-white p-3 text-xs font-mono text-neutral-700">
              {generatedLink}
            </p>
            <Button
              variant="outline"
              size="sm"
              leftIcon={<Copy className="h-3.5 w-3.5" />}
              onClick={() => {
                void navigator.clipboard.writeText(generatedLink);
              }}
            >
              Copy link
            </Button>
          </div>
        )}

        {generatedLink && (
          <div className="mt-4 flex items-start gap-1.5 text-xs text-neutral-500">
            <ShieldCheck className="mt-0.5 h-3.5 w-3.5 shrink-0 text-neutral-400" />
            Anyone with this link can view the credential's public details and
            current status. It does not expire and cannot be revoked — revoke the
            credential itself if you need to stop it being accepted.
          </div>
        )}
      </Card>

      <Alert
        variant="info"
        title="Before you share"
        description="A verification link reveals this credential's public details and status to anyone who has it. It carries no private data and no secret of yours — treat it as public information, and revoke the credential if it should no longer be accepted."
        icon={<ShieldCheck className="h-5 w-5" />}
      />

      <Card>
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-neutral-400">
          Recent shares
        </h2>
        {recentShares.length === 0 ? (
          <p className="py-4 text-center text-sm text-neutral-400">
            You haven’t shared any credentials yet.
          </p>
        ) : (
          <ul className="divide-y divide-neutral-100">
            {recentShares.map((share) => (
              <li
                key={share.id}
                className="flex items-center justify-between gap-3 py-3"
              >
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-neutral-800">
                    {share.credentialTitle}
                  </p>
                  <p className="text-xs text-neutral-500">
                    {share.method === 'email' ? 'Via email' : 'Share link'} ·{' '}
                    {formatDate(share.createdAt)}
                  </p>
                </div>
                <Badge variant={share.method === 'email' ? 'info' : 'success'}>
                  {share.method === 'email' ? 'Email' : 'Link'}
                </Badge>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}
