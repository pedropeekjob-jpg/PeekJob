import type { CSSProperties, ReactNode } from 'react';
import { Link } from 'react-router';
import { CRITERION, type CriterionKey } from '../data/criteria';
import type { Org } from '../data/orgs';
import { fmt } from '../lib/format';
import { dotFill, ringAria, ringDeg, ringText } from '../lib/rating';
import { tr } from '../i18n';
import { orgTypeLabel } from '../i18n/labels';
import styles from './Data.module.css';

const vars = (v: Record<string, string | number>) => v as CSSProperties;

interface RingProps {
  value: number;
  size?: number;
  thickness?: number;
  color?: string;
  track?: string;
  inner?: string;
  label?: string;
  pct?: boolean;
  fontSize?: number;
  ariaLabel?: string;
  muted?: boolean;
}

/** Anel de nota: o arco mostra o valor de 0 a 5 (ou 0–100 com `pct`). Tamanhos e cores em variáveis CSS */
export function Ring({ value, size = 56, thickness, color = 'var(--teal)', track = 'var(--line)', inner = 'var(--surface)', label, pct = false, fontSize, ariaLabel, muted = false }: RingProps) {
  const t = thickness ?? Math.max(5, Math.round(size * 0.11));
  const style = vars({
    '--size': `${size}px`,
    '--t': `${t}px`,
    '--deg': `${ringDeg(value, pct)}deg`,
    '--color': color,
    '--track': track,
    '--inner': inner,
    '--fs': `${fontSize ?? Math.round(size * 0.3)}px`,
  });
  return (
    <span role="img" aria-label={ariaLabel ?? ringAria(value, { muted, pct })} className={styles.ring} data-muted={muted || undefined} style={style}>
      <span className={styles.ringInner}>{ringText(value, { label, muted, pct })}</span>
    </span>
  );
}

/** 5 bolinhas; meia bolinha para valores intermédios */
export function Dots({ value, color = 'var(--teal)', size = 12, gap = 4 }: { value: number | null; color?: string; size?: number; gap?: number }) {
  return (
    <span className={styles.dots} aria-hidden="true" style={vars({ '--size': `${size}px`, '--gap': `${gap}px`, '--c': color })}>
      {[0, 1, 2, 3, 4].map((k) => (
        <span key={k} className={styles.dot} data-fill={dotFill(value, k)} />
      ))}
    </span>
  );
}

/** Linha de critério: nome, bolinhas e valor */
export function CriterionRow({ k, value, priority, labelWidth = 120 }: { k: CriterionKey; value: number | null; priority?: number; labelWidth?: number }) {
  const c = CRITERION[k];
  return (
    <div className={styles.criterion} style={vars({ '--label': `${labelWidth}px`, '--c': c.color })}>
      <span className={styles.criterionName}>
        {priority ? (
          <span title={tr(`Prioridade ${priority}`, `Priority ${priority}`)} className={styles.priority}>
            {priority}
          </span>
        ) : null}
        {c.short}
      </span>
      <Dots value={value} color={c.color} />
      <span className={`mono ${styles.criterionValue}`}>{value == null ? '—' : fmt(value)}</span>
    </div>
  );
}

export function MatchPill({ value, large = false }: { value: number; large?: boolean }) {
  return <span className={`pill pill-match${large ? ` ${styles.pillLarge}` : ''}`}>{tr(`${value}% para ti`, `${value}% for you`)}</span>;
}

export function Trend({ v }: { v: number | 'novo' }) {
  if (v === 'novo') return <span className="mono small muted">{tr('novo', 'new')}</span>;
  if (v === 0) return <span className="mono small muted">—</span>;
  return (
    <span className={`mono small ${styles.trend}`} data-dir={v > 0 ? 'up' : 'down'}>
      {v > 0 ? '▲' : '▼'} {Math.abs(v)}
    </span>
  );
}

/** Linha magra de organização: anel, nome, 1 metadado e % para ti */
export function OrgRow({ org, match, right, to, meta }: { org: Org; match?: number; right?: ReactNode; to?: string; meta?: string }) {
  return (
    <Link to={to ?? `/org/${org.id}`} data-ev="select_org" data-ev-org-type={org.type} data-ev-match={match} className={`plain row ${styles.orgRow}`}>
      <Ring value={org.score} size={50} muted={!org.reviewsCount} />
      <span className={`grow stack ${styles.orgRowText}`}>
        <span className={`ellipsis ${styles.strong}`}>{org.name}</span>
        <span className="small muted ellipsis">{meta ?? `${orgTypeLabel(org.type)} · ${org.city}`}</span>
      </span>
      {right ?? (match != null ? <span className="pill pill-match">{match}%</span> : null)}
    </Link>
  );
}

/** Cartão magro de organização (grelhas) */
export function OrgCard({ org, match }: { org: Org; match: number }) {
  return (
    <Link to={`/org/${org.id}`} data-ev="select_org" data-ev-org-type={org.type} data-ev-match={match} className={`plain card lift ${styles.orgCard}`}>
      <Ring value={org.score} size={60} />
      <span className={`grow stack ${styles.orgCardText}`}>
        <span className={`ellipsis ${styles.orgCardName}`}>{org.name}</span>
        <span className="small muted ellipsis">
          {orgTypeLabel(org.type)} · {org.city}
        </span>
      </span>
      <span className="pill pill-match">{match}%</span>
    </Link>
  );
}
