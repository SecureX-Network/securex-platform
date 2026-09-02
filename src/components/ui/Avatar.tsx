import type { ReactNode } from "react";
import { classNames } from "@/utils";

export type AvatarSize = "sm" | "md" | "lg" | "xl";
export type AvatarStatus = "online" | "offline" | "away";

export interface AvatarProps {
  src?: string;
  alt?: string;
  size?: AvatarSize;
  fallback?: ReactNode;
  name?: string;
  status?: AvatarStatus;
  statusTitle?: string;
  className?: string;
}

const sizeClasses: Record<AvatarSize, { wrapper: string; text: string }> = {
  sm: { wrapper: "h-8 w-8", text: "text-xs" },
  md: { wrapper: "h-10 w-10", text: "text-sm" },
  lg: { wrapper: "h-12 w-12", text: "text-base" },
  xl: { wrapper: "h-16 w-16", text: "text-xl" },
};

const statusSizeClasses: Record<AvatarSize, string> = {
  sm: "h-2 w-2",
  md: "h-2.5 w-2.5",
  lg: "h-3 w-3",
  xl: "h-3.5 w-3.5",
};

const statusColorClasses: Record<AvatarStatus, string> = {
  online: "bg-trust-500 ring-white",
  offline: "bg-neutral-300 ring-white",
  away: "bg-warning-500 ring-white",
};

const statusLabel: Record<AvatarStatus, string> = {
  online: "Online",
  offline: "Offline",
  away: "Away",
};

function initialsFromName(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");
}

function colorFromName(name: string): string {
  if (!name) return "bg-securex-100 text-securex-800";
  let hash = 0;
  for (let i = 0; i < name.length; i += 1) {
    hash = (hash * 31 + name.charCodeAt(i)) % 997;
  }
  const palette = [
    "bg-securex-100 text-securex-800",
    "bg-trust-100 text-trust-800",
    "bg-warning-100 text-warning-800",
    "bg-purple-100 text-purple-800",
    "bg-neutral-200 text-neutral-800",
  ];
  return palette[hash % palette.length] ?? palette[0] ?? "";
}

export function Avatar({
  src,
  alt = "",
  size = "md",
  fallback,
  name,
  status,
  statusTitle,
  className,
}: AvatarProps) {
  const initials = fallback ?? (name ? initialsFromName(name) : alt);
  const showStatus = status !== undefined;

  return (
    <span
      className={classNames(
        "relative inline-flex shrink-0 align-middle",
        sizeClasses[size].wrapper,
        className,
      )}
    >
      {src ? (
        <img
          src={src}
          alt={alt}
          className="h-full w-full rounded-full object-cover ring-1 ring-neutral-200"
        />
      ) : (
        <span
          className={classNames(
            "flex h-full w-full select-none items-center justify-center rounded-full font-semibold",
            sizeClasses[size].text,
            name ? colorFromName(name) : "bg-neutral-100 text-neutral-500",
          )}
        >
          {initials || (
            <span
              aria-hidden="true"
              className="block h-1/2 w-1/2 rounded-full bg-neutral-300"
            />
          )}
        </span>
      )}
      {showStatus && (
        <span
          title={statusTitle ?? statusLabel[status]}
          aria-label={statusTitle ?? statusLabel[status]}
          role="status"
          className={classNames(
            "absolute bottom-0 right-0 block rounded-full ring-2",
            statusSizeClasses[size],
            statusColorClasses[status],
          )}
        />
      )}
    </span>
  );
}

export default Avatar;