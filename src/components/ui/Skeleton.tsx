import type { HTMLAttributes, CSSProperties } from "react";
import { classNames } from "@/utils";

export type SkeletonVariant = "text" | "circular" | "rectangular";

export interface SkeletonProps extends HTMLAttributes<HTMLDivElement> {
  width?: number | string;
  height?: number | string;
  variant?: SkeletonVariant;
  animation?: "pulse" | "shimmer" | "none";
  circle?: boolean;
}

export function Skeleton({
  width,
  height,
  variant = "text",
  animation = "pulse",
  circle = false,
  className,
  style,
  ...rest
}: SkeletonProps) {
  const sizeStyle: CSSProperties = {
    width: width ?? (variant === "text" ? "100%" : undefined),
    height,
    ...style,
  };

  return (
    <div
      role="status"
      aria-label="Loading"
      className={classNames(
        "bg-neutral-200",
        circle || variant === "circular" ? "rounded-full" : variant === "text" ? "rounded" : "rounded-lg",
        animation === "shimmer" &&
          "securex-shimmer relative overflow-hidden",
        animation === "pulse" && "animate-pulse",
        variant === "circular" && "aspect-square",
        className,
      )}
      style={sizeStyle}
      {...rest}
    />
  );
}

export default Skeleton;