import { AlertTriangle, Loader2, type LucideIcon } from 'lucide-react';
import type { ReactNode } from 'react';

type StateMessageProps = {
  tone: 'loading' | 'error' | 'empty';
  title: string;
  description?: string;
  icon?: LucideIcon;
  action?: ReactNode;
};

export function StateMessage({ tone, title, description, icon: Icon, action }: StateMessageProps) {
  const isLoading = tone === 'loading';
  const isError = tone === 'error';
  const DisplayIcon = Icon ?? (isLoading ? Loader2 : AlertTriangle);
  const iconClass = isError ? 'text-neon-rose' : isLoading ? 'text-neon-cyan animate-spin' : 'text-slate-400';

  return (
    <div role={isError ? 'alert' : 'status'} className="flex flex-col items-center justify-center gap-3 px-6 py-12 text-center">
      <DisplayIcon className={`h-8 w-8 ${iconClass}`} aria-hidden="true" />
      <p className="font-display text-sm uppercase tracking-[0.2em] text-slate-100">{title}</p>
      {description && <p className="max-w-md text-sm text-slate-400">{description}</p>}
      {action && <div className="mt-2">{action}</div>}
    </div>
  );
}
