import { useCallback, useState, type MouseEvent } from 'react';
import { Copy, Check } from 'lucide-react';
import { Button, Tooltip } from '@/components/ui';
import { truncateHash } from '@/utils';

export interface HashDisplayProps {
  value: string;
  fullDisplay?: boolean;
  startChars?: number;
  endChars?: number;
  showCopyButton?: boolean;
  className?: string;
}

export function HashDisplay({
  value,
  fullDisplay = false,
  startChars = 10,
  endChars = 6,
  showCopyButton = true,
  className,
}: HashDisplayProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = useCallback(async (e: MouseEvent<HTMLButtonElement>) => {
    e.stopPropagation();
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      const textarea = document.createElement('textarea');
      textarea.value = value;
      textarea.style.position = 'fixed';
      textarea.style.opacity = '0';
      document.body.appendChild(textarea);
      textarea.select();
      try {
        document.execCommand('copy');
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      } catch {
        // Clipboard unavailable — silently fail
      }
      document.body.removeChild(textarea);
    }
  }, [value]);

  const displayText = fullDisplay ? value : truncateHash(value, startChars, endChars);

  return (
    <span className={`inline-flex items-center gap-1.5 ${className ?? ''}`}>
      <span className="font-mono text-xs">{displayText}</span>
      {showCopyButton && (
        <Tooltip content={copied ? 'Copied!' : 'Copy to clipboard'}>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={(e) => void handleCopy(e)}
            aria-label={copied ? 'Copied to clipboard' : `Copy ${value}`}
            className="h-6 w-6 p-0 text-slate-400 hover:text-slate-600"
          >
            {copied ? (
              <Check aria-hidden="true" className="h-3 w-3 text-trust-600" />
            ) : (
              <Copy aria-hidden="true" className="h-3 w-3" />
            )}
          </Button>
        </Tooltip>
      )}
    </span>
  );
}
