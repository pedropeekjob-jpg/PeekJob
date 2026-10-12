import { useEffect, useState, type ReactNode } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Icon } from './Icon';

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
        {open ? openLabel ?? 'Mostrar menos' : label}
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
    <div className="row" style={{ gap: 10 }} aria-label={label ?? `Passo ${current} de ${total}`}>
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
      <button type="button" className="icon-btn bare" aria-label="Voltar" onClick={goBack} style={{ marginLeft: -10 }}>
        <Icon name="back" />
      </button>
      {title ? <div style={{ fontWeight: 600, fontSize: 16 }} className="ellipsis grow">{title}</div> : <span className="grow" />}
      {right ?? <span style={{ width: 44 }} />}
    </div>
  );
}

/** Folha que sobe de baixo (mobile) ou diálogo central (desktop) */
export function Sheet({ open, onClose, title, children, footer }: { open: boolean; onClose: () => void; title: ReactNode; children: ReactNode; footer?: ReactNode }) {
  useEffect(() => {
    if (!open) return;
    const k = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', k);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', k);
      document.body.style.overflow = prev;
    };
  }, [open, onClose]);
  if (!open) return null;
  return (
    <div className="sheet-wrap" onClick={onClose}>
      <div role="dialog" aria-modal="true" aria-label={typeof title === 'string' ? title : undefined} className="sheet fade-up" onClick={(e) => e.stopPropagation()}>
        <div className="row between" style={{ gap: 12, padding: '14px 20px 6px' }}>
          <h2 className="h2" style={{ fontSize: 22 }}>{title}</h2>
          <button type="button" className="icon-btn bare" aria-label="Fechar" onClick={onClose}>
            <Icon name="close" />
          </button>
        </div>
        <div style={{ padding: '6px 20px 20px', overflowY: 'auto', flex: 1 }}>{children}</div>
        {footer && <div style={{ padding: '12px 20px 20px', borderTop: '1px solid var(--line)' }}>{footer}</div>}
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
