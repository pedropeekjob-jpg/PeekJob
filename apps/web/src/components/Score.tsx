import type { CSSProperties, ReactNode } from 'react';
import { CRITERION, type CriterionKey } from '../data/criteria';
import { tr } from '../i18n';
import { deg, fmt } from '../lib/format';
import { Dots } from './Data';
import styles from './Score.module.css';

/** Anel com conteúdo livre no centro (ex.: "4,4" + "de 5"); tamanho, espessura e cores em variáveis CSS */
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
  className,
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
  className?: string;
}) {
  const t = thickness ?? Math.round(size * 0.1);
  const d = pct ? Math.round((value / 100) * 360) : deg(value);
  const vars = { '--size': `${size}px`, '--t': `${t}px`, '--deg': `${d}deg`, '--color': color, '--track': track, '--inner': inner } as CSSProperties;
  return (
    <span role="img" aria-label={ariaLabel} data-muted={muted || undefined} className={className ? `${styles.ring} ${className}` : styles.ring} style={vars}>
      <span aria-hidden="true" className={styles.ringInner}>
        {children}
      </span>
    </span>
  );
}

/** Marcador de prioridade (1, 2, 3) com a cor do critério */
export function PrioMark({ n, color }: { n: number; color: string }) {
  return (
    <span title={tr(`Prioridade ${n}`, `Priority ${n}`)} aria-hidden="true" className={styles.prio} style={{ '--c': color } as CSSProperties}>
      {n}
    </span>
  );
}

function deltaText(delta: number) {
  if (delta > 0) return '▲ ' + fmt(delta);
  if (delta < 0) return '▼ ' + fmt(-delta);
  return tr('= 0,0', '= 0.0');
}

function deltaAria(delta: number) {
  if (delta > 0) return tr(`, subiu ${fmt(delta)} esta semana`, `, up ${fmt(delta)} this week`);
  if (delta < 0) return tr(`, desceu ${fmt(-delta)} esta semana`, `, down ${fmt(-delta)} this week`);
  return tr(', igual esta semana', ', unchanged this week');
}

/** Texto lido pelo leitor de ecrã para uma linha de critério */
export function critLineAria(k: CriterionKey, value: number | null, priority?: number, delta?: number) {
  const c = CRITERION[k];
  return (
    `${c.label} ${value == null ? tr('sem dados', 'no data') : fmt(value) + tr(' de 5', ' out of 5')}` +
    (priority ? tr(`, a tua prioridade ${priority}`, `, your priority ${priority}`) : '') +
    (delta == null ? '' : deltaAria(delta))
  );
}

/** Linha de critério: [prioridade] nome · bolinhas · valor [· variação da semana] */
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
  const trend = delta == null ? undefined : delta > 0 ? 'up' : delta < 0 ? 'down' : 'flat';
  return (
    <div
      role="group"
      aria-label={critLineAria(k, value, priority, delta)}
      className={styles.crit}
      data-delta={delta != null || undefined}
      data-border={border || undefined}
      style={{ '--min-h': `${minHeight}px` } as CSSProperties}
    >
      <span className={`row ${styles.critName}`} data-bold={bold || undefined} data-muted={muted || undefined} aria-hidden="true">
        {priority ? <PrioMark n={priority} color={c.color} /> : null}
        <span className="ellipsis">{c.label}</span>
      </span>
      <span aria-hidden="true">
        <Dots value={value} color={c.color} size={12} />
      </span>
      <span className={`mono ${styles.critValue}`} aria-hidden="true">
        {value == null ? '—' : fmt(value)}
      </span>
      {trend && (
        <span className={`mono ${styles.critDelta}`} data-trend={trend} aria-hidden="true">
          {deltaText(delta!)}
        </span>
      )}
    </div>
  );
}
