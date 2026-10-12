import { Link } from 'react-router-dom';
import { CRITERION, type CriterionKey } from '../data/criteria';
import type { Org } from '../data/orgs';
import { deg, fmt } from '../lib/format';
import { tr } from '../i18n';
import { orgTypeLabel } from '../i18n/labels';

/** Anel de nota: o arco mostra o valor de 0 a 5 (ou 0–100 com `pct`) */
export function Ring({
  value,
  size = 56,
  thickness,
  color = 'var(--teal)',
  track = 'var(--line)',
  inner = 'var(--surface)',
  label,
  pct = false,
  fontSize,
  ariaLabel,
  muted = false,
}: {
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
}) {
  const t = thickness ?? Math.max(5, Math.round(size * 0.11));
  const d = pct ? Math.round((value / 100) * 360) : deg(value);
  const text = label ?? (muted ? '—' : pct ? `${Math.round(value)}%` : fmt(value));
  return (
    <span
      role="img"
      aria-label={ariaLabel ?? (muted ? tr('Ainda sem nota', 'No score yet') : pct ? `${Math.round(value)}%` : tr(`Nota ${fmt(value)} de 5`, `Score ${fmt(value)} out of 5`))}
      style={{
        flex: 'none',
        width: size,
        height: size,
        borderRadius: '50%',
        background: muted ? track : `conic-gradient(${color} ${d}deg, ${track} 0)`,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <span
        style={{
          width: size - t * 2,
          height: size - t * 2,
          borderRadius: '50%',
          background: inner,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontFamily: 'var(--font-display)',
          fontWeight: 600,
          fontSize: fontSize ?? Math.round(size * 0.3),
          color: muted ? 'var(--muted)' : undefined,
        }}
      >
        {text}
      </span>
    </span>
  );
}

/** 5 bolinhas; meia bolinha para valores intermédios */
export function Dots({ value, color = 'var(--teal)', size = 12, gap = 4 }: { value: number | null; color?: string; size?: number; gap?: number }) {
  const v = value ?? 0;
  return (
    <span style={{ display: 'flex', gap }} aria-hidden="true">
      {[0, 1, 2, 3, 4].map((k) => (
        <span
          key={k}
          style={{
            width: size,
            height: size,
            borderRadius: size / 2,
            background:
              value == null
                ? 'var(--soft)'
                : v >= k + 0.75
                  ? color
                  : v >= k + 0.25
                    ? `linear-gradient(90deg, ${color} 50%, var(--line) 50%)`
                    : 'var(--line)',
          }}
        />
      ))}
    </span>
  );
}

/** Linha de critério: nome, bolinhas e valor */
export function CriterionRow({ k, value, priority, labelWidth = 120 }: { k: CriterionKey; value: number | null; priority?: number; labelWidth?: number }) {
  const c = CRITERION[k];
  return (
    <div style={{ display: 'grid', gridTemplateColumns: `${labelWidth}px auto 34px`, gap: 12, alignItems: 'center', minHeight: 28 }}>
      <span style={{ fontSize: 14, color: 'var(--body)', display: 'flex', alignItems: 'center', gap: 6 }}>
        {priority ? (
          <span
            title={tr(`Prioridade ${priority}`, `Priority ${priority}`)}
            style={{ width: 18, height: 18, borderRadius: 9, border: `2px solid ${c.color}`, fontSize: 10, fontWeight: 700, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', color: 'var(--ink)' }}
          >
            {priority}
          </span>
        ) : null}
        {c.short}
      </span>
      <Dots value={value} color={c.color} />
      <span className="mono" style={{ fontSize: 13, textAlign: 'right' }}>
        {value == null ? '—' : fmt(value)}
      </span>
    </div>
  );
}

export function MatchPill({ value, large = false }: { value: number; large?: boolean }) {
  return (
    <span className="pill pill-match" style={large ? { fontSize: 15, padding: '7px 14px' } : undefined}>
      {tr(`${value}% para ti`, `${value}% for you`)}
    </span>
  );
}

export function Trend({ v }: { v: number | 'novo' }) {
  if (v === 'novo') return <span className="mono small muted">{tr('novo', 'new')}</span>;
  if (v === 0) return <span className="mono small muted">—</span>;
  return (
    <span className="mono small" style={{ color: v > 0 ? 'var(--up)' : 'var(--down)' }}>
      {v > 0 ? '▲' : '▼'} {Math.abs(v)}
    </span>
  );
}

/** Linha magra de organização: anel, nome, 1 metadado e % para ti */
export function OrgRow({ org, match, right, to, meta }: { org: Org; match?: number; right?: React.ReactNode; to?: string; meta?: string }) {
  return (
    <Link to={to ?? `/org/${org.id}`} data-ev="select_org" data-ev-org-type={org.type} data-ev-match={match} className="plain row" style={{ gap: 14, padding: '14px 0', minHeight: 72 }}>
      <Ring value={org.score} size={50} muted={!org.reviewsCount} />
      <span className="grow stack" style={{ gap: 2 }}>
        <span className="ellipsis" style={{ fontWeight: 600 }}>
          {org.name}
        </span>
        <span className="small muted ellipsis">{meta ?? `${orgTypeLabel(org.type)} · ${org.city}`}</span>
      </span>
      {right ?? (match != null ? <span className="pill pill-match">{match}%</span> : null)}
    </Link>
  );
}

/** Cartão magro de organização (grelhas) */
export function OrgCard({ org, match }: { org: Org; match: number }) {
  return (
    <Link to={`/org/${org.id}`} data-ev="select_org" data-ev-org-type={org.type} data-ev-match={match} className="plain card lift" style={{ display: 'flex', gap: 14, alignItems: 'center', padding: 18 }}>
      <Ring value={org.score} size={60} />
      <span className="grow stack" style={{ gap: 4 }}>
        <span style={{ fontWeight: 600, fontSize: 17 }} className="ellipsis">
          {org.name}
        </span>
        <span className="small muted ellipsis">
          {orgTypeLabel(org.type)} · {org.city}
        </span>
      </span>
      <span className="pill pill-match">{match}%</span>
    </Link>
  );
}
