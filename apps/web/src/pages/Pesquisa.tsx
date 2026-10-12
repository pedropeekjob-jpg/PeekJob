import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { Shell } from '../components/Layout';
import { Ring } from '../components/Data';
import { Icon } from '../components/Icon';
import { LogoAnimated } from '../components/Brand';
import { CRITERION } from '../data/criteria';
import { ORG_TYPES, type Org } from '../data/orgs';
import { useSearch, useOrgs } from '../api/orgs';
import { match } from '../lib/match';
import { useStore } from '../lib/store';
import { useIsDesktop } from '../lib/useMedia';
import { fmt, plural } from '../lib/format';
import { useSearchTracking } from '../analytics/useSearchTracking';
import { tr } from '../i18n';
import { orgTypeLabel } from '../i18n/labels';

const SEARCH_MS = 900;
const LIMIT = 6;
const TYPES = ['Todas', ...ORG_TYPES] as const;
type TypeFilter = (typeof TYPES)[number];

interface Result {
  org: Org;
  match: number | null;
}

export default function Pesquisa() {
  const [params, setParams] = useSearchParams();
  const urlQ = params.get('q') ?? '';
  const desktop = useIsDesktop();
  const orgs = useOrgs();
  const { prefs } = useStore();

  const [text, setText] = useState(urlQ);
  const [type, setType] = useState<TypeFilter>('Todas');
  const [more, setMore] = useState(false);
  const [applied, setApplied] = useState(urlQ);
  const [loading, setLoading] = useState(urlQ.trim() !== '');

  // o URL manda: se mudar por fora (voltar atrás, link do início), actualiza o campo
  useEffect(() => {
    setText((t) => (t === urlQ ? t : urlQ));
  }, [urlQ]);

  // cada mudança da pesquisa mostra "A procurar" durante ~900 ms e só depois os resultados
  const appliedRef = useRef(applied);
  appliedRef.current = applied;
  useEffect(() => {
    if (urlQ.trim() === appliedRef.current.trim() && !loading) return;
    setLoading(true);
    const t = window.setTimeout(() => {
      setApplied(urlQ);
      setLoading(false);
      setMore(false);
    }, SEARCH_MS);
    return () => window.clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [urlQ]);

  const onText = (v: string) => {
    setText(v);
    setParams(v ? { q: v } : {}, { replace: true });
  };
  const clear = () => onText('');
  const pickType = (t: TypeFilter) => {
    setType(t);
    setMore(false);
  };
  const reset = () => {
    onText('');
    pickType('Todas');
  };

  const found = useSearch(applied, { type });
  useSearchTracking('pesquisa', applied, found.items.length, found.loading, type);
  const results: Result[] = useMemo(
    () =>
      found.items
        .map((o) => ({
          org: o,
          match: o.reviewsCount > 0 ? (prefs.length ? match(o, prefs) : Math.round((o.score / 5) * 100)) : null,
        }))
        .sort((a, b) => (b.match ?? -1) - (a.match ?? -1) || b.org.score - a.org.score),
    [found.items, prefs],
  );

  const view: ViewProps = {
    text, onText, clear, type, pickType, reset, loading, results, applied, total: orgs.length, more, setMore,
  };
  return <Shell chrome="full">{desktop ? <DesktopPesquisa {...view} /> : <MobilePesquisa {...view} />}</Shell>;
}

interface ViewProps {
  text: string;
  onText: (v: string) => void;
  clear: () => void;
  type: TypeFilter;
  pickType: (t: TypeFilter) => void;
  reset: () => void;
  loading: boolean;
  results: Result[];
  applied: string;
  total: number;
  more: boolean;
  setMore: (v: boolean) => void;
}

/* ---------- mobile ---------- */

function MobilePesquisa({ text, onText, clear, type, pickType, loading, results, applied, total }: ViewProps) {
  const navigate = useNavigate();
  const back = () => {
    const idx = (window.history.state as { idx?: number } | null)?.idx ?? 0;
    if (idx > 0) navigate(-1);
    else navigate('/');
  };
  const n = results.length;
  return (
    <div className="page no-nav" style={{ minHeight: '100dvh', gap: 0, paddingBottom: 0 }}>
      <div className="row" style={{ gap: 10, paddingBottom: 16 }}>
        <button type="button" className="icon-btn bare" aria-label={tr('Voltar', 'Back')} onClick={back} style={{ marginLeft: -8 }}>
          <Icon name="back" />
        </button>
        <SearchBox id="mq" text={text} onText={onText} clear={clear} height={52} />
      </div>

      <TypeChips type={type} pickType={pickType} small />

      {loading ? (
        <Searching total={total} />
      ) : (
        <div className="stack fade-up" style={{ paddingTop: 20 }}>
          <div aria-live="polite" className="small muted" style={{ paddingBottom: 8 }}>
            {n === 1 ? tr('1 resultado, ordenado para ti', '1 result, sorted for you') : tr(`${n} resultados, ordenados para ti`, `${n} results, sorted for you`)}
          </div>
          {results.map((r) => (
            <ResultRow key={r.org.id} r={r} />
          ))}
          {n === 0 && (
            <div className="stack" style={{ gap: 6, padding: '20px 0', borderTop: '1px solid var(--line)' }}>
              <div style={{ fontSize: 16, fontWeight: 600 }}>{applied.trim() ? tr(`Nada encontrado para “${applied.trim()}”`, `Nothing found for “${applied.trim()}”`) : tr('Nada encontrado com este filtro', 'Nothing found with this filter')}</div>
              <div className="small body">{tr('Confirma o nome ou adiciona-a ao avaliar.', 'Check the name, or add it when you review.')}</div>
            </div>
          )}
        </div>
      )}

      <div className="row between" style={{ marginTop: 'auto', gap: 12, padding: '16px 0 calc(24px + env(safe-area-inset-bottom))', borderTop: '1px solid var(--line)' }}>
        <span className="small body">{tr('Não encontras a tua?', 'Can’t find yours?')}</span>
        <Link to="/avaliar" className="link" style={{ fontSize: 15 }}>
          {tr('Adicionar e avaliar', 'Add and review')}
        </Link>
      </div>
    </div>
  );
}

function ResultRow({ r, desktop = false }: { r: Result; desktop?: boolean }) {
  const { org } = r;
  const size = desktop ? 52 : 46;
  return (
    <Link
      to={`/org/${org.id}`} data-ev="select_org" data-ev-org-type={org.type}
      className="plain row pj-res"
      style={{ gap: desktop ? 16 : 12, padding: desktop ? '14px 12px' : '12px 0', borderTop: '1px solid var(--line)', borderRadius: desktop ? 4 : 0, minHeight: 70 }}
    >
      <Ring
        value={org.score}
        size={size}
        thickness={desktop ? 6 : 5}
        fontSize={desktop ? 16 : 15}
        inner={desktop ? 'var(--surface)' : 'var(--ground)'}
        muted={!org.reviewsCount}
        ariaLabel={org.reviewsCount ? tr(`Nota ${fmt(org.score)} de 5, ${plural(org.reviewsCount, 'avaliação', 'avaliações')}`, `Score ${fmt(org.score)} out of 5, ${plural(org.reviewsCount, 'review', 'reviews')}`) : tr('Ainda sem avaliações', 'No reviews yet')}
      />
      <span className="grow stack" style={{ gap: desktop ? 3 : 2 }}>
        <span className="ellipsis" style={{ fontSize: desktop ? 16 : 15, fontWeight: 600 }}>
          {org.name}
        </span>
        <span className="small muted ellipsis">
          {orgTypeLabel(org.type)} · {org.city}
        </span>
      </span>
      {r.match == null ? (
        <span className="small muted" style={{ flex: 'none' }}>
          {tr('Sem avaliações', 'No reviews')}
        </span>
      ) : desktop ? (
        <span className="pill pill-match" style={{ fontSize: 13, padding: '7px 11px' }}>
          {tr(`${r.match}% para ti`, `${r.match}% for you`)}
        </span>
      ) : (
        <span className="stack" style={{ flex: 'none', alignItems: 'flex-end', lineHeight: 1.1, color: 'var(--teal-dark)' }}>
          <span className="num" style={{ fontSize: 17 }}>
            {r.match}%
          </span>
          <span style={{ fontSize: 11 }}>{tr('para ti', 'for you')}</span>
        </span>
      )}
    </Link>
  );
}

function SearchBox({ id, text, onText, clear, height, large = false }: { id: string; text: string; onText: (v: string) => void; clear: () => void; height: number; large?: boolean }) {
  const ref = useRef<HTMLInputElement>(null);
  return (
    <div className="search grow pj-sbox" style={{ height, borderRadius: large ? 20 : 18, padding: large ? '0 10px 0 22px' : '0 8px 0 14px', gap: large ? 14 : 8 }}>
      <Icon name="search" size={large ? 22 : 18} style={{ color: large ? 'var(--body)' : 'var(--muted)', flex: 'none' }} />
      <label htmlFor={id} className="sr-only">
        {tr('Pesquisar organização', 'Search organisations')}
      </label>
      <input
        ref={ref}
        id={id}
        type="search"
        value={text}
        onChange={(e) => onText(e.target.value)}
        placeholder={tr('Nome, setor ou cidade', 'Name, sector or city')}
        autoComplete="off"
        enterKeyHint="search"
        style={{ fontSize: large ? 18 : 16 }}
      />
      {text && (
        <button
          type="button"
          aria-label={tr('Limpar pesquisa', 'Clear search')}
          onClick={() => {
            clear();
            ref.current?.focus();
          }}
          style={{ flex: 'none', width: 44, height: 44, borderRadius: 22, border: 0, background: 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 0 }}
        >
          <span style={{ width: large ? 44 : 32, height: large ? 44 : 32, borderRadius: 22, background: 'var(--soft)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--body)' }}>
            <Icon name="close" size={large ? 16 : 14} stroke={2} />
          </span>
        </button>
      )}
      <style>{'.pj-sbox:focus-within{box-shadow:0 0 0 4px var(--teal-tint)}.pj-sbox input::-webkit-search-cancel-button{display:none}.pj-res{transition:background .15s}@media (hover:hover){.pj-res:hover{background:var(--surface)}}'}</style>
    </div>
  );
}

function TypeChips({ type, pickType, small = false }: { type: TypeFilter; pickType: (t: TypeFilter) => void; small?: boolean }) {
  return (
    <div role="group" aria-label={tr('Tipo de organização', 'Type of organisation')} className="chips">
      {TYPES.map((t) => (
        <button
          key={t}
          type="button"
          className="chip dark"
          aria-pressed={type === t}
          onClick={() => pickType(t)}
          style={{ height: 44, padding: small ? '0 14px' : '0 18px', fontSize: small ? 13 : 15, borderWidth: small ? 1 : 1.5, cursor: 'pointer' }}
        >
          {orgTypeLabel(t)}
        </button>
      ))}
    </div>
  );
}

/** Estado "A procurar": logo animado pequeno e cartões esqueleto */
function Searching({ total, desktop = false }: { total: number; desktop?: boolean }) {
  const widths: [number, number][] = [
    [70, 45],
    [85, 60],
    [60, 35],
    [78, 53],
    [66, 41],
  ];
  return (
    <div className="stack fade-up" style={{ gap: 18 }}>
      <div role="status" className="stack" style={{ alignItems: 'center', gap: 10, padding: desktop ? '20px 0 8px' : '26px 0 8px', textAlign: 'center' }}>
        <LogoAnimated width={170} label={tr('A procurar', 'Searching')} />
        <div className="num" style={{ fontSize: 19 }}>
          {tr(`A espreitar ${total} organizações…`, `Peeking at ${total} organisations…`)}
        </div>
        <div className="small muted">{tr('Ordenadas pelo que valorizas', 'Sorted by what you value')}</div>
      </div>
      <div className="stack" aria-hidden="true" style={{ gap: 10 }}>
        {widths.map(([a, b], i) => (
          <div key={i} className="row" style={{ gap: 12, background: 'var(--surface)', border: '1px solid var(--line)', borderRadius: 22, padding: 14 }}>
            <span className="sk" style={{ flex: 'none', width: 50, height: 50, borderRadius: '50%' }} />
            <span className="grow stack" style={{ gap: 8 }}>
              <span className="sk" style={{ height: 12, width: `${a}%`, borderRadius: 6 }} />
              <span className="sk" style={{ height: 10, width: `${b}%`, borderRadius: 5 }} />
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ---------- desktop ---------- */

function DesktopPesquisa({ text, onText, clear, type, pickType, reset, loading, results, applied, total, more, setMore }: ViewProps) {
  const { prefs } = useStore();
  const n = results.length;
  const shown = more ? results : results.slice(0, LIMIT);
  return (
    <div className="container" style={{ paddingBottom: 64 }}>
      <section className="stack" style={{ paddingTop: 32, gap: 20, maxWidth: 860 }}>
        <h1 className="display" style={{ fontSize: 'clamp(36px, 3.6vw, 48px)', lineHeight: 1, letterSpacing: '-0.01em' }}>
          {tr('Procurar uma organização', 'Find an organisation')}
        </h1>
        <div className="row">
          <SearchBox id="dq" text={text} onText={onText} clear={clear} height={64} large />
        </div>
        <TypeChips type={type} pickType={pickType} />
      </section>

      <div className="row wrap" style={{ gap: 64, alignItems: 'flex-start', paddingTop: 40 }}>
        <section aria-label={tr('Resultados', 'Results')} className="stack" style={{ flex: '2.3 1 560px', minWidth: 0 }}>
          {loading ? (
            <Searching total={total} desktop />
          ) : (
            <div className="stack fade-up">
              <div aria-live="polite" className="small muted" style={{ paddingBottom: 8 }}>
                {n === 1 ? tr('1 resultado', '1 result') : tr(`${n} resultados`, `${n} results`)}{tr(', por compatibilidade', ', by match')}
              </div>
              {shown.map((r) => (
                <ResultRow key={r.org.id} r={r} desktop />
              ))}
              {!more && n > LIMIT && (
                <button type="button" className="btn btn-ghost" onClick={() => setMore(true)} style={{ alignSelf: 'flex-start', marginTop: 12, height: 48, borderRadius: 16, fontSize: 15 }}>
                  {tr(`Ver mais ${n - LIMIT}`, `Show ${n - LIMIT} more`)}
                </button>
              )}
              {n === 0 && (
                <div className="stack" style={{ borderTop: '1px solid var(--line)', padding: '32px 0', alignItems: 'flex-start', gap: 12 }}>
                  <div className="num" style={{ fontSize: 24 }}>
                    {applied.trim() ? tr(`Nada encontrado para “${applied.trim()}”`, `Nothing found for “${applied.trim()}”`) : tr('Nada encontrado com este filtro', 'Nothing found with this filter')}
                  </div>
                  <div className="body" style={{ fontSize: 15 }}>
                    {tr('Experimenta outro nome ou tipo de organização.', 'Try another name or type of organisation.')}
                  </div>
                  <div className="row wrap" style={{ gap: 10, paddingTop: 6 }}>
                    <button type="button" className="btn btn-ghost" onClick={reset} style={{ borderRadius: 16, fontSize: 15 }}>
                      {tr('Limpar filtros', 'Clear filters')}
                    </button>
                    <Link to="/avaliar" className="btn btn-primary" style={{ borderRadius: 16, fontSize: 15 }}>
                      {tr('Adicionar e avaliar', 'Add and review')}
                    </Link>
                  </div>
                </div>
              )}
            </div>
          )}
        </section>

        <aside className="stack" style={{ flex: '1 1 280px', minWidth: 0, position: 'sticky', top: 24, gap: 32, paddingTop: 28 }}>
          <div className="stack" style={{ gap: 12 }}>
            <h2 className="small muted" style={{ margin: 0, fontWeight: 600 }}>
              {prefs.length ? tr('Ordenado pelo que valorizas', 'Sorted by what you value') : tr('Ordenado pela nota', 'Sorted by score')}
            </h2>
            {prefs.map((k, i) => (
              <span key={k} className="row" style={{ gap: 10, fontSize: 15, fontWeight: 500 }}>
                <span
                  aria-hidden="true"
                  style={{ width: 26, height: 26, borderRadius: 13, border: `3px solid ${CRITERION[k].color}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 12 }}
                >
                  {i + 1}
                </span>
                {CRITERION[k].label}
              </span>
            ))}
            <Link to="/preferencias" className="link" style={{ fontSize: 14 }}>
              {tr('Mudar o que valorizo →', 'Change what I value →')}
            </Link>
          </div>
          <div className="stack" style={{ gap: 12, paddingTop: 24, borderTop: '1px solid var(--line)' }}>
            <h2 className="display" style={{ fontSize: 22, lineHeight: 1.1 }}>
              {tr('Não encontras?', 'Can’t find it?')}
            </h2>
            <p className="body" style={{ margin: 0, fontSize: 15 }}>
              {tr('Adiciona-a quando a avaliares.', 'Add it when you review it.')}
            </p>
            <Link to="/avaliar" className="btn btn-dark" style={{ alignSelf: 'flex-start', borderRadius: 16, fontSize: 15 }}>
              {tr('Adicionar e avaliar', 'Add and review')}
            </Link>
          </div>
        </aside>
      </div>
    </div>
  );
}
