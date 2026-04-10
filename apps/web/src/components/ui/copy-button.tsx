import { Check, Copy } from 'lucide-react';
import { useState } from 'react';

async function writeToClipboard(value: string) {
  if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(value);
    return;
  }

  if (typeof document === 'undefined') {
    throw new Error('Clipboard is unavailable');
  }

  const textarea = document.createElement('textarea');
  textarea.value = value;
  textarea.setAttribute('readonly', 'true');
  textarea.style.position = 'fixed';
  textarea.style.opacity = '0';
  document.body.appendChild(textarea);
  textarea.select();

  const copied = document.execCommand('copy');
  document.body.removeChild(textarea);

  if (!copied) {
    throw new Error('Clipboard copy failed');
  }
}

export function CopyButton({
  value,
  ariaLabel,
  className,
  variant = 'default',
  size = 'default'
}: {
  value: string;
  ariaLabel: string;
  className?: string;
  variant?: 'default' | 'ghost';
  size?: 'default' | 'compact';
}) {
  const [status, setStatus] = useState<'idle' | 'copied'>('idle');

  const handleCopy = async () => {
    try {
      await writeToClipboard(value);
      setStatus('copied');
      window.setTimeout(() => setStatus('idle'), 1500);
    } catch {
      setStatus('idle');
    }
  };

  return (
    <button
      type="button"
      aria-label={ariaLabel}
      title={ariaLabel}
      onClick={() => {
        void handleCopy();
      }}
      className={[
        size === 'compact' ? 'h-6 w-6' : 'h-7 w-7',
        variant === 'ghost'
          ? 'inline-flex items-center justify-center rounded-md bg-transparent text-fg-faint transition-colors hover:bg-white/5 hover:text-fg'
          : 'inline-flex items-center justify-center rounded-md border border-border/80 bg-bg/40 text-fg-muted transition-colors hover:border-accent/40 hover:text-fg',
        className ?? ''
      ].join(' ')}
    >
      {status === 'copied' ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
    </button>
  );
}
