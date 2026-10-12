import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Shell } from '../components/Layout';
import { Ring } from '../components/Data';
import { Icon } from '../components/Icon';
import { ORG_TYPES, type Org, type OrgType } from '../data/orgs';
import { useOrgs } from '../api/orgs';
import { fmt, plural } from '../lib/format';
import { useIsDesktop } from '../lib/useMedia';
import { tr } from '../i18n';
import { orgTypeLabel, sectorLabel } from '../i18n/labels';

type SortKey = 'nota' | 'resp' | 'n';

/** Média ponderada pelo nº de avaliações (nota e Respeito) */
function agg(orgs: Org[]) {
  let w = 0;
  let a = 0;
  let r = 0;
  orgs.forEach((o) => {
    w += o.reviewsCount;
    a += o.reviewsCount * o.score;
    r += o.reviewsCount * (o.scores.respeito ?? 0);
  });
  return { n: orgs.length, score: w ? a / w : 0, resp: w ? r / w : 0 };
}

export default function Setores() {
  const desktop = useIsDesktop();
  const all = useOrgs();
  const orgs = useMemo(() => all.filter((o) => o.reviewsCount > 0), [all]);
  const [type, setType] = useState<OrgType | null>(null);
  const [sort, setSort] = useState<SortKey>('nota');

  const types = ORG_TYPES.map((t) => ({ t, ...agg(orgs.filter((o) => o.type === t)) }));
  const sectors = useMemo(() => {
    const pool = type ? orgs.filter((o) => o.type === type) : orgs;
    const names = Array.from(new Set(pool.map((o) => o.sector)));
    const rows = names.map((name) => ({ name, ...agg(pool.filter((o) => o.sector === name)) }));
    rows.sort((x, y) => (sort === 'nota' ? y.score - x.score : sort === 'resp' ? y.resp - x.resp : y.n - x.n || y.score - x.score));
    return rows;
  }, [orgs, type, sort]);

  const rankHref = type ? `/ranking?tipo=${encodeURIComponent(type)}` : '/ranking';
  const sectorHref = (s: string) => `/ranking?${type ? `tipo=${encodeURIComponent(type)}&` : ''}setor=${encodeURIComponent(s)}`;

  return (
    <Shell nav>
      <div className={desktop ? 'container' : 'page'} style={desktop ? { paddingBottom: 64 } : { gap: 0 }}>
        <div className="stack" style={{ gap: 12, padding: desktop ? '32px 0 40px' : '8px 0 28px' }}>
          <h1 className="h1" style={desktop ? { fontSize: 'clamp(36px, 4vw, 52px)', lineHeight: 1 } : undefined}>
            {tr('Encontra o teu tipo de lugar.', 'Find your kind of place.')}
          </h1>
          <p className="lead" style={{ fontSize: 16 }}>
            {tr('Escolhe um tipo e compara os setores.', 'Pick a type and compare sectors.')}
          </p>
        </div>

        <section aria-labelledby="t-tipos" className="stack" style={{ gap: 16 }}>
          <h2 id="t-tipos" className="h2" style={{ fontSize: 22 }}>
            {tr('Tipo de organização', 'Type of organisation')}
          </h2>
          <div role="group" aria-label={tr('Tipo de organização', 'Type of organisation')} className="grid-auto" style={{ gap: desktop ? 14 : 10, gridTemplateColumns: desktop ? undefined : 'repeat(2, minmax(0, 1fr))' }}>
            {types.map(({ t, n, score }) => {
              const on = type === t;
              return (
                <button
                  key={t}
                  type="button"
                  className="lift"
                  aria-pressed={on}
                  onClick={() => setType(on ? null : t)}
                  style={{
                    display: 'flex', flexDirection: desktop ? 'row' : 'column', alignItems: desktop ? 'center' : 'flex-start', gap: desktop ? 16 : 10,
                    minHeight: desktop ? 96 : 0, padding: desktop ? '16px 20px' : 14, borderRadius: 'var(--r-lg)',
                    border: `2px solid ${on ? 'var(--teal)' : 'var(--line)'}`, background: on ? 'var(--teal-tint)' : 'var(--surface)', textAlign: 'left',
                  }}
                >
                  <Ring value={score} size={desktop ? 60 : 48} muted={!n} inner={on ? 'var(--teal-tint)' : 'var(--surface)'} ariaLabel={n ? tr(`Nota média ${fmt(score)} de 5`, `Average score ${fmt(score)} out of 5`) : tr('Ainda sem nota', 'No score yet')} />
                  <span className="stack" style={{ gap: 3, minWidth: 0 }}>
                    <span className="num" style={{ fontSize: desktop ? 20 : 17, lineHeight: 1.1 }}>
                      {orgTypeLabel(t)}
                    </span>
                    <span className="small muted">{plural(n, tr('organização', 'organisation'), tr('organizações', 'organisations'))}</span>
                  </span>
                </button>
              );
            })}
          </div>
          <div className="row wrap" style={{ gap: 12 }}>
            <Link to={rankHref} className="btn btn-dark" style={{ fontSize: 15, flex: desktop ? undefined : '1 1 auto' }}>
              {tr('Ver ranking', 'View ranking')} · {type ? orgTypeLabel(type) : tr('todos os tipos', 'all types')} <Icon name="next" size={18} />
            </Link>
            {type && (
              <button type="button" className="btn btn-ghost" style={{ fontSize: 15 }} onClick={() => setType(null)}>
                {tr('Mostrar todos os tipos', 'Show all types')}
              </button>
            )}
          </div>
        </section>

        <section aria-labelledby="t-setores" className="stack" style={{ gap: 12, paddingTop: desktop ? 56 : 36 }}>
          <div className="row wrap between" style={{ gap: 16, paddingBottom: 8 }}>
            <div className="row wrap" style={{ alignItems: 'baseline', gap: 14 }}>
              <h2 id="t-setores" className="h2" style={{ fontSize: 22 }}>
                {tr('Setores', 'Sectors')}
              </h2>
              <span aria-live="polite" className="small muted">
                {type ? tr(`${sectors.length} com ${type}`, `${sectors.length} with ${orgTypeLabel(type)}`) : plural(sectors.length, tr('setor', 'sector'), tr('setores', 'sectors'))}
              </span>
            </div>
            <div className="segmented" role="group" aria-label={tr('Ordenar setores', 'Sort sectors')} style={desktop ? undefined : { width: '100%' }}>
              {(
                [
                  ['nota', tr('Melhor nota', 'Top score')],
                  ['resp', tr('Mais respeito', 'Most respect')],
                  ['n', desktop ? tr('Mais organizações', 'Most organisations') : tr('Mais org.', 'Most orgs')],
                ] as const
              ).map(([k, l]) => (
                <button key={k} type="button" aria-pressed={sort === k} onClick={() => setSort(k)} style={desktop ? undefined : { padding: '0 8px', fontSize: 13 }}>
                  {l}
                </button>
              ))}
            </div>
          </div>

          {sectors.length === 0 ? (
            <div className="body" style={{ padding: '20px 0', borderTop: '1px solid var(--line)' }}>
              {tr('Ainda não há organizações deste tipo com avaliações.', 'No organisations of this type have reviews yet.')}
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: desktop ? 'repeat(auto-fill, minmax(min(480px, 100%), 1fr))' : '1fr', columnGap: 48 }}>
              {sectors.map((s) => (
                <Link
                  key={s.name}
                  to={sectorHref(s.name)}
                  className="plain row st-row"
                  style={{ gap: desktop ? 16 : 12, padding: desktop ? '12px 10px' : '12px 0', borderTop: '1px solid var(--line)', borderRadius: 4, minHeight: 72 }}
                >
                  <Ring value={s.score} size={52} fontSize={16} ariaLabel={tr(`Nota média ${fmt(s.score)} de 5`, `Average score ${fmt(s.score)} out of 5`)} />
                  <span className="grow stack" style={{ gap: 3 }}>
                    <span className="ellipsis" style={{ fontSize: 16, fontWeight: 600 }}>
                      {sectorLabel(s.name)}
                    </span>
                    <span className="small muted">{plural(s.n, tr('organização', 'organisation'), tr('organizações', 'organisations'))}</span>
                  </span>
                  <span className="row small" aria-label={tr(`Respeito e inclusão ${fmt(s.resp)} de 5`, `Respect and inclusion ${fmt(s.resp)} out of 5`)} style={{ flex: 'none', gap: 6, color: 'var(--purple-text)' }}>
                    <span aria-hidden="true" style={{ width: 10, height: 10, borderRadius: 5, background: 'var(--purple)' }} />
                    <span aria-hidden="true">{tr('Respeito', 'Respect')}</span>
                    <span className="mono" aria-hidden="true" style={{ fontWeight: 500 }}>
                      {fmt(s.resp)}
                    </span>
                  </span>
                </Link>
              ))}
            </div>
          )}
        </section>
      </div>
      <style>{`.st-row{transition:background .15s}@media (hover:hover){.st-row:hover{background:var(--surface)}}`}</style>
    </Shell>
  );
}
