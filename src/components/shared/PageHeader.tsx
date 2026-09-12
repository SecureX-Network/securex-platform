import type { ReactNode } from 'react';

interface PageHeaderProps {
  title: string;
  subtitle?: string;
  context?: string;
  children?: ReactNode;
}

export function PageHeader({ title, subtitle, context, children }: PageHeaderProps) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-4">
      <div className="min-w-0">
        {context && (
          <p className="text-xs font-bold uppercase tracking-widest text-securex-600">
            {context}
          </p>
        )}
        <h1 className="mt-1 text-2xl font-bold tracking-tight text-neutral-900">
          {title}
        </h1>
        {subtitle && (
          <p className="mt-1 max-w-2xl text-sm text-neutral-500">{subtitle}</p>
        )}
      </div>
      {children && <div className="flex shrink-0 items-center gap-3">{children}</div>}
    </div>
  );
}