import type { BadgeVariant } from "@/components/ui/Badge";
import type { CredentialStatus } from "@/types";

const statusLabelMap: Record<CredentialStatus, string> = {
  VALID: "Valid",
  INVALID: "Invalid",
  REVOKED: "Revoked",
  SUSPENDED: "Suspended",
  EXPIRED: "Expired",
  TAMPERED: "Tampered",
  SUSPICIOUS: "Suspicious",
  NOT_FOUND: "Not Found",
};

const statusBadgeVariantMap: Record<CredentialStatus, BadgeVariant> = {
  VALID: "success",
  INVALID: "danger",
  REVOKED: "danger",
  SUSPENDED: "warning",
  EXPIRED: "default",
  TAMPERED: "danger",
  SUSPICIOUS: "warning",
  NOT_FOUND: "default",
};

const statusTextClassMap: Record<CredentialStatus, string> = {
  VALID: "text-trust-600",
  INVALID: "text-danger-600",
  REVOKED: "text-danger-600",
  SUSPENDED: "text-warning-600",
  EXPIRED: "text-neutral-500",
  TAMPERED: "text-danger-600",
  SUSPICIOUS: "text-warning-600",
  NOT_FOUND: "text-neutral-500",
};

const statusBgTextClassMap: Record<CredentialStatus, string> = {
  VALID: "text-trust-600 bg-trust-50",
  INVALID: "text-danger-600 bg-danger-50",
  REVOKED: "text-danger-600 bg-danger-50",
  SUSPENDED: "text-warning-600 bg-warning-50",
  EXPIRED: "text-neutral-600 bg-neutral-100",
  TAMPERED: "text-danger-600 bg-danger-50",
  SUSPICIOUS: "text-warning-600 bg-warning-50",
  NOT_FOUND: "text-neutral-600 bg-neutral-100",
};

export function getStatusLabel(status: CredentialStatus): string {
  return statusLabelMap[status];
}

export function getStatusBadgeVariant(status: CredentialStatus): BadgeVariant {
  return statusBadgeVariantMap[status];
}

export function getStatusTextClass(status: CredentialStatus): string {
  return statusTextClassMap[status];
}

export function getStatusBgTextClass(status: CredentialStatus): string {
  return statusBgTextClassMap[status];
}

type IssuerStatus = "ACTIVE" | "REVOKED" | "SUSPENDED";

const issuerStatusBadgeVariantMap: Record<IssuerStatus, BadgeVariant> = {
  ACTIVE: "success",
  REVOKED: "danger",
  SUSPENDED: "warning",
};

export function getIssuerStatusBadgeVariant(status: IssuerStatus): BadgeVariant {
  return issuerStatusBadgeVariantMap[status];
}

type InstitutionStatus = "ACTIVE" | "SUSPENDED" | "PENDING";

const institutionStatusBadgeVariantMap: Record<InstitutionStatus, BadgeVariant> = {
  ACTIVE: "success",
  SUSPENDED: "danger",
  PENDING: "warning",
};

export function getInstitutionStatusBadgeVariant(
  status: InstitutionStatus,
): BadgeVariant {
  return institutionStatusBadgeVariantMap[status];
}
