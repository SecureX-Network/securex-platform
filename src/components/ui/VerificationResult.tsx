import type { ReactNode } from "react";
import {
  AlertTriangle,
  BadgeCheck,
  Ban,
  Fingerprint,
  Hash,
  ShieldAlert,
  ShieldCheck,
} from "lucide-react";
import type {
  CredentialStatus,
  VerificationResult as VerificationResultData,
} from "@/types";
import { classNames } from "@/utils";
import { formatDate, truncateHash } from "@/utils/format";
import { Badge } from "./Badge";
import { Card } from "./Card";
import { StatusIndicator } from "./StatusIndicator";

export interface VerificationResultProps {
  result: VerificationResultData;
  className?: string;
}

type RiskLevel = VerificationResultData["fraudCheck"]["riskLevel"];

const riskConfig: Record<
  RiskLevel,
  {
    label: string;
    badge: "success" | "warning" | "danger";
    text: string;
    bar: string;
  }
> = {
  LOW: {
    label: "Low risk",
    badge: "success",
    text: "text-trust-700",
    bar: "bg-trust-500",
  },
  MEDIUM: {
    label: "Medium risk",
    badge: "warning",
    text: "text-warning-700",
    bar: "bg-warning-500",
  },
  HIGH: {
    label: "High risk",
    badge: "danger",
    text: "text-danger-700",
    bar: "bg-danger-500",
  },
  CRITICAL: {
    label: "Critical risk",
    badge: "danger",
    text: "text-danger-700",
    bar: "bg-danger-600",
  },
};

function Detail({
  label,
  value,
  mono = false,
}: {
  label: string;
  value: ReactNode;
  mono?: boolean;
}) {
  return (
    <div className="min-w-0">
      <dt className="text-xs font-medium uppercase tracking-wide text-neutral-500">
        {label}
      </dt>
      <dd
        className={classNames(
          "mt-1 break-words text-sm text-neutral-800",
          mono && "font-mono text-xs text-neutral-600",
        )}
      >
        {value ?? "—"}
      </dd>
    </div>
  );
}

function statusSummaryIcon(status: CredentialStatus): ReactNode {
  switch (status) {
    case "VALID":
      return <ShieldCheck className="h-8 w-8 text-trust-500" />;
    case "INVALID":
    case "REVOKED":
    case "TAMPERED":
      return <ShieldAlert className="h-8 w-8 text-danger-500" />;
    case "SUSPENDED":
    case "SUSPICIOUS":
      return <AlertTriangle className="h-8 w-8 text-warning-500" />;
    case "EXPIRED":
    case "NOT_FOUND":
    default:
      return <Ban className="h-8 w-8 text-neutral-400" />;
  }
}

export function VerificationResult({ result, className }: VerificationResultProps) {
  const credential = result.credential;
  const risk = riskConfig[result.fraudCheck.riskLevel];
  const credentialId = credential?.credentialId ?? result.credentialId;
  const blockchainVerified = result.blockchainProof.verified;
  const signatureValid = result.signatureVerification.valid;

  return (
    <div className={classNames("space-y-5", className)}>
      <Card padding="lg">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-4">
            <div aria-hidden="true">{statusSummaryIcon(result.status)}</div>
            <div>
              <div className="text-lg font-semibold text-neutral-900">
                {result.status === "VALID" ? "Credential verified" : "Verification completed"}
              </div>
              <div className="mt-0.5 text-sm text-neutral-500">
                {credential?.title ?? "Credential"} {credentialId && <span className="font-mono text-xs">({credentialId})</span>}
              </div>
              <div className="mt-2">
                <StatusIndicator status={result.status} size="md" />
              </div>
            </div>
          </div>
          <div className="shrink-0 text-left text-xs text-neutral-500 sm:text-right">
            <div>
              Verified{" "}
              <span className="font-medium text-neutral-700">
                {formatDate(result.verifiedAt)}
              </span>
            </div>
            {result.verifiedBy && (
              <div className="mt-0.5">By {result.verifiedBy}</div>
            )}
          </div>
        </div>
      </Card>

      <Card
        title="Credential details"
        headerClassName="px-5"
        bodyClassName="pt-4"
      >
        <dl className="grid grid-cols-1 gap-x-6 gap-y-3 sm:grid-cols-2">
          <Detail label="Credential ID" value={credential?.credentialId ?? result.credentialId} mono />
          <Detail label="Credential type" value={credential?.type} />
          <Detail label="Holder" value={credential?.holderName} />
          <Detail label="Issuer" value={credential?.issuerName ?? result.issuer.name} />
          <Detail label="Institution" value={credential?.institutionName} />
          <Detail label="Issued" value={formatDate(credential?.issuedAt)} />
          <Detail label="Expires" value={formatDate(credential?.expiresAt)} />
          {credential?.metadata && (
            <Detail
              label="Metadata"
              value={Object.entries(credential.metadata)
                .map(([key, value]) => `${key}: ${value}`)
                .join(", ")}
            />
          )}
        </dl>
      </Card>

      <Card title="Blockchain proof" bodyClassName="pt-4">
        <div className="mb-4 flex items-center gap-2">
          <Badge
            variant={blockchainVerified ? "success" : "danger"}
            icon={
              blockchainVerified ? (
                <BadgeCheck aria-hidden="true" className="h-3.5 w-3.5" />
              ) : (
                <ShieldAlert aria-hidden="true" className="h-3.5 w-3.5" />
              )
            }
          >
            {blockchainVerified ? "On-chain verified" : "Not verified on-chain"}
          </Badge>
        </div>
        <dl className="grid grid-cols-1 gap-x-6 gap-y-3 sm:grid-cols-2">
          <Detail
            label="Transaction hash"
            value={truncateHash(result.blockchainProof.txHash, 14, 10)}
            mono
          />
          <Detail label="Block height" value={result.blockchainProof.blockHeight ?? "—"} mono />
          <Detail label="Confirmations" value={result.blockchainProof.confirmations ?? "—"} />
          <Detail label="Timestamp" value={formatDate(result.blockchainProof.timestamp)} />
          <Detail label="Merkle root" value={truncateHash(credential?.merkleRoot, 12, 8)} mono />
        </dl>
      </Card>

      <Card title="Digital signature" bodyClassName="pt-4">
        <div className="mb-4 flex items-center gap-2">
          <Badge
            variant={signatureValid ? "success" : "danger"}
            icon={
              signatureValid ? (
                <Fingerprint aria-hidden="true" className="h-3.5 w-3.5" />
              ) : (
                <ShieldAlert aria-hidden="true" className="h-3.5 w-3.5" />
              )
            }
          >
            {signatureValid ? "Signature valid" : "Signature invalid"}
          </Badge>
        </div>
        <dl className="grid grid-cols-1 gap-x-6 gap-y-3 sm:grid-cols-2">
          <Detail label="Algorithm" value={result.signatureVerification.algorithm ?? "—"} mono />
          <Detail label="Verified at" value={formatDate(result.signatureVerification.verifiedAt)} />
          <Detail
            label="Issuer public key"
            value={truncateHash(result.issuer.publicKey, 14, 10)}
            mono
          />
          <Detail label="Issuer status" value={result.issuer.verified ? "Verified" : "Unverified"} />
        </dl>
      </Card>

      <Card title="Fraud assessment" bodyClassName="pt-4">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div>
            <dt className="text-xs font-medium uppercase tracking-wide text-neutral-500">
              Risk level
            </dt>
            <dd className={classNames("mt-2 text-base font-semibold", risk.text)}>
              {risk.label}
            </dd>
            <div className="mt-2 flex items-center gap-2">
              <div className="h-1.5 w-full overflow-hidden rounded-full bg-neutral-100">
                <div
                  className={classNames("h-full rounded-full", risk.bar)}
                  style={{
                    width: `${Math.min(100, Math.max(0, result.fraudCheck.score))}%`,
                  }}
                />
              </div>
              <span className="shrink-0 text-xs font-medium text-neutral-500">
                {Math.min(100, Math.max(0, result.fraudCheck.score))}
              </span>
            </div>
          </div>
          <div className="sm:col-span-2">
            <dt className="text-xs font-medium uppercase tracking-wide text-neutral-500">
              Flags
            </dt>
            <dd>
              {result.fraudCheck.flags.length === 0 ? (
                <p className="mt-2 text-sm text-trust-700">
                  No suspicious indicators detected.
                </p>
              ) : (
                <ul className="mt-2 space-y-1.5">
                  {result.fraudCheck.flags.map((flag) => (
                    <li
                      key={flag}
                      className="flex items-start gap-2 text-sm text-neutral-700"
                    >
                      <AlertTriangle
                        aria-hidden="true"
                        className="mt-0.5 h-4 w-4 shrink-0 text-warning-500"
                      />
                      {flag}
                    </li>
                  ))}
                </ul>
              )}
            </dd>
          </div>
        </div>
        {credential?.blockchainTxHash && (
          <div className="mt-4 flex items-center gap-1.5 border-t border-neutral-100 pt-3 text-xs text-neutral-400">
            <Hash aria-hidden="true" className="h-3.5 w-3.5" />
            Stored reference tx:{" "}
            <span className="font-mono">{truncateHash(credential.blockchainTxHash, 10, 8)}</span>
          </div>
        )}
      </Card>
    </div>
  );
}

export default VerificationResult;