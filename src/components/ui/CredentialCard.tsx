import type { KeyboardEvent, ReactNode } from "react";
import {
  Award,
  BadgeCheck,
  Calendar,
  ChevronRight,
  Clock,
  FileText,
  GraduationCap,
  Landmark,
  ShieldCheck,
  Stamp,
} from "lucide-react";
import type { CredentialStatus } from "@/types";
import { classNames } from "@/utils";
import { formatDate } from "@/utils/format";
import { StatusIndicator } from "./StatusIndicator";
import { Card } from "./Card";

export interface CredentialCardProps {
  title: string;
  credentialType: string;
  issuer?: string;
  issuerVerified?: boolean;
  status?: CredentialStatus;
  issuedAt?: string;
  expiresAt?: string;
  credentialId?: string;
  icon?: ReactNode;
  onClick?: () => void;
  className?: string;
}

const typeIconMap: Record<string, ReactNode> = {
  degree: <GraduationCap aria-hidden="true" className="h-6 w-6" />,
  diploma: <GraduationCap aria-hidden="true" className="h-6 w-6" />,
  certificate: <Award aria-hidden="true" className="h-6 w-6" />,
  transcript: <FileText aria-hidden="true" className="h-6 w-6" />,
  license: <Stamp aria-hidden="true" className="h-6 w-6" />,
  registration: <Landmark aria-hidden="true" className="h-6 w-6" />,
};

function credentialTypeIcon(credentialType: string): ReactNode {
  const normalized = credentialType.toLowerCase();
  for (const key of Object.keys(typeIconMap)) {
    if (normalized.includes(key)) {
      return typeIconMap[key];
    }
  }
  return <BadgeCheck aria-hidden="true" className="h-6 w-6" />;
}

const statusTileColors: Record<CredentialStatus, string> = {
  VALID: "bg-securex-50 text-securex-600 ring-securex-100",
  INVALID: "bg-danger-50 text-danger-600 ring-danger-100",
  REVOKED: "bg-danger-50 text-danger-600 ring-danger-100",
  SUSPENDED: "bg-warning-50 text-warning-600 ring-warning-100",
  EXPIRED: "bg-neutral-100 text-neutral-500 ring-neutral-200",
  TAMPERED: "bg-danger-50 text-danger-600 ring-danger-100",
  SUSPICIOUS: "bg-warning-50 text-warning-600 ring-warning-100",
  NOT_FOUND: "bg-neutral-100 text-neutral-500 ring-neutral-200",
};

export function CredentialCard({
  title,
  credentialType,
  issuer,
  issuerVerified = false,
  status = "VALID",
  issuedAt,
  expiresAt,
  credentialId,
  icon,
  onClick,
  className,
}: CredentialCardProps) {
  const interactive = onClick !== undefined;

  const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (!interactive) return;
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      onClick?.();
    }
  };

  return (
    <Card
      role={interactive ? "button" : undefined}
      tabIndex={interactive ? 0 : undefined}
      aria-label={interactive ? `View ${title} credential` : undefined}
      onClick={interactive ? onClick : undefined}
      onKeyDown={handleKeyDown}
      padding="none"
      className={classNames(
        "group overflow-hidden p-4 sm:p-5",
        interactive &&
          "transition-all hover:-translate-y-0.5 hover:border-securex-200 hover:shadow-securex-lg focus-visible:ring-2 focus-visible:ring-securex-500 focus-visible:outline-none",
        className,
      )}
    >
      <div className="flex items-center gap-3.5 sm:gap-4">
        <div
          className={classNames(
            "flex h-12 w-12 shrink-0 items-center justify-center rounded-xl ring-1 sm:h-14 sm:w-14",
            statusTileColors[status],
          )}
        >
          {icon ?? credentialTypeIcon(credentialType)}
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <h3 className="truncate text-sm font-semibold text-neutral-900 sm:text-base">
                {title}
              </h3>
              <div className="mt-0.5 flex items-center gap-1.5 text-xs text-neutral-500">
                <span className="truncate">{credentialType}</span>
                {issuer && (
                  <>
                    <span aria-hidden="true" className="text-neutral-300">
                      •
                    </span>
                    <span className="inline-flex min-w-0 items-center gap-1 truncate">
                      {issuerVerified && (
                        <ShieldCheck
                          aria-hidden="true"
                          className="h-3.5 w-3.5 shrink-0 text-trust-500"
                        />
                      )}
                      <span className="truncate">{issuer}</span>
                    </span>
                  </>
                )}
              </div>
            </div>
            <div className="flex shrink-0 items-center gap-1">
              <StatusIndicator status={status} size="sm" />
              {interactive && (
                <ChevronRight
                  aria-hidden="true"
                  className="h-4 w-4 text-neutral-300 transition-transform group-hover:translate-x-0.5 group-hover:text-neutral-400"
                />
              )}
            </div>
          </div>

          <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs text-neutral-500 sm:mt-2.5">
            {issuedAt && (
              <span className="inline-flex items-center gap-1.5">
                <Calendar aria-hidden="true" className="h-3.5 w-3.5 text-neutral-400" />
                Issued {formatDate(issuedAt)}
              </span>
            )}
            {expiresAt && (
              <span className="inline-flex items-center gap-1.5">
                <Clock aria-hidden="true" className="h-3.5 w-3.5 text-neutral-400" />
                {new Date(expiresAt).getTime() < Date.now()
                  ? "Expired"
                  : "Expires"}{" "}
                {formatDate(expiresAt)}
              </span>
            )}
            {credentialId && (
              <span className="inline-flex items-center gap-1.5 truncate font-mono text-[11px] text-neutral-400">
                ID {credentialId}
              </span>
            )}
          </div>
        </div>
      </div>
    </Card>
  );
}

export default CredentialCard;