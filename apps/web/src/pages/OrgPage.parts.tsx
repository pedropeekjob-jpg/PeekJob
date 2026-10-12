import type { CSSProperties, ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { Dots } from '../components/Data';
import { Icon } from '../components/Icon';
import { CRITERION, type CriterionKey } from '../data/criteria';
import { tr } from '../i18n';
import { deg, fmt } from '../lib/format';

/** Anel com conteúdo livre no centro (ex.: "4,4" + "de 5") */
export function BigRing({
  value,
  size,
  thickness,
  pct = false,
  color = 'var(--teal)',
  track = 'var(--line)',
  inner = 'var(--ground)',
  muted = false,
  ariaLabel,
  children,
  style,
}: {
  value: number;
  size: number;
  thickness?: number;
  pct?: boolean;
  color?: string;
  track?: string;
  inner?: string;
  muted?: boolean;
  ariaLabel: string;
  children: ReactNode;
  style?: CSSProperties;
}) {
  const t = thickness ?? Math.round(size * 0.1);
  const d = pct ? Math.round((value / 100) * 360) : deg(value);
  return (
    <span
      role="img"
      aria-label={ariaLabel}
      style={{
        flex: 'none',
        width: size,
        height: size,
        borderRadius: '50%',
        background: muted ? track : `conic-gradient(${color} ${d}deg, ${track} 0)`,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        ...style,
      }}
    >
      <span
        aria-hidden="true"
        style={{
          width: size - t * 2,
          height: size - t * 2,
          borderRadius: '50%',
          background: inner,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 2,
          fontFamily: 'var(--font-display)',
          fontWeight: 600,
          lineHeight: 1,
          color: muted ? 'var(--muted)' : undefined,
        }}
      >
        {children}
      </span>
    </span>
  );
}

/** Marcador de prioridade (1, 2, 3) */
export function PrioMark({ n, color }: { n: number; color: string }) {
  return (
    <span
      title={tr(`Prioridade ${n}`, `Priority ${n}`)}
      aria-hidden="true"
      style={{
        flex: 'none',
        width: 20,
        height: 20,
        borderRadius: 10,
        border: `2px solid ${color}`,
        fontSize: 11,
        fontWeight: 700,
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: 'var(--ink)',
        background: 'var(--surface)',
      }}
    >
      {n}
    </span>
  );
}

/** Linha de critério: [prioridade] nome · bolinhas · valor [· variação] */
export function CritLine({
  k,
  value,
  priority,
  bold = false,
  muted = false,
  delta,
  border = false,
  minHeight = 32,
}: {
  k: CriterionKey;
  value: number | null;
  priority?: number;
  bold?: boolean;
  muted?: boolean;
  delta?: number;
  border?: boolean;
  minHeight?: number;
}) {
  const c = CRITERION[k];
  const aria =
    `${c.label} ${value == null ? tr('sem dados', 'no data') : fmt(value) + tr(' de 5', ' out of 5')}` +
    (priority ? tr(`, a tua prioridade ${priority}`, `, your priority ${priority}`) : '') +
    (delta != null
      ? tr(
          `, ${delta > 0 ? 'subiu ' + fmt(delta) : delta < 0 ? 'desceu ' + fmt(-delta) : 'igual'} esta semana`,
          `, ${delta > 0 ? 'up ' + fmt(delta) : delta < 0 ? 'down ' + fmt(-delta) : 'unchanged'} this week`,
        )
      : '');
  return (
    <div
      role="group"
      aria-label={aria}
      style={{
        display: 'grid',
        gridTemplateColumns: `minmax(0, 1fr) auto 30px${delta != null ? ' 52px' : ''}`,
        gap: 12,
        alignItems: 'center',
        minHeight,
        borderBottom: border ? '1px solid var(--line)' : undefined,
      }}
    >
      <span className="row" style={{ gap: 8, fontSize: 15, fontWeight: bold ? 600 : 400, color: muted ? 'var(--body)' : 'var(--ink)', minWidth: 0 }} aria-hidden="true">
        {priority ? <PrioMark n={priority} color={c.color} /> : null}
        <span className="ellipsis">{c.label}</span>
      </span>
      <span aria-hidden="true">
        <Dots value={value} color={c.color} size={12} />
      </span>
      <span className="mono" style={{ fontSize: 13, textAlign: 'right' }} aria-hidden="true">
        {value == null ? '—' : fmt(value)}
      </span>
      {delta != null && (
        <span
          className="mono"
          aria-hidden="true"
          style={{ fontSize: 13, textAlign: 'right', color: delta > 0 ? 'var(--up)' : delta < 0 ? 'var(--down)' : 'var(--muted)' }}
        >
          {delta > 0 ? '▲ ' + fmt(delta) : delta < 0 ? '▼ ' + fmt(-delta) : tr('= 0,0', '= 0.0')}
        </span>
      )}
    </div>
  );
}

/** Botão redondo de voltar (mobile), com destino de reserva quando não há histórico */
export function BackButton({ fallback, label = tr('Voltar', 'Back') }: { fallback: string; label?: string }) {
  const nav = useNavigate();
  const go = () => {
    const idx = (window.history.state as { idx?: number } | null)?.idx ?? 0;
    if (idx > 0) nav(-1);
    else nav(fallback);
  };
  return (
    <button type="button" className="icon-btn" aria-label={label} onClick={go}>
      <Icon name="back" size={18} />
    </button>
  );
}

/** Ligação de texto "mostrar mais/menos" que não é um Disclosure (o conteúdo fica noutro sítio) */
export function MoreToggle({ open, onToggle, label, openLabel, controls }: { open: boolean; onToggle: () => void; label: string; openLabel: string; controls?: string }) {
  return (
    <button type="button" className="link" aria-expanded={open} aria-controls={controls} onClick={onToggle} style={{ alignSelf: 'flex-start', fontSize: 15 }}>
      {open ? openLabel : label}
    </button>
  );
}
