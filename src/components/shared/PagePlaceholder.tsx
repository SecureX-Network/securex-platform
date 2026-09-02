import { Construction } from 'lucide-react';

interface PagePlaceholderProps {
  title: string;
  description?: string;
}

export function PagePlaceholder({ title, description }: PagePlaceholderProps) {
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center px-4 text-center">
      <span className="flex h-16 w-16 items-center justify-center rounded-full bg-neutral-100 text-neutral-400">
        <Construction className="h-8 w-8" />
      </span>
      <h1 className="mt-6 text-2xl font-bold text-neutral-900">{title}</h1>
      {description && (
        <p className="mt-2 max-w-md text-neutral-500">{description}</p>
      )}
    </div>
  );
}