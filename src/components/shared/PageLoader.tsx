import { Loader2 } from 'lucide-react';

export function PageLoader({ label = 'Loading…' }: { label?: string }) {
  return (
    <div className="flex min-h-[40vh] flex-col items-center justify-center gap-3 text-neutral-500">
      <Loader2 className="h-8 w-8 animate-spin text-securex-600" />
      <span className="text-sm">{label}</span>
    </div>
  );
}