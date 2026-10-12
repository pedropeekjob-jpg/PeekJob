import { useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Shell } from '../components/Layout';
import { Dots, Ring } from '../components/Data';
import { Sheet, Switch } from '../components/UI';
import { Icon } from '../components/Icon';
import { CRITERIA, CRITERION, type CriterionKey } from '../data/criteria';
import { DISTRICTS, ORG_TYPES, type Org, type SizeBand } from '../data/orgs';
import { useOrgs } from '../api/orgs';
import { match } from '../lib/match';
import { fmt, plural } from '../lib/format';
import { useStore } from '../lib/store';
import { useIsDesktop } from '../lib/useMedia';
import { tr } from '../i18n';
import { orgTypeLabel, sectorLabel } from '../i18n/labels';

/** Regra do ranking: só entram organizações com pelo menos 5 avaliações */
const MIN_REVIEWS = 5;
/** Aproximação no POC: "só verificadas" = pelo menos 80% das avaliações verificadas */
const VERIFIED_MIN = 80;
const SIZES: SizeBand[] = ['1–9', '10–49', '50–249'];
const DESKTOP_LIMIT = 8;

type Sort = 'mim' | 'nota';
type GroupKey = 'tipo' | 'dim' | 'dist';

interface Filters {
  tipo: string[];
  dim: string[];
  dist: string[];
  resp: boolean;
  ver: boolean;
  setor: string | null;
}

const GROUPS = (): { key: GroupKey; label: string; short: string; opts: string[]; optLabel?: (v: string) => string }[] => [
  { key: 'tipo', label: tr('Tipo de organização', 'Type of organisation'), short: tr('Tipo', 'Type'), opts: ORG_TYPES, optLabel: orgTypeLabel },
  { key: 'dim', label: tr('Dimensão (pessoas)', 'Size (people)'), short: tr('Pessoas', 'People'), opts: SIZES },
  { key: 'dist', label: tr('Distrito', 'District'), short: tr('Distrito', 'District'), opts: DISTRICTS },
];

const list = (v: string | null) => (v ? v.split(',').filter(Boolean) : []);

/** Filtros guardados no endereço: sobrevivem a ir à página da organização e voltar, e permitem ligações de /setores */
function useFilters() {
  const [sp, setSp] = useSearchParams();
  const f: Filters = {
    tipo: list(sp.get('tipo')),
    dim: list(sp.get('dim')),
    dist: list(sp.get('dist')),
    resp: sp.get('resp') === '1',
    ver: sp.get('ver') === '1',
    setor: sp.get('setor'),
  };
  const sort: Sort = sp.get('ordem') === 'nota' ? 'nota' : 'mim';
  const write = (patch: Partial<Filters> & { ordem?: Sort }) => {
    const n = { ...f, ...patch };
    const o = patch.ordem ?? sort;
    const p = new URLSearchParams();
    if (n.tipo.length) p.set('tipo', n.tipo.join(','));
    if (n.dim.length) p.set('dim', n.dim.join(','));
    if (n.dist.length) p.set('dist', n.dist.join(','));
    if (n.resp) p.set('resp', '1');
    if (n.ver) p.set('ver', '1');
    if (n.setor) p.set('setor', n.setor);
    if (o === 'nota') p.set('ordem', 'nota');
    setSp(p, { replace: true });
  };
  const toggle = (g: GroupKey, v: string) => write({ [g]: f[g].includes(v) ? f[g].filter((x) => x !== v) : [...f[g], v] });
  const clear = () => write({ tipo: [], dim: [], dist: [], resp: false, ver: false, setor: null });
  const active = f.tipo.length + f.dim.length + f.dist.length + (f.resp ? 1 : 0) + (f.ver ? 1 : 0) + (f.setor ? 1 : 0);
  return { f, sort, write, toggle, clear, active };
}

function applyFilters(orgs: Org[], f: Filters) {
  return orgs.filter(
    (o) =>
      o.reviewsCount >= MIN_REVIEWS &&
      (!f.tipo.length || f.tipo.includes(o.type)) &&
      (!f.dim.length || f.dim.includes(o.size)) &&
      (!f.dist.length || f.dist.includes(o.district)) &&
      (!f.resp || (o.scores.respeito ?? 0) >= 4) &&
      (!f.ver || o.verifiedPct >= VERIFIED_MIN) &&
      (!f.setor || o.sector === f.setor),
  );
}

function trendInfo(t: number | 'novo') {
  if (t === 'novo') return { text: tr('novo', 'new'), aria: tr('Novo no ranking', 'New in the ranking'), color: 'var(--muted)' };
  if (t > 0) return { text: `▲${t}`, aria: tr(`Subiu ${t}`, `Up ${t}`), color: 'var(--up)' };
  if (t < 0) return { text: `▼${Math.abs(t)}`, aria: tr(`Desceu ${Math.abs(t)}`, `Down ${Math.abs(t)}`), color: 'var(--down)' };
  return { text: '—', aria: tr('Sem alteração', 'No change'), color: 'var(--muted)' };
}

const sizeLabel = (s: string) => (s === '1–9' ? tr('Até 9 pessoas', 'Up to 9 people') : s === '10–49' ? tr('10 a 49 pessoas', '10 to 49 people') : tr('50 a 249 pessoas', '50 to 249 people'));

export default function Ranking() {
  const desktop = useIsDesktop();
  const orgs = useOrgs();
  const { prefs } = useStore();
  const F = useFilters();

  const ranked = useMemo(() => {
    const rows = applyFilters(orgs, F.f).map((org) => ({ org, match: match(org, prefs) }));
    if (F.sort === 'mim') rows.sort((a, b) => b.match - a.match || b.org.score - a.org.score);
    else rows.sort((a, b) => b.org.score - a.org.score || b.org.reviewsCount - a.org.reviewsCount);
    return rows;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [orgs, prefs, F.sort, JSON.stringify(F.f)]);

  return <Shell nav>{desktop ? <DesktopRanking ranked={ranked} F={F} prefs={prefs} /> : <MobileRanking ranked={ranked} F={F} />}</Shell>;
}

type Ranked = { org: Org; match: number }[];
type FiltersApi = ReturnType<typeof useFilters>;

/* ---------------- Controlos partilhados ---------------- */

function SortToggle({ F, big = false }: { F: FiltersApi; big?: boolean }) {
  return (
    <div className="segmented" role="group" aria-label={tr('Ordenar', 'Sort')}>
      {(
        [
          ['mim', tr('Para mim', 'For me')],
          ['nota', tr('Nota geral', 'Overall score')],
        ] as const
      ).map(([k, l]) => (
        <button
          key={k}
          type="button"
          aria-pressed={F.sort === k}
          onClick={() => F.write({ ordem: k })}
          style={big ? { height: 44, minWidth: 120, fontSize: 15, padding: '0 18px' } : undefined}
        >
          {l}
        </button>
      ))}
    </div>
  );
}

function FilterGroups({ F, compact = false }: { F: FiltersApi; compact?: boolean }) {
  const [more, setMore] = useState<Record<string, boolean>>({});
  const VISIBLE = 3;
  return (
    <>
      {GROUPS().map((g) => {
        const cur = F.f[g.key];
        const extra = g.opts.length > VISIBLE + 1 && !compact;
        const open = !!more[g.key];
        const shown = !extra || open ? g.opts : g.opts.filter((o, i) => i < VISIBLE || cur.includes(o));
        const hidden = g.opts.length - shown.length;
        return (
          <fieldset key={g.key} style={{ border: 0, margin: 0, padding: 0, minWidth: 0 }}>
            <legend
              style={
                compact
                  ? { padding: '0 0 8px', fontSize: 13, fontWeight: 600, color: 'var(--muted)' }
                  : { padding: '0 0 10px', fontSize: 15, fontWeight: 600 }
              }
            >
              {compact ? g.short : g.label}
            </legend>
            <div className="chips">
              {shown.map((o) => (
                <button key={o} type="button" className="chip" aria-pressed={cur.includes(o)} onClick={() => F.toggle(g.key, o)} style={{ height: 44 }}>
                  {g.optLabel ? g.optLabel(o) : o}
                </button>
              ))}
              {extra && (hidden > 0 || open) && (
                <button type="button" className="link" aria-expanded={open} onClick={() => setMore({ ...more, [g.key]: !open })} style={{ padding: '0 8px', fontSize: 14 }}>
                  {open ? tr('Menos', 'Less') : `+${hidden}`}
                </button>
              )}
            </div>
          </fieldset>
        );
      })}
    </>
  );
}

function SetorChip({ F }: { F: FiltersApi }) {
  if (!F.f.setor) return null;
  return (
    <button type="button" className="chip" aria-pressed="true" onClick={() => F.write({ setor: null })} aria-label={tr(`Setor: ${F.f.setor}. Tirar filtro`, `Sector: ${sectorLabel(F.f.setor)}. Remove filter`)} style={{ height: 44 }}>
      {tr('Setor:', 'Sector:')} {sectorLabel(F.f.setor)} <Icon name="close" size={14} />
    </button>
  );
}

function EmptyFilters({ F }: { F: FiltersApi }) {
  return (
    <div className="stack" style={{ gap: 12, padding: '32px 0', borderTop: '1px solid var(--line)', alignItems: 'flex-start' }}>
      <span className="h2" style={{ fontSize: 22 }}>
        {tr('Nenhuma organização com estes filtros', 'No organisations match these filters')}
      </span>
      <button type="button" className="btn btn-dark btn-sm" style={{ height: 48 }} onClick={F.clear}>
        {tr('Limpar filtros', 'Clear filters')}
      </button>
    </div>
  );
}

/* ---------------- Mobile ---------------- */

function MobileRanking({ ranked, F }: { ranked: Ranked; F: FiltersApi }) {
  const [open, setOpen] = useState(false);
  const { f } = F;
  const summary = (vals: string[], all: string, fmtOne = (v: string) => v) =>
    vals.length === 0 ? all : vals.length === 1 ? fmtOne(vals[0]) : `${fmtOne(vals[0])} +${vals.length - 1}`;
  const chips = [
    { v: summary(f.tipo, tr('Todos os tipos', 'All types'), orgTypeLabel), aria: tr(`Tipo: ${f.tipo.length ? f.tipo.join(', ') : 'todos'}`, `Type: ${f.tipo.length ? f.tipo.map(orgTypeLabel).join(', ') : 'all'}`) },
    { v: summary(f.dist, tr('Todos os distritos', 'All districts')), aria: tr(`Distrito: ${f.dist.length ? f.dist.join(', ') : 'todos'}`, `District: ${f.dist.length ? f.dist.join(', ') : 'all'}`) },
    { v: summary(f.dim, tr('Qualquer dimensão', 'Any size'), sizeLabel), aria: tr(`Dimensão: ${f.dim.length ? f.dim.join(', ') : 'qualquer'}`, `Size: ${f.dim.length ? f.dim.join(', ') : 'any'}`) },
  ];
  if (f.resp) chips.push({ v: tr('Respeito ≥ 4', 'Respect ≥ 4'), aria: tr('Respeito e inclusão 4 ou mais', 'Respect and inclusion 4 or more') });
  if (f.ver) chips.push({ v: tr('Verificadas', 'Verified'), aria: tr('Só avaliações verificadas', 'Verified reviews only') });

  return (
    <div className="page" style={{ gap: 16, paddingTop: 24 }}>
      <div className="row between" style={{ alignItems: 'baseline', gap: 12 }}>
        <h1 className="h1">Ranking</h1>
        <Link to="/metodologia" className="link" style={{ fontSize: 13, fontWeight: 500 }}>
          {tr('Como calculamos', 'How we score')}
        </Link>
      </div>

      <SortToggle F={F} />

      <div className="chips">
        {chips.map((c) => (
          <button key={c.aria} type="button" className="chip" aria-label={tr(`${c.aria}. Abrir filtros`, `${c.aria}. Open filters`)} onClick={() => setOpen(true)} style={{ height: 44, fontSize: 13, padding: '0 12px' }}>
            {c.v}
          </button>
        ))}
        <SetorChip F={F} />
        <button
          type="button"
          className="icon-btn"
          aria-label={F.active ? tr(`Filtros, ${F.active} activos`, `Filters, ${F.active} active`) : tr('Mais filtros', 'More filters')}
          onClick={() => setOpen(true)}
          style={F.active ? { borderColor: 'var(--teal)' } : undefined}
        >
          <Icon name="filter" size={16} />
        </button>
      </div>

      <div className="stack">
        <span className="small muted" aria-live="polite" style={{ paddingBottom: 6 }}>
          {plural(ranked.length, tr('organização', 'organisation'), tr('organizações', 'organisations'))} · {tr(`mínimo ${MIN_REVIEWS} avaliações`, `minimum ${MIN_REVIEWS} reviews`)}
        </span>
        {ranked.length === 0 ? (
          <EmptyFilters F={F} />
        ) : (
          ranked.map(({ org, match: m }, i) => {
            const t = trendInfo(org.trend);
            return (
              <Link
                key={org.id}
                to={`/org/${org.id}`} data-ev="select_org" data-ev-org-type={org.type}
                className="plain row"
                style={{ gap: 12, padding: '12px 0', borderTop: '1px solid var(--line)', minHeight: 70 }}
              >
                <span className="stack" style={{ flex: 'none', width: 28, alignItems: 'center', lineHeight: 1.1 }}>
                  <span className="num" style={{ fontSize: 18, color: i < 3 ? 'var(--ink)' : 'var(--muted)' }}>
                    {i + 1}
                  </span>
                  <span className="mono" aria-label={t.aria} style={{ fontSize: 10, color: t.color }}>
                    {t.text}
                  </span>
                </span>
                <Ring value={org.score} size={46} inner="var(--ground)" fontSize={14} ariaLabel={tr(`Nota ${fmt(org.score)} de 5, ${org.reviewsCount} avaliações`, `Score ${fmt(org.score)} out of 5, ${org.reviewsCount} reviews`)} />
                <span className="grow stack" style={{ gap: 2 }}>
                  <span className="ellipsis" style={{ fontSize: 15, fontWeight: 600 }}>
                    {org.name}
                  </span>
                  <span className="small muted ellipsis">
                    {orgTypeLabel(org.type)} · {plural(org.people, tr('pessoa', 'person'), tr('pessoas', 'people'))}
                  </span>
                </span>
                <span className="stack" style={{ flex: 'none', alignItems: 'flex-end', lineHeight: 1.1, color: 'var(--teal-dark)' }}>
                  <span className="num" style={{ fontSize: 17 }}>
                    {m}%
                  </span>
                  <span style={{ fontSize: 11 }}>{tr('para ti', 'for you')}</span>
                </span>
              </Link>
            );
          })
        )}
      </div>

      <Sheet
        open={open}
        onClose={() => setOpen(false)}
        title={tr('Filtros', 'Filters')}
        footer={
          <div className="stack" style={{ gap: 4 }}>
            <button type="button" className="btn btn-dark btn-block" style={{ height: 56 }} onClick={() => setOpen(false)}>
              {tr('Ver', 'Show')} {plural(ranked.length, tr('organização', 'organisation'), tr('organizações', 'organisations'))}
            </button>
            {F.active > 0 && (
              <button type="button" className="link" style={{ alignSelf: 'center' }} onClick={F.clear}>
                {tr('Limpar', 'Clear')}
              </button>
            )}
          </div>
        }
      >
        <div className="stack" style={{ gap: 24, paddingTop: 8 }}>
          {F.f.setor && (
            <div className="chips">
              <SetorChip F={F} />
            </div>
          )}
          <FilterGroups F={F} />
          <div className="list" style={{ borderTop: '1px solid var(--line)' }}>
            <Switch purple checked={F.f.resp} onChange={(v) => F.write({ resp: v })} label={tr('Respeito e inclusão 4 ou mais', 'Respect and inclusion 4 or more')} hint={tr('Direitos, diversidade, sem assédio', 'Rights, diversity, no harassment')} />
            <Switch checked={F.f.ver} onChange={(v) => F.write({ ver: v })} label={tr('Só avaliações verificadas', 'Verified reviews only')} hint={tr(`Email, contrato ou recibo (${VERIFIED_MIN}% ou mais)`, `Work email, contract or payslip (${VERIFIED_MIN}% or more)`)} />
          </div>
        </div>
      </Sheet>
    </div>
  );
}

/* ---------------- Desktop ---------------- */

function DesktopRanking({ ranked, F, prefs }: { ranked: Ranked; F: FiltersApi; prefs: CriterionKey[] }) {
  const [showF, setShowF] = useState(F.active > 0);
  const [pick, setPick] = useState<string | null>(null);
  const [more, setMore] = useState(false);
  const [all, setAll] = useState(false);

  const idxFound = ranked.findIndex((r) => r.org.id === pick);
  const idx = idxFound === -1 ? 0 : idxFound;
  const shown = more ? ranked : ranked.slice(0, Math.max(DESKTOP_LIMIT, idx + 1));
  const sel = ranked[idx];

  const prefNames = prefs.map((k) => CRITERION[k].short);
  const prefText = prefNames.length > 1 ? `${prefNames.slice(0, -1).join(', ')} ${tr('e', 'and')} ${prefNames[prefNames.length - 1]}` : prefNames[0] ?? '';

  return (
    <div className="container" style={{ paddingBottom: 64 }}>
      <div className="row wrap between" style={{ alignItems: 'flex-end', gap: 24, padding: '32px 0 24px' }}>
        <div className="stack" style={{ gap: 10, minWidth: 0 }}>
          <h1 className="h1" style={{ fontSize: 'clamp(36px, 4vw, 52px)', lineHeight: 1 }}>
            Ranking
          </h1>
          <p className="body" style={{ margin: 0, fontSize: 15 }}>
            {F.sort === 'mim' ? tr(`Ordenado por ${prefText}`, `Sorted by ${prefText}`) : tr('Ordenado pela nota pública', 'Sorted by public score')} ·{' '}
            <Link to="/preferencias" style={{ textDecoration: 'none', fontWeight: 600 }}>
              {tr('Mudar', 'Change')}
            </Link>{' '}
            ·{' '}
            <Link to="/metodologia" style={{ textDecoration: 'none', fontWeight: 600 }}>
              {tr('Como calculamos', 'How we score')}
            </Link>
          </p>
        </div>
        <div className="row wrap" style={{ gap: 10 }}>
          <SortToggle F={F} big />
          <button
            type="button"
            aria-expanded={showF}
            aria-controls="filtros"
            onClick={() => setShowF(!showF)}
            className="row"
            style={{
              gap: 8, height: 52, padding: '0 18px', borderRadius: 999, background: 'var(--surface)', fontSize: 15, fontWeight: 600,
              border: `1px solid ${F.active ? 'var(--teal)' : 'var(--field)'}`,
            }}
          >
            <Icon name="filter" size={18} />
            {F.active ? tr(`Filtros · ${F.active}`, `Filters · ${F.active}`) : tr('Filtros', 'Filters')}
          </button>
        </div>
      </div>

      {showF && (
        <section
          id="filtros"
          aria-label={tr('Filtros', 'Filters')}
          className="fade-up row wrap"
          style={{ gap: '24px 40px', alignItems: 'flex-start', padding: '20px 0 24px', marginBottom: 8, borderTop: '1px solid var(--line)', borderBottom: '1px solid var(--line)' }}
        >
          <FilterGroups F={F} compact />
          <div className="stack" style={{ gap: 0, minWidth: 260 }}>
            <Switch purple checked={F.f.resp} onChange={(v) => F.write({ resp: v })} label={<span style={{ color: 'var(--purple-text)' }}>{tr('Respeito e inclusão ≥ 4', 'Respect and inclusion ≥ 4')}</span>} />
            <Switch checked={F.f.ver} onChange={(v) => F.write({ ver: v })} label={tr('Só verificadas', 'Verified only')} />
          </div>
          {F.f.setor && (
            <fieldset style={{ border: 0, margin: 0, padding: 0 }}>
              <legend style={{ padding: '0 0 8px', fontSize: 13, fontWeight: 600, color: 'var(--muted)' }}>{tr('Setor', 'Sector')}</legend>
              <SetorChip F={F} />
            </fieldset>
          )}
          <button type="button" className="link" style={{ alignSelf: 'flex-end', fontSize: 14 }} onClick={F.clear}>
            {tr('Limpar filtros', 'Clear filters')}
          </button>
        </section>
      )}

      <div className="row wrap" style={{ gap: 48, alignItems: 'flex-start' }}>
        <section aria-label={tr('Lista do ranking', 'Ranking list')} className="stack" style={{ flex: '1.6 1 520px', minWidth: 0 }}>
          <span aria-live="polite" className="small muted" style={{ padding: '0 0 8px 4px' }}>
            {plural(ranked.length, tr('organização', 'organisation'), tr('organizações', 'organisations'))} · {tr(`mínimo ${MIN_REVIEWS} avaliações`, `minimum ${MIN_REVIEWS} reviews`)}
          </span>
          {ranked.length === 0 && <EmptyFilters F={F} />}
          {shown.map(({ org, match: m }, i) => {
            const on = i === idx;
            return (
              <button
                key={org.id}
                type="button"
                aria-pressed={on}
                onClick={() => {
                  setPick(org.id);
                  setAll(false);
                }}
                className="row rk-row"
                style={{
                  gap: 16, width: '100%', padding: '10px 12px', border: 0, borderTop: '1px solid var(--line)',
                  borderLeft: `3px solid ${on ? 'var(--teal)' : 'transparent'}`, background: on ? 'var(--surface)' : 'transparent', textAlign: 'left', minHeight: 70,
                }}
              >
                <span className="num" style={{ flex: 'none', width: 26, fontSize: 18, color: i < 3 ? 'var(--ink)' : 'var(--muted)' }}>
                  {i + 1}
                </span>
                <Ring value={org.score} size={48} fontSize={15} />
                <span className="grow stack" style={{ gap: 3 }}>
                  <span className="ellipsis" style={{ fontSize: 16, fontWeight: 600 }}>
                    {org.name}
                  </span>
                  <span className="small muted">
                    {orgTypeLabel(org.type)} · {org.district}
                  </span>
                </span>
                <span className="pill pill-match" style={{ fontSize: 13, padding: '6px 10px' }}>
                  {tr(`${m}% para ti`, `${m}% for you`)}
                </span>
              </button>
            );
          })}
          {shown.length < ranked.length && (
            <button type="button" className="btn btn-ghost" style={{ alignSelf: 'flex-start', marginTop: 12, height: 48, fontSize: 15 }} onClick={() => setMore(true)}>
              {tr(`Ver mais ${ranked.length - shown.length}`, `Show ${ranked.length - shown.length} more`)}
            </button>
          )}
        </section>

        {sel && (
          <aside
            aria-label={tr('Pré-visualização', 'Preview')}
            aria-live="polite"
            className="card"
            style={{ flex: '1 1 340px', minWidth: 300, position: 'sticky', top: 24, padding: 28, borderRadius: 'var(--r-xl)' }}
          >
            <Preview key={sel.org.id} org={sel.org} m={sel.match} pos={idx + 1} prefs={prefs} all={all} setAll={setAll} />
          </aside>
        )}
      </div>
      <style>{`.rk-row{transition:background .15s}.rk-row:hover{background:var(--surface)!important}`}</style>
    </div>
  );
}

function Preview({ org, m, pos, prefs, all, setAll }: { org: Org; m: number; pos: number; prefs: CriterionKey[]; all: boolean; setAll: (v: boolean) => void }) {
  const order: CriterionKey[] = all ? [...prefs, ...CRITERIA.map((c) => c.key).filter((k) => !prefs.includes(k))] : prefs;
  return (
    <div className="fade-up stack" style={{ gap: 22 }}>
      <div className="stack" style={{ gap: 4 }}>
        <span className="small muted" style={{ fontWeight: 600 }}>
          #{pos} · {orgTypeLabel(org.type)}
        </span>
        <h2 className="h2" style={{ fontSize: 24, lineHeight: 1.1 }}>
          {org.name}
        </h2>
      </div>
      <div className="row" style={{ gap: 18 }}>
        <Ring value={org.score} size={112} thickness={10} fontSize={34} />
        <div className="stack" style={{ gap: 8 }}>
          <span className="pill pill-match" style={{ alignSelf: 'flex-start', fontSize: 14, padding: '6px 12px' }}>
            {tr(`${m}% para ti`, `${m}% for you`)}
          </span>
          <span className="small muted">{plural(org.reviewsCount, tr('avaliação', 'review'), tr('avaliações', 'reviews'))}</span>
        </div>
      </div>
      <div className="stack" style={{ gap: 10 }}>
        {order.map((k) => {
          const c = CRITERION[k];
          const v = org.scores[k];
          const r = k === 'respeito';
          return (
            <div key={k} role="img" aria-label={`${c.label} ${v == null ? tr('não se aplica', 'not applicable') : tr(`${fmt(v)} de 5`, `${fmt(v)} out of 5`)}`} className="row" style={{ gap: 10 }}>
              <span className="grow" style={{ fontSize: 14, fontWeight: r ? 600 : 400, color: r ? 'var(--purple-text)' : 'var(--body)' }}>
                {c.label}
              </span>
              <Dots value={v} color={c.color} />
              <span className="mono" style={{ width: 28, textAlign: 'right', fontSize: 13, color: r ? 'var(--purple-text)' : 'var(--body)' }}>
                {v == null ? '—' : fmt(v)}
              </span>
            </div>
          );
        })}
        <button type="button" className="link" aria-expanded={all} onClick={() => setAll(!all)} style={{ alignSelf: 'flex-start', fontSize: 14 }}>
          {all ? tr('Ver só os 3 que valorizas', 'Show only the 3 you value') : tr(`Ver os ${CRITERIA.length} critérios`, `Show all ${CRITERIA.length} criteria`)}
        </button>
      </div>
      <Link to={`/org/${org.id}`} data-ev="select_org" data-ev-org-type={org.type} className="btn btn-primary lift" style={{ height: 54 }}>
        {tr('Ver página', 'View page')} <Icon name="next" size={18} />
      </Link>
      <Link to="/metodologia" className="link" style={{ alignSelf: 'center', fontSize: 13, fontWeight: 500 }}>
        {tr('Como calculamos a nota', 'How we calculate the score')}
      </Link>
    </div>
  );
}
