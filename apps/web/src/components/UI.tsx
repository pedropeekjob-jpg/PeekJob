import { useEffect, useRef, useState, type ReactNode } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Icon } from './Icon';
import { tr } from '../i18n';
import sheetStyles from './Sheet.module.css';

/** Secção que abre e fecha (revelação progressiva) */
export function Disclosure({
  label,
  openLabel,
  children,
  defaultOpen = false,
  className,
}: {
  label: ReactNode;
  openLabel?: ReactNode;
  children: ReactNode;
  defaultOpen?: boolean;
  className?: string;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className={className}>
      {open && <div className="fade-up">{children}</div>}
      <button type="button" className="link" aria-expanded={open} onClick={() => setOpen(!open)}>
        {open ? openLabel ?? tr('Mostrar menos', 'Show less') : label}
        <Icon name="down" size={16} style={{ transform: open ? 'rotate(180deg)' : undefined, transition: 'transform .15s' }} />
      </button>
    </div>
  );
}

/** Acordeão com título sempre visível */
export function Accordion({ items }: { items: { title: ReactNode; body: ReactNode }[] }) {
  const [open, setOpen] = useState<number | null>(null);
  return (
    <div className="list">
      {items.map((it, i) => (
        <div key={i}>
          <button
            type="button"
            aria-expanded={open === i}
            onClick={() => setOpen(open === i ? null : i)}
            className="row between"
            style={{ width: '100%', minHeight: 56, background: 'none', border: 0, padding: '12px 0', textAlign: 'left', fontWeight: 600, fontSize: 16, gap: 16 }}
          >
            <span>{it.title}</span>
            <Icon name="down" size={18} style={{ flex: 'none', transform: open === i ? 'rotate(180deg)' : undefined, transition: 'transform .15s' }} />
          </button>
          {open === i && (
            <div className="fade-up body" style={{ paddingBottom: 16, fontSize: 15, lineHeight: 1.55 }}>
              {it.body}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

/** Indicador de passos (3 barras) */
export function Steps({ current, total = 3, label }: { current: number; total?: number; label?: string }) {
  return (
    <div className="row" style={{ gap: 10 }} aria-label={label ?? tr(`Passo ${current} de ${total}`, `Step ${current} of ${total}`)}>
      <div className="row" style={{ gap: 4, flex: 1 }}>
        {Array.from({ length: total }, (_, i) => (
          <span key={i} style={{ flex: 1, height: 4, borderRadius: 2, background: i < current ? 'var(--teal)' : 'var(--line)' }} />
        ))}
      </div>
      <span className="mono small muted">
        {current}/{total}
      </span>
    </div>
  );
}

/** Barra de topo mobile: voltar, título e acção à direita */
export function TopBar({ back, title, right, onBack }: { back?: string | -1; title?: ReactNode; right?: ReactNode; onBack?: () => void }) {
  const nav = useNavigate();
  const goBack = () => {
    if (onBack) return onBack();
    if (back === -1 || back === undefined) nav(-1);
    else nav(back);
  };
  return (
    <div className="row between" style={{ gap: 12, minHeight: 44 }}>
      <button type="button" className="icon-btn bare" aria-label={tr('Voltar', 'Back')} onClick={goBack} style={{ marginLeft: -10 }}>
        <Icon name="back" />
      </button>
      {title ? <div style={{ fontWeight: 600, fontSize: 16 }} className="ellipsis grow">{title}</div> : <span className="grow" />}
      {right ?? <span style={{ width: 44 }} />}
    </div>
  );
}

/**
 * Folha que sobe de baixo (telemóvel) ou diálogo central (computador).
 * Fecha com Escape, com o botão fechar ou no fundo; o foco entra no diálogo e volta a quem o abriu.
 */
export function Sheet({ open, onClose, title, children, footer }: { open: boolean; onClose: () => void; title: ReactNode; children: ReactNode; footer?: ReactNode }) {
  const dialogRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const opener = document.activeElement as HTMLElement | null;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    dialogRef.current?.focus();
    return () => {
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = prevOverflow;
      opener?.focus?.();
    };
  }, [open, onClose]);
  if (!open) return null;
  return (
    <div className={sheetStyles.wrap}>
      <button type="button" className={sheetStyles.backdrop} data-sheet-backdrop tabIndex={-1} aria-hidden="true" onClick={onClose} />
      <div ref={dialogRef} role="dialog" aria-modal="true" aria-label={typeof title === 'string' ? title : undefined} tabIndex={-1} className={`${sheetStyles.sheet} fade-up`}>
        <div className={`row between ${sheetStyles.head}`}>
          <h2 className={`h2 ${sheetStyles.title}`}>{title}</h2>
          <button type="button" className="icon-btn bare" aria-label={tr('Fechar', 'Close')} onClick={onClose}>
            <Icon name="close" />
          </button>
        </div>
        <div className={sheetStyles.body}>{children}</div>
        {footer && <div className={sheetStyles.foot}>{footer}</div>}
      </div>
    </div>
  );
}

/** Interruptor acessível */
export function Switch({ checked, onChange, label, hint, purple = false }: { checked: boolean; onChange: (v: boolean) => void; label: ReactNode; hint?: ReactNode; purple?: boolean }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className="row between"
      style={{ width: '100%', gap: 16, background: 'none', border: 0, padding: '14px 0', textAlign: 'left' }}
    >
      <span className="stack" style={{ gap: 2 }}>
        <span style={{ fontWeight: 600, fontSize: 15 }}>{label}</span>
        {hint && <span className="small body">{hint}</span>}
      </span>
      <span className={'switch' + (purple ? ' purple' : '')} />
    </button>
  );
}

/** Ligação de texto com seta */
export function MoreLink({ to, children }: { to: string; children: ReactNode }) {
  return (
    <Link to={to} className="link">
      {children} <Icon name="next" size={16} />
    </Link>
  );
}

/** Estado vazio simples */
export function Empty({ title, body, action }: { title: string; body?: string; action?: ReactNode }) {
  return (
    <div className="stack" style={{ gap: 6, padding: '28px 0' }}>
      <div style={{ fontWeight: 600, fontSize: 17 }}>{title}</div>
      {body && <div className="body">{body}</div>}
      {action}
    </div>
  );
}
