import { useEffect, useLayoutEffect, useMemo, useRef, useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Shell } from '../components/Layout';
import { Ring } from '../components/Data';
import { Icon } from '../components/Icon';
import { Logo } from '../components/Brand';
import { CRITERIA, CRITERION, type CriterionKey } from '../data/criteria';
import { ORG_BY_ID, type Org } from '../data/orgs';
import { WEEK_TAGS } from '../data/content';
import { useOrgs, useRankedOrgs } from '../api/orgs';
import { useStore } from '../lib/store';
import { useIsDesktop } from '../lib/useMedia';
import { fmt } from '../lib/format';
import { tr } from '../i18n';
import { orgTypeLabel, tagLabel } from '../i18n/labels';

/* ---------- dados derivados ---------- */

/** Organizações "para ti". Sem prioridades escolhidas, ordena pela nota (a % passa a ser a nota em percentagem). */
function useForYou() {
  const ranked = useRankedOrgs();
  const { prefs } = useStore();
  return useMemo(() => {
    if (prefs.length) return ranked;
    return ranked
      .map(({ org }) => ({ org, match: Math.round((org.score / 5) * 100) }))
      .sort((a, b) => b.match - a.match);
  }, [ranked, prefs]);
}

/** Quem mais mexeu na nota esta semana: subidas primeiro (maior primeiro), depois descidas */
function useMovers() {
  const orgs = useOrgs();
  return useMemo(() => {
    const withDelta = orgs.filter((o) => o.reviewsCount > 0 && o.weekDelta !== 0);
    const ups = withDelta.filter((o) => o.weekDelta > 0).sort((a, b) => b.weekDelta - a.weekDelta || (typeof b.trend === 'number' ? b.trend : 0) - (typeof a.trend === 'number' ? a.trend : 0));
    const downs = withDelta.filter((o) => o.weekDelta < 0).sort((a, b) => a.weekDelta - b.weekDelta);
    return { ups, downs };
  }, [orgs]);
}

const deltaText = (o: Org) => `${o.weekDelta > 0 ? '▲' : '▼'} ${fmt(Math.abs(o.weekDelta))}`;
const deltaColor = (o: Org) => (o.weekDelta > 0 ? 'var(--up)' : 'var(--down)');
const tintOf = (k: CriterionKey) => (k === 'respeito' ? 'var(--purple-tint)' : 'var(--teal-tint)');

/* ---------- reordenação animada (FLIP) ---------- */

function useFlip(order: string) {
  const els = useRef(new Map<string, HTMLElement>());
  const prev = useRef(new Map<string, DOMRect>());
  useLayoutEffect(() => {
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    els.current.forEach((el, id) => {
      const before = prev.current.get(id);
      const now = el.getBoundingClientRect();
      if (before && !reduce) {
        const dx = before.left - now.left;
        const dy = before.top - now.top;
        if (dx || dy) {
          el.animate([{ transform: `translate(${dx}px, ${dy}px)` }, { transform: 'none' }], { duration: 380, easing: 'cubic-bezier(.2,.8,.2,1)' });
        }
      } else if (!before && prev.current.size && !reduce) {
        el.animate([{ opacity: 0, transform: 'translateY(6px)' }, { opacity: 1, transform: 'none' }], { duration: 300, easing: 'ease-out' });
      }
    });
    const next = new Map<string, DOMRect>();
    els.current.forEach((el, id) => next.set(id, el.getBoundingClientRect()));
    prev.current = next;
  }, [order]);
  return (id: string) => (el: HTMLElement | null) => {
    if (el) els.current.set(id, el);
    else els.current.delete(id);
  };
}

/* ---------- página ---------- */

export default function Inicio() {
  const { onboarded } = useStore();
  const navigate = useNavigate();
  const desktop = useIsDesktop();

  useEffect(() => {
    if (!onboarded) navigate('/preferencias', { replace: true });
  }, [onboarded, navigate]);

  if (!onboarded) return null;
  return <Shell nav>{desktop ? <DesktopInicio /> : <MobileInicio />}</Shell>;
}

/* ---------- mobile ---------- */

function MobileInicio() {
  const { prefs } = useStore();
  const list = useForYou().slice(0, 3);
  const { ups, downs } = useMovers();
  const movers = [...ups.slice(0, 2), ...downs.slice(0, 1)];

  return (
    <div className="page">
      <div className="row between">
        <Link to="/" aria-label="PeekJob"><Logo height={44} /></Link>
        <Link to="/perfil" className="icon-btn" aria-label={tr('Perfil', 'Profile')}>
          <Icon name="user" size={18} />
        </Link>
      </div>

      <h1 className="display" style={{ fontSize: 36, letterSpacing: '-0.02em' }}>
        {tr('Como é trabalhar lá dentro?', 'What’s it like to work there?')}
      </h1>

      <div className="stack" style={{ gap: 10 }}>
        <BigAction to="/pesquisa" icon="search" title={tr('Procurar uma organização', 'Find an organisation')} sub={tr('PME, associações, voluntariado', 'SMEs, associations, volunteering')} />
        <BigAction to="/avaliar" icon="plus" title={tr('Avaliar onde trabalho', 'Review where I work')} sub={tr('2 minutos · anónimo', '2 minutes · anonymous')} primary />
      </div>

      <section className="stack" style={{ gap: 10 }} aria-labelledby="para-ti-m">
        <div className="row between" style={{ alignItems: 'baseline' }}>
          <h2 id="para-ti-m" className="h2">
            {tr('Para ti', 'For you')}
          </h2>
          <Link to="/preferencias" className="link small" style={{ fontWeight: 500 }}>
            {tr('Mudar prioridades', 'Change priorities')}
          </Link>
        </div>
        <div className="small muted" style={{ marginTop: -8 }}>
          {prefs.length ? tr(`Pela tua ordem: ${prefs.map((k) => CRITERION[k].short).join(', ')}`, `In your order: ${prefs.map((k) => CRITERION[k].short).join(', ')}`) : tr('Sem prioridades: ordenado pela nota', 'No priorities: sorted by score')}
        </div>
        <div className="stack" style={{ gap: 8 }}>
          {list.map(({ org, match }) => (
            <Link
              key={org.id}
              to={`/org/${org.id}`} data-ev="select_org" data-ev-org-type={org.type}
              className="plain row lift"
              style={{ gap: 12, background: 'var(--surface)', border: '1px solid var(--line)', borderRadius: 20, padding: '10px 14px 10px 10px', minHeight: 68 }}
            >
              <Ring value={org.score} size={46} thickness={5} fontSize={15} />
              <span className="grow stack" style={{ gap: 2 }}>
                <span className="ellipsis" style={{ fontSize: 15, fontWeight: 600 }}>
                  {org.name}
                </span>
                <span className="small muted ellipsis">
                  {orgTypeLabel(org.type)} · {org.city}
                </span>
              </span>
              <span className="stack" style={{ alignItems: 'flex-end', lineHeight: 1.1, color: 'var(--teal-dark)', flex: 'none' }}>
                <span className="num" style={{ fontSize: 18 }}>
                  {match}%
                </span>
                <span style={{ fontSize: 11 }}>{tr('para ti', 'for you')}</span>
              </span>
            </Link>
          ))}
        </div>
      </section>

      <section aria-label={tr('Pulso da semana', 'This week’s pulse')} className="row" style={{ gap: 12, minHeight: 44, borderTop: '1px solid var(--line)', paddingTop: 6 }}>
        <Link to="/ranking" className="label" style={{ textDecoration: 'none', padding: '12px 0', flex: 'none' }}>
          {tr('Pulso', 'Pulse')}
        </Link>
        <div className="grow row pj-strip" style={{ gap: 16, overflowX: 'auto', whiteSpace: 'nowrap' }}>
          {movers.map((o) => (
            <Link key={o.id} to={`/org/${o.id}`} data-ev="select_org" data-ev-org-type={o.type} className="plain row" style={{ flex: 'none', alignItems: 'baseline', gap: 6, padding: '12px 0', fontSize: 13, fontWeight: 500 }}>
              {o.name}
              <span className="mono" style={{ fontSize: 12, color: deltaColor(o) }}>
                {deltaText(o)}
              </span>
            </Link>
          ))}
          {WEEK_TAGS.map((t) => (
            <span key={t.label} className="row" style={{ flex: 'none', alignItems: 'baseline', gap: 6, padding: '12px 0', fontSize: 13, color: 'var(--body)' }}>
              «{tagLabel(t.label)}»
              <span className="mono" style={{ fontSize: 12, color: t.up ? 'var(--up)' : 'var(--down)' }}>
                {t.up ? '▲' : '▼'} {t.n}
              </span>
            </span>
          ))}
        </div>
        <style>{'.pj-strip{scrollbar-width:none}.pj-strip::-webkit-scrollbar{display:none}'}</style>
      </section>
    </div>
  );
}

function BigAction({ to, icon, title, sub, primary = false }: { to: string; icon: string; title: string; sub: string; primary?: boolean }) {
  return (
    <Link
      to={to}
      className="plain row lift"
      style={{
        gap: 16,
        padding: '16px 18px',
        minHeight: 80,
        borderRadius: 24,
        background: primary ? 'var(--teal)' : 'var(--surface)',
        border: primary ? '1px solid var(--teal)' : '1px solid var(--line)',
      }}
    >
      <span style={{ flex: 'none', width: 48, height: 48, borderRadius: 24, border: '4px solid var(--ink)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <Icon name={icon} size={18} stroke={2.2} />
      </span>
      <span className="stack" style={{ gap: 2 }}>
        <span className="num" style={{ fontSize: 20 }}>
          {title}
        </span>
        <span style={{ fontSize: 13, color: primary ? '#01323A' : 'var(--body)' }}>{sub}</span>
      </span>
    </Link>
  );
}

/* ---------- desktop ---------- */

const STARS: { id: string; label?: () => string; value: (o: Org) => number; size: number; x: string; y: string; delay: string; purple?: boolean }[] = [
  { id: 'padaria-ribeira', value: (o) => o.score, size: 168, x: '24%', y: '10%', delay: '0s' },
  { id: 'padaria-ribeira', label: () => tr('Respeito e inclusão', 'Respect and inclusion'), value: (o) => o.scores.respeito ?? 0, size: 104, x: '64%', y: '2%', delay: '-1.4s', purple: true },
  { id: 'maos-dadas', value: (o) => o.score, size: 116, x: '56%', y: '46%', delay: '-3s' },
  { id: 'rede-vizinha', value: (o) => o.score, size: 90, x: '6%', y: '58%', delay: '-4.2s' },
  { id: 'estudio-lume', value: (o) => o.score, size: 70, x: '32%', y: '70%', delay: '-2.1s' },
];

const PROMISES = () => [
  { purple: false, t: tr('Ninguém paga para subir', 'No one pays to rank higher'), d: tr('nem para esconder avaliações.', 'or to hide reviews.') },
  { purple: false, t: tr('Verificação anónima', 'Anonymous verification'), d: tr('confirmamos sem guardar o teu nome.', 'we confirm without keeping your name.') },
  { purple: true, t: tr('Sem insultos', 'No insults'), d: tr('críticas duras sim, ataques a pessoas não.', 'tough criticism yes, personal attacks no.') },
];

function DesktopInicio() {
  const { prefs, togglePref } = useStore();
  const navigate = useNavigate();
  const [q, setQ] = useState('');
  const list = useForYou().slice(0, 4);
  const { ups, downs } = useMovers();
  const flip = useFlip(list.map((x) => x.org.id).join('|'));

  const onSearch = (e: FormEvent) => {
    e.preventDefault();
    const t = q.trim();
    navigate(t ? `/pesquisa?q=${encodeURIComponent(t)}` : '/pesquisa');
  };

  // fita do pulso: alternar subidas, descidas e temas da semana
  const tick: { key: string; label: string; d: string; up: boolean; to?: string }[] = [];
  const ms = [...ups, ...downs];
  const mixed: Org[] = [];
  for (let i = 0, u = 0, d = 0; i < ms.length; i++) {
    if ((i % 3 === 2 && d < downs.length) || u >= ups.length) mixed.push(downs[d++]);
    else mixed.push(ups[u++]);
  }
  mixed.forEach((o) => tick.push({ key: o.id, label: o.name, d: deltaText(o), up: o.weekDelta > 0, to: `/org/${o.id}` }));
  WEEK_TAGS.forEach((t) => tick.push({ key: 'tag-' + t.label, label: tr(`«${t.label}» em avaliações`, `«${tagLabel(t.label)}» in reviews`), d: `${t.up ? '▲' : '▼'} ${t.n}`, up: t.up }));

  const n = prefs.length;
  const status = n === 0 ? tr('Sem escolhas: ordenado pela nota', 'Nothing picked: sorted by score') : n === 3 ? tr('3 de 3 · clica de novo para tirar', '3 of 3 · click again to remove') : tr(`${n} de 3`, `${n} of 3`);

  return (
    <div className="container" style={{ paddingBottom: 48 }}>
      <style>{TICK_CSS}</style>

      {/* HERO */}
      <section className="row wrap" style={{ gap: 48, paddingTop: 32 }}>
        <div className="stack" style={{ flex: '1.1 1 460px', minWidth: 0, gap: 24 }}>
          <h1 className="display" style={{ fontSize: 'clamp(40px, 4.2vw, 56px)', letterSpacing: '-0.015em', maxWidth: 560 }}>
            {tr('Como é trabalhar lá dentro, contado por quem lá trabalha.', 'What it’s like to work there, told by the people who do.')}
          </h1>
          <p className="body" style={{ margin: 0, fontSize: 16 }}>
            {tr('Avaliações anónimas de PME, associações e voluntariado.', 'Anonymous reviews of SMEs, associations and volunteering.')}
          </p>
          <form role="search" onSubmit={onSearch} className="search" style={{ height: 64, borderRadius: 20, padding: '0 8px 0 20px', maxWidth: 580, marginTop: 8 }}>
            <Icon name="search" size={20} style={{ color: 'var(--body)', flex: 'none' }} />
            <label htmlFor="hero-q" className="sr-only">
              {tr('Pesquisar organização', 'Search organisations')}
            </label>
            <input id="hero-q" type="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder={tr('Nome, setor ou cidade', 'Name, sector or city')} autoComplete="off" style={{ fontSize: 17 }} />
            <button type="submit" className="btn btn-dark" style={{ height: 48, borderRadius: 14, padding: '0 20px', fontSize: 15 }}>
              {tr('Procurar', 'Search')}
            </button>
          </form>
          <div className="row wrap" style={{ gap: 14 }}>
            <Link to="/avaliar" className="btn btn-primary lift" style={{ height: 52 }}>
              {tr('Avaliar onde trabalho', 'Review where I work')}
            </Link>
            <span className="small muted">{tr('2 minutos · anónimo', '2 minutes · anonymous')}</span>
          </div>
        </div>
        <div aria-hidden="true" style={{ flex: '1 1 420px', minWidth: 0, position: 'relative', height: 420 }}>
          <span style={{ position: 'absolute', left: '8%', top: '4%', width: '80%', aspectRatio: '1', maxHeight: 390, borderRadius: '50%', border: '1px dashed var(--field)' }} />
          {STARS.map((s, i) => {
            const org = ORG_BY_ID[s.id];
            if (!org) return null;
            const v = s.value(org);
            const t = Math.max(8, Math.round(s.size * 0.09));
            return (
              <span key={i} className="float stack" style={{ position: 'absolute', left: s.x, top: s.y, alignItems: 'center', gap: 8, animationDelay: s.delay }}>
                <span style={{ borderRadius: '50%', boxShadow: '0 12px 40px rgba(1,11,19,.06)' }}>
                  <Ring value={v} size={s.size} thickness={t} fontSize={Math.round(s.size * 0.24)} color={s.purple ? 'var(--purple)' : 'var(--teal)'} />
                </span>
                <span style={{ fontSize: 13, fontWeight: 600, whiteSpace: 'nowrap', color: s.purple ? 'var(--purple-text)' : 'var(--ink)' }}>{s.label?.() ?? org.name}</span>
              </span>
            );
          })}
        </div>
      </section>

      {/* PULSO */}
      <section aria-label={tr('Pulso da semana', 'This week’s pulse')} className="row" style={{ marginTop: 40, gap: 20, borderTop: '1px solid var(--line)', borderBottom: '1px solid var(--line)' }}>
        <span style={{ flex: 'none', fontSize: 13, fontWeight: 600, color: 'var(--muted)' }}>{tr('Esta semana', 'This week')}</span>
        <div className="pj-tickwrap grow" style={{ overflow: 'hidden' }}>
          <div className="pj-tick">
            {[0, 1].map((copy) =>
              tick.map((t) => {
                const inner = (
                  <>
                    <span style={{ fontSize: 14, fontWeight: 500 }}>{t.label}</span>
                    <span className="mono" style={{ fontSize: 13, color: t.up ? 'var(--up)' : 'var(--down)' }}>
                      {t.d}
                    </span>
                  </>
                );
                const style = { flex: 'none', gap: 8, height: 48, padding: '0 22px', whiteSpace: 'nowrap' } as const;
                return t.to ? (
                  <Link key={copy + t.key} to={t.to} className="plain row pj-copy" data-copy={copy} aria-hidden={copy ? true : undefined} tabIndex={copy ? -1 : undefined} style={style}>
                    {inner}
                  </Link>
                ) : (
                  <span key={copy + t.key} className="row pj-copy" data-copy={copy} aria-hidden={copy ? true : undefined} style={{ ...style, color: 'var(--body)' }}>
                    {inner}
                  </span>
                );
              }),
            )}
          </div>
        </div>
        <Link to="/ranking" className="link" style={{ flex: 'none', fontSize: 14 }}>
          Ranking →
        </Link>
      </section>

      {/* PARA TI */}
      <section className="stack" style={{ paddingTop: 56, gap: 20 }} aria-labelledby="para-ti-d">
        <div className="row wrap between" style={{ alignItems: 'baseline', gap: 16 }}>
          <h2 id="para-ti-d" className="display" style={{ fontSize: 32, lineHeight: 1 }}>
            {tr('Para ti', 'For you')}
          </h2>
          <Link to="/preferencias" className="link" style={{ fontSize: 15 }}>
            {tr('Mudar o que valorizo →', 'Change what I value →')}
          </Link>
        </div>
        <div role="group" aria-label={tr('O que valorizas, até 3', 'What you value, up to 3')} className="row wrap" style={{ gap: 8 }}>
          {CRITERIA.map((c) => {
            const i = prefs.indexOf(c.key);
            const on = i !== -1;
            const full = !on && n >= 3;
            return (
              <button
                key={c.key}
                type="button"
                aria-pressed={on}
                aria-disabled={full || undefined}
                title={full ? tr('Já escolheste 3. Tira uma para trocar.', 'You’ve picked 3. Remove one to swap.') : c.hint}
                onClick={() => togglePref(c.key)}
                className="row pj-pref"
                style={{
                  gap: 8,
                  height: 44,
                  padding: '0 16px 0 8px',
                  borderRadius: 999,
                  border: `1.5px solid ${on ? c.color : 'var(--field)'}`,
                  background: on ? tintOf(c.key) : 'var(--surface)',
                  fontSize: 15,
                  fontWeight: 500,
                  opacity: full ? 0.6 : 1,
                  cursor: full ? 'not-allowed' : 'pointer',
                }}
              >
                <span
                  aria-hidden="true"
                  style={{ width: 28, height: 28, borderRadius: 14, border: `3px solid ${on ? c.color : 'var(--field)'}`, background: 'var(--surface)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 13 }}
                >
                  {on ? i + 1 : ''}
                </span>
                {c.label}
                {on && <span className="sr-only">{tr(`, prioridade ${i + 1}`, `, priority ${i + 1}`)}</span>}
              </button>
            );
          })}
          <span aria-live="polite" className="small muted" style={{ paddingLeft: 6 }}>
            {status}
          </span>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(min(480px, 100%), 1fr))', gap: 14, paddingTop: 4 }}>
          {list.map(({ org, match }) => (
            <Link
              key={org.id}
              ref={flip(org.id)}
              to={`/org/${org.id}`} data-ev="select_org" data-ev-org-type={org.type}
              className="plain card lift row"
              style={{ gap: 16, padding: '18px 22px' }}
            >
              <Ring value={org.score} size={60} thickness={6} fontSize={18} />
              <span className="grow stack" style={{ gap: 3 }}>
                <span className="ellipsis" style={{ fontSize: 16, fontWeight: 600 }}>
                  {org.name}
                </span>
                <span className="small muted">
                  {orgTypeLabel(org.type)} · {org.city}
                </span>
              </span>
              <span className="pill pill-match" style={{ fontSize: 13, padding: '7px 11px' }}>
                {tr(`${match}% para ti`, `${match}% for you`)}
              </span>
            </Link>
          ))}
        </div>
        <Link to="/pesquisa" className="link" style={{ alignSelf: 'flex-start', fontSize: 15 }}>
          {tr('Ver mais organizações →', 'Show more organisations →')}
        </Link>
      </section>

      {/* A NOTA NÃO ESTÁ À VENDA */}
      <section className="row wrap" style={{ marginTop: 48, background: 'var(--ink)', color: '#fff', borderRadius: 28, padding: '40px 48px', gap: '32px 48px' }}>
        <div className="stack" style={{ flex: '1 1 320px', minWidth: 0, gap: 20 }}>
          <h2 className="display" style={{ fontSize: 40 }}>
            {tr('A nota não está à venda.', 'The score is not for sale.')}
          </h2>
          <Link to="/metodologia" className="link" style={{ alignSelf: 'flex-start', color: '#7FD6D9', fontSize: 15 }}>
            {tr('Ver como calculamos →', 'See how we score →')}
          </Link>
        </div>
        <ul className="stack" style={{ flex: '1.4 1 420px', minWidth: 0, margin: 0, padding: 0, listStyle: 'none' }}>
          {PROMISES().map((p) => (
            <li key={p.t} className="row" style={{ gap: 14, padding: '14px 0', borderTop: '1px solid #23303A' }}>
              <span aria-hidden="true" style={{ flex: 'none', width: 22, height: 22, borderRadius: 11, border: `4px solid ${p.purple ? '#B98BDB' : 'var(--teal)'}` }} />
              <span style={{ fontSize: 16, lineHeight: 1.4 }}>
                <span style={{ fontWeight: 600 }}>{p.t}</span>
                <span style={{ color: '#C9CDD0' }}> — {p.d}</span>
              </span>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}

const TICK_CSS = `
.pj-tick{display:flex;width:max-content;animation:pjTick 40s linear infinite}
.pj-tickwrap:hover .pj-tick,.pj-tickwrap:focus-within .pj-tick{animation-play-state:paused}
@keyframes pjTick{from{transform:translateX(0)}to{transform:translateX(-50%)}}
.pj-pref{transition:border-color .15s,background .15s}
.pj-pref:not([aria-disabled]):hover{border-color:var(--ink)!important}
@media (prefers-reduced-motion: reduce){.pj-tick{flex-wrap:wrap;width:auto}.pj-copy[data-copy="1"]{display:none}}
`;
