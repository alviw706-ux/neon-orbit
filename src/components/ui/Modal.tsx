import { X } from 'lucide-react';
import { useEffect, type ReactNode } from 'react';

type ModalProps = {
  open: boolean;
  title: string;
  onClose: () => void;
  children: ReactNode;
};

export function Modal({ open, title, onClose, children }: ModalProps) {
  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center p-0 sm:items-center sm:p-6" role="dialog" aria-modal="true" aria-label={title}>
      <button type="button" className="absolute inset-0 bg-void-950/80 backdrop-blur-sm animate-fade-up" onClick={onClose} aria-label="Close" />
      <div className="panel relative w-full max-w-lg rounded-b-none p-6 animate-fade-up sm:rounded-2xl">
        <div className="mb-5 flex items-center justify-between">
          <h2 className="heading-display text-lg text-white">{title}</h2>
          <button type="button" onClick={onClose} className="btn-ghost p-2" aria-label="Close dialog">
            <X className="h-5 w-5" />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}
