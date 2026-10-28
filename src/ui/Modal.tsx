import { useEffect, useRef, type ReactNode } from 'react';
import Icon from './Icon';
import { useLocale } from '../i18n';
export default function Modal({ title, children, onClose, drawer = false, locked = false }: { title: string; children: ReactNode; onClose: () => void; drawer?: boolean; locked?: boolean }) {
  const { t } = useLocale();
  const ref = useRef<HTMLElement>(null), close = useRef(onClose); close.current = onClose;
  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null;
    const shell = document.querySelector<HTMLElement>('.app-shell'); if (shell) shell.inert = true;
    const modal = ref.current; modal?.focus();
    const key = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && !locked) close.current();
      if (event.key !== 'Tab') return;
      const items = [...(modal?.querySelectorAll<HTMLElement>('button:not(:disabled), input:not(:disabled), select:not(:disabled), a[href], summary') || [])].filter(item => item.offsetParent !== null);
      const first = items[0], last = items.at(-1);
      if (!items.length) { event.preventDefault(); return; }
      if (event.shiftKey && (document.activeElement === first || document.activeElement === modal)) { event.preventDefault(); last?.focus(); }
      else if (!event.shiftKey && (document.activeElement === last || document.activeElement === modal)) { event.preventDefault(); first?.focus(); }
    };
    document.addEventListener('keydown', key);
    return () => { if (shell) shell.inert = false; document.removeEventListener('keydown', key); previous?.focus(); };
  }, [locked]);
  return <div className={`modal-backdrop ${drawer ? 'is-drawer' : ''}`} onClick={event => { if (event.target === event.currentTarget && !locked) onClose(); }}><section ref={ref} tabIndex={-1} className={`modal ${drawer ? 'drawer' : ''}`} role="dialog" aria-modal="true" aria-label={title}><div className="modal-heading"><h2>{title}</h2><button className="icon-button" aria-label={t('closeTitle', {title})} disabled={locked} onClick={onClose}><Icon name="close"/></button></div>{children}</section></div>;
}
