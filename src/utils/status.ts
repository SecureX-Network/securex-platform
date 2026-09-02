import type { CredentialStatus } from "@/types";

const statusColorMap: Record<CredentialStatus, string> = {
  VALID: "bg-green-100 text-green-800 border-green-200",
  INVALID: "bg-red-100 text-red-800 border-red-200",
  REVOKED: "bg-red-100 text-red-800 border-red-200",
  SUSPENDED: "bg-amber-100 text-amber-800 border-amber-200",
  EXPIRED: "bg-gray-100 text-gray-800 border-gray-200",
  TAMPERED: "bg-red-100 text-red-800 border-red-200",
  SUSPICIOUS: "bg-yellow-100 text-yellow-800 border-yellow-200",
  NOT_FOUND: "bg-gray-100 text-gray-800 border-gray-200",
};

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

export function getStatusColor(status: CredentialStatus): string {
  return statusColorMap[status];
}

export function getStatusLabel(status: CredentialStatus): string {
  return statusLabelMap[status];
}
