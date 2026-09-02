import type { HTMLAttributes, ReactNode } from "react";
import { classNames } from "@/utils";

export type CardPadding = "none" | "sm" | "md" | "lg";

export interface CardProps
  extends Omit<HTMLAttributes<HTMLDivElement>, "title"> {
  title?: ReactNode;
  description?: ReactNode;
  footer?: ReactNode;
  padding?: CardPadding;
  headerClassName?: string;
  bodyClassName?: string;
  footerClassName?: string;
}

const paddingClasses: Record<CardPadding, string> = {
  none: "p-0",
  sm: "p-4",
  md: "p-5",
  lg: "p-7",
};

export function Card({
  title,
  description,
  footer,
  padding = "md",
  className,
  headerClassName,
  bodyClassName,
  footerClassName = "border-t border-neutral-100 bg-neutral-50/70",
  children,
  ...rest
}: CardProps) {
  return (
    <div
      className={classNames(
        "rounded-xl border border-neutral-200 bg-white shadow-securex",
        className,
      )}
      {...rest}
    >
      {(title || description) && (
        <div
          className={classNames(
            "border-b border-neutral-100 px-5 py-4 sm:px-6",
            headerClassName,
          )}
        >
          {title && (
            <h3 className="text-base font-semibold text-neutral-900">
              {title}
            </h3>
          )}
          {description && (
            <p className="mt-1 text-sm text-neutral-500">{description}</p>
          )}
        </div>
      )}
      <div className={classNames(paddingClasses[padding], bodyClassName)}>
        {children}
      </div>
      {footer && (
        <div className={classNames("px-5 py-4 sm:px-6", footerClassName)}>
          {footer}
        </div>
      )}
    </div>
  );
}

export default Card;