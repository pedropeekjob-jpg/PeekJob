import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useOrg } from '../api/orgs';
import { Ring } from '../components/Data';
import { Icon } from '../components/Icon';
import { Shell } from '../components/Layout';
import { MapView } from '../components/MapView';
import { Empty } from '../components/UI';
import { CRITERIA, CRITERION, type CriterionKey } from '../data/criteria';
import type { Interview, Org, Review } from '../data/orgs';
import { euros, fmt, plural } from '../lib/format';
import { match } from '../lib/match';
import { useStore, type MyReview } from '../lib/store';
import { useIsDesktop } from '../lib/useMedia';
import { BackButton, BigRing, CritLine, MoreToggle, PrioMark } from './OrgPage.parts';

type Tab = 'avaliacoes' | 'entrevistas' | 'salarios';

/** Regra de anonimato: só mostramos uma função com pelo menos 3 salários */
const MIN_SALARIES = 3;

export default function OrgPage({ tab }: { tab: Tab }) {
  const { id } = useParams();
  const org = useOrg(id);
  if (!org) return <OrgNotFound id={id} />;
  // key: estado local (locais, "ver mais") recomeça ao mudar de organização
  return <OrgView key={org.id} org={org} tab={tab} />;
}

/* ------------------------------------------------------------------ */
/* 404 simpático                                                       */
/* ------------------------------------------------------------------ */

function OrgNotFound({ id }: { id?: string }) {
  const desktop = useIsDesktop();
  return (
    <Shell nav>
      <div className={desktop ? 'container dpage' : 'page'}>
        <div className="stack fade-up" style={{ gap: 20, maxWidth: 560, paddingTop: desktop ? 40 : 24 }}>
          <BigRing value={0} size={desktop ? 120 : 96} muted ariaLabel="Organização não encontrada">
            <span style={{ fontSize: desktop ? 40 : 32 }}>?</span>
          </BigRing>
          <h1 className="h1">Não encontrámos esta organização.</h1>
          <p className="lead">
            Pode ter mudado de nome ou ainda não estar na PeekJob{id ? <> (procurámos por <span className="mono" style={{ fontSize: 15 }}>{id}</span>)</> : null}. Se trabalhas lá, podes ser a primeira pessoa a avaliar.
          </p>
          <div className="row wrap" style={{ gap: 12 }}>
            <Link to="/pesquisa" className="btn btn-primary">
              <Icon name="search" size={18} /> Procurar organizações
            </Link>
            <Link to="/avaliar" className="btn btn-ghost">
              Adicionar e avaliar
            </Link>
          </div>
          <Link to="/ranking" className="link">
            Ver o ranking <Icon name="next" size={16} />
          </Link>
        </div>
      </div>
    </Shell>
  );
}

/* ------------------------------------------------------------------ */
/* Página                                                              */
/* ------------------------------------------------------------------ */

function useOrgBasics(org: Org) {
  const store = useStore();
  const nav = useNavigate();
  const has = org.reviewsCount > 0;
  const m = match(org, store.prefs);
  const saved = store.saved.includes(org.id);
  const startReview = () => {
    store.startDraft(org.id, org.locations[0]?.id ?? null);
    nav('/avaliar/verificar');
  };
  return { store, has, m, saved, startReview };
}

function OrgView({ org, tab }: { org: Org; tab: Tab }) {
  const desktop = useIsDesktop();
  return <Shell nav>{desktop ? <DesktopOrg org={org} tab={tab} /> : <MobileOrg org={org} tab={tab} />}</Shell>;
}

const salaryTotal = (org: Org) => org.salaries.reduce((a, s) => a + s.count, 0);
const meta = (org: Org) => `${org.type} · ${org.city}`;

/* ---------- Partes comuns ---------- */

function SaveButton({ org, large = false }: { org: Org; large?: boolean }) {
  const { saved, toggleSave } = useStore();
  const on = saved.includes(org.id);
  return (
    <button
      type="button"
      aria-pressed={on}
      onClick={() => toggleSave(org.id)}
      className="btn lift"
      style={{
        height: large ? 56 : 44,
        padding: large ? '0 22px' : '0 16px',
        borderRadius: large ? 18 : 22,
        fontSize: large ? 16 : 15,
        fontWeight: large ? 600 : 500,
        background: on ? 'var(--ink)' : 'var(--surface)',
        color: on ? '#fff' : 'var(--ink)',
        borderColor: on ? 'var(--ink)' : 'var(--field)',
      }}
    >
      <Icon name="bookmark" size={large ? 18 : 16} filled={on} />
      {on ? 'Guardada' : 'Guardar'}
    </button>
  );
}

function OrgTabs({ org, tab, desktop }: { org: Org; tab: Tab; desktop: boolean }) {
  const items: [Tab, string, string, number][] = [
    ['avaliacoes', 'Avaliações', `/org/${org.id}`, org.reviewsCount],
    ['entrevistas', 'Entrevistas', `/org/${org.id}/entrevistas`, org.interviews.length],
    ['salarios', 'Salários', `/org/${org.id}/salarios`, salaryTotal(org)],
  ];
  return (
    <nav aria-label="Secções" className="tabs" style={{ gap: desktop ? 32 : 24 }}>
      {items.map(([k, label, to, n]) => (
        <Link
          key={k}
          to={to}
          replace
          className="tab"
          aria-current={tab === k ? 'page' : undefined}
          style={{ minHeight: 44, display: 'inline-flex', alignItems: 'flex-end', gap: 6, fontSize: desktop ? 16 : 15, padding: desktop ? '12px 0 14px' : '0 0 10px' }}
        >
          {label}
          {desktop && (
            <span className="mono" style={{ fontSize: 13, color: 'var(--muted)', fontWeight: 500 }}>
              {n}
            </span>
          )}
        </Link>
      ))}
    </nav>
  );
}

function LocationPicker({ org, active, onPick }: { org: Org; active: string; onPick: (id: string) => void }) {
  if (org.locations.length < 2) {
    const l = org.locations[0];
    return l ? (
      <div className="row" style={{ gap: 12, minHeight: 44 }}>
        <Icon name="pin" size={20} style={{ color: 'var(--teal-text)', flex: 'none' }} />
        <span className="stack" style={{ gap: 1 }}>
          <span style={{ fontSize: 15, fontWeight: 600 }}>{l.label}</span>
          <span className="small muted">{l.address}</span>
        </span>
      </div>
    ) : null;
  }
  return (
    <div role="radiogroup" aria-label="Locais" className="stack">
      {org.locations.map((l) => {
        const on = l.id === active;
        return (
          <button
            key={l.id}
            type="button"
            role="radio"
            aria-checked={on}
            onClick={() => onPick(l.id)}
            className="row"
            style={{ gap: 12, minHeight: 52, padding: 0, border: 0, background: 'transparent', textAlign: 'left' }}
          >
            <span
              aria-hidden="true"
              style={{ flex: 'none', width: 20, height: 20, borderRadius: 10, border: `${on ? 6 : 2}px solid ${on ? 'var(--teal)' : 'var(--grey)'}`, boxSizing: 'border-box' }}
            />
            <span className="stack" style={{ gap: 1 }}>
              <span style={{ fontSize: 15, fontWeight: on ? 600 : 500 }}>{l.label}</span>
              <span className="small muted">{l.address}</span>
            </span>
          </button>
        );
      })}
    </div>
  );
}

/** Prioridades do utilizador primeiro; os restantes atrás de "Ver os 8" */
function useCriteriaSplit(org: Org) {
  const { prefs } = useStore();
  const rest = CRITERIA.map((c) => c.key).filter((k) => !prefs.includes(k));
  const prio = (k: CriterionKey) => prefs.indexOf(k) + 1 || undefined;
  return { prefs, rest, prio, v: (k: CriterionKey) => org.scores[k] };
}

function harassmentLine(org: Org) {
  return `${plural(org.harassmentReports, 'relato', 'relatos')} de assédio em ${plural(org.reviewsCount, 'avaliação', 'avaliações')}.`;
}

function RespeitoTags({ org }: { org: Org }) {
  if (!org.respeitoTags.length) return <span className="small" style={{ color: 'var(--purple-text)' }}>Ainda sem etiquetas de respeito.</span>;
  return (
    <ul className="chips" style={{ listStyle: 'none', margin: 0, padding: 0, gap: 6 }} aria-label="O que dizem sobre respeito e inclusão">
      {org.respeitoTags.map((t) => (
        <li
          key={t.label}
          style={{ fontSize: 13, padding: '6px 10px', borderRadius: 999, background: 'var(--surface)', border: '1px solid var(--purple-line)', color: 'var(--purple-text)' }}
        >
          {t.label}{' '}
          <span className="mono" style={{ opacity: 0.75 }} aria-label={`${t.n} pessoas`}>
            {t.n}
          </span>
        </li>
      ))}
    </ul>
  );
}

/* ---------- Avaliações ---------- */

function useUsefulCount() {
  const { useful, toggleUseful } = useStore();
  return { on: (r: Review) => !!useful[r.id], count: (r: Review) => r.useful + (useful[r.id] ? 1 : 0), toggle: (r: Review) => toggleUseful(r.id) };
}

function OrgReply({ org, reviewId }: { org: Org; reviewId: string }) {
  const { replies } = useStore();
  const text = replies[reviewId];
  if (!text) return null;
  return (
    <div style={{ padding: '4px 0 4px 14px', borderLeft: '3px solid var(--teal)' }} className="stack">
      <span className="small" style={{ fontWeight: 600 }}>
        Resposta de {org.name}
      </span>
      <span className="body" style={{ fontSize: 15, lineHeight: 1.55 }}>
        {text}
      </span>
    </div>
  );
}

function MyReviewItem({ r, org, desktop }: { r: MyReview; org: Org; desktop: boolean }) {
  const loc = org.locations.find((l) => l.id === r.locationId);
  return (
    <article
      className="stack"
      style={{ gap: 10, padding: desktop ? '24px 0' : '0 0 16px', borderBottom: '1px solid var(--line)' }}
      aria-label="A tua avaliação"
    >
      <div className="row" style={{ gap: 12 }}>
        {desktop && <Ring value={r.avg} size={44} inner="var(--ground)" fontSize={13} />}
        <span className="row wrap grow" style={{ gap: 8 }}>
          <span className="pill pill-ink">A tua avaliação</span>
          <span className="small muted">
            {loc ? `${loc.label} · ` : ''}
            {r.when}
          </span>
        </span>
        {!desktop && (
          <span className="num" style={{ fontSize: 16 }} aria-label={`Nota ${fmt(r.avg)} de 5`}>
            {fmt(r.avg)}
          </span>
        )}
      </div>
      {r.text && (
        <p className="body" style={{ margin: 0, fontSize: desktop ? 16 : 15, lineHeight: desktop ? 1.6 : 1.5 }}>
          {r.text}
        </p>
      )}
      {r.tags.length > 0 && (
        <div className="chips" style={{ gap: 6 }}>
          {r.tags.map((t) => (
            <span key={t} className="pill pill-match">
              {t}
            </span>
          ))}
        </div>
      )}
      <span className="small muted row" style={{ gap: 6 }}>
        <Icon name="lock" size={14} /> Publicada sem o teu nome. Só tu vês esta etiqueta.
      </span>
    </article>
  );
}

function ReviewItem({ r, org, desktop }: { r: Review; org: Org; desktop: boolean }) {
  const u = useUsefulCount();
  const on = u.on(r);
  const metaText = `${r.role} · ${r.when}`;
  const check = r.verified ? (
    <svg role="img" aria-label="Avaliação verificada" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--teal-text)" strokeWidth="2.6" strokeLinecap="round" style={{ flex: 'none' }}>
      <title>Avaliação verificada</title>
      <path d="M20 6L9 17l-5-5" />
    </svg>
  ) : null;
  const actions = (
    <div className="row" style={{ gap: 8 }}>
      <button
        type="button"
        aria-pressed={on}
        onClick={() => u.toggle(r)}
        aria-label={`Útil, ${u.count(r)} ${u.count(r) === 1 ? 'pessoa' : 'pessoas'}`}
        className="row"
        style={{ minHeight: 44, padding: '0 14px 0 0', border: 0, background: 'transparent', gap: 8, fontSize: 13, fontWeight: 600, color: on ? 'var(--teal-dark)' : 'var(--body)' }}
      >
        <Icon name="thumb" size={16} filled={false} style={{ fill: on ? 'var(--teal-tint)' : 'none' }} />
        Útil <span className="mono">{u.count(r)}</span>
      </button>
      <Link
        to={`/org/${org.id}/denunciar/${r.id}`}
        className="row"
        style={{ marginLeft: 'auto', minHeight: 44, color: 'var(--muted)', textDecoration: 'none', fontSize: 13, fontWeight: 500, gap: 6 }}
      >
        <Icon name="flag" size={14} /> Denunciar
      </Link>
    </div>
  );

  if (desktop) {
    return (
      <article className="stack" style={{ gap: 10, padding: '24px 0', borderBottom: '1px solid var(--line)' }}>
        <div className="row" style={{ gap: 14 }}>
          <Ring value={r.score} size={44} inner="var(--ground)" fontSize={13} />
          <span className="stack" style={{ gap: 2, minWidth: 0 }}>
            <h3 className="h3" style={{ lineHeight: 1.35 }}>
              {r.title}
            </h3>
            <span className="row small muted" style={{ gap: 6 }}>
              {check}
              {metaText}
            </span>
          </span>
        </div>
        <p className="body" style={{ margin: 0, fontSize: 16, lineHeight: 1.6 }}>
          {r.body}
        </p>
        <OrgReply org={org} reviewId={r.id} />
        {actions}
      </article>
    );
  }
  return (
    <article className="stack" style={{ gap: 8, paddingBottom: 4, borderBottom: '1px solid var(--line)' }}>
      <div className="row small muted" style={{ gap: 8 }}>
        {check}
        <span>{metaText}</span>
        <span className="num" style={{ marginLeft: 'auto', fontSize: 16, color: 'var(--ink)' }} aria-label={`Nota ${fmt(r.score)} de 5`}>
          {fmt(r.score)}
        </span>
      </div>
      <h3 className="h3" style={{ lineHeight: 1.3 }}>
        {r.title}
      </h3>
      <p className="body" style={{ margin: 0, fontSize: 15 }}>
        {r.body}
      </p>
      <OrgReply org={org} reviewId={r.id} />
      {actions}
    </article>
  );
}

function ReviewsSection({ org, desktop }: { org: Org; desktop: boolean }) {
  const { myReviews } = useStore();
  const { startReview } = useOrgBasics(org);
  const [all, setAll] = useState(false);
  const mine = myReviews.filter((r) => r.orgId === org.id);
  const shown = all ? org.reviews : org.reviews.slice(0, 2);
  if (!mine.length && !org.reviews.length) {
    return (
      <Empty
        title="Ainda sem avaliações."
        body="Se trabalhas ou trabalhaste aqui, a tua avaliação ajuda quem procura. É anónima."
        action={
          <button type="button" className="btn btn-primary" style={{ alignSelf: 'flex-start', marginTop: 12 }} onClick={startReview}>
            Ser a primeira pessoa a avaliar
          </button>
        }
      />
    );
  }
  return (
    <div className="stack" style={{ gap: desktop ? 0 : 20 }}>
      {mine.map((r) => (
        <MyReviewItem key={r.id} r={r} org={org} desktop={desktop} />
      ))}
      {shown.map((r) => (
        <ReviewItem key={r.id} r={r} org={org} desktop={desktop} />
      ))}
      {org.reviews.length > 2 && (
        <button
          type="button"
          className={desktop ? 'btn btn-ghost lift' : 'btn btn-ghost btn-block'}
          aria-expanded={all}
          onClick={() => setAll(!all)}
          style={{ alignSelf: desktop ? 'flex-start' : undefined, marginTop: desktop ? 16 : 0, height: desktop ? 48 : 52, borderRadius: 16, fontSize: 15 }}
        >
          {all ? 'Mostrar menos' : `Ver todas as ${org.reviewsCount} avaliações`}
        </button>
      )}
    </div>
  );
}

/* ---------- Entrevistas ---------- */

function interviewNumbers(org: Org) {
  const n = org.interviews.length;
  if (org.interviewStats) return { ...org.interviewStats, n };
  const pct = (f: (i: Interview) => boolean) => (n ? Math.round((org.interviews.filter(f).length / n) * 100) : 0);
  return { positivePct: pct((i) => i.positive), offerPct: pct((i) => i.offer), answeredPct: undefined, difficulty: undefined, usualSteps: org.interviews[0]?.steps, n };
}

function InterviewRings({ org, size = 88 }: { org: Org; size?: number }) {
  const s = interviewNumbers(org);
  const rings: { v: number; pct: boolean; label: string; text: string }[] = [];
  if (s.difficulty != null) rings.push({ v: s.difficulty, pct: false, label: 'Dificuldade', text: fmt(s.difficulty) });
  rings.push({ v: s.positivePct, pct: true, label: 'Gostaram do processo', text: `${s.positivePct}%` });
  if (s.answeredPct != null) rings.push({ v: s.answeredPct, pct: true, label: 'Tiveram resposta', text: `${s.answeredPct}%` });
  else rings.push({ v: s.offerPct, pct: true, label: 'Receberam oferta', text: `${s.offerPct}%` });
  return (
    <div style={{ display: 'grid', gridTemplateColumns: `repeat(${rings.length}, 1fr)`, gap: 12 }}>
      {rings.map((r) => (
        <div key={r.label} className="stack" style={{ alignItems: 'center', gap: 8, textAlign: 'center' }}>
          <BigRing value={r.v} pct={r.pct} size={size} thickness={8} ariaLabel={`${r.label}: ${r.pct ? r.text : r.text + ' de 5'}`}>
            <span style={{ fontSize: Math.round(size * 0.23) }}>{r.text}</span>
          </BigRing>
          <span className="small body" style={{ lineHeight: 1.3 }}>
            {r.label}
          </span>
        </div>
      ))}
    </div>
  );
}

function InterviewItem({ i, org, desktop }: { i: Interview; org: Org; desktop: boolean }) {
  const result = (
    <span style={{ fontSize: 13, fontWeight: 600, color: i.offer ? 'var(--up)' : 'var(--down)' }}>{i.offer ? 'Oferta recebida' : 'Sem oferta'}</span>
  );
  if (desktop) {
    return (
      <article className="stack" style={{ gap: 8, padding: '24px 0', borderBottom: '1px solid var(--line)' }}>
        <div className="row wrap between" style={{ gap: 12, alignItems: 'baseline' }}>
          <h3 className="h3">{i.role}</h3>
          {result}
        </div>
        <span className="small muted">
          {i.when} · {i.positive ? 'Boa experiência' : 'Experiência menos boa'}
        </span>
        <p className="body" style={{ margin: 0, fontSize: 16, lineHeight: 1.6 }}>
          {i.body}
        </p>
        <div className="row" style={{ gap: 12 }}>
          <span className="small body">{i.steps}</span>
          <Link
            to={`/org/${org.id}/denunciar/${i.id}`}
            className="row"
            style={{ marginLeft: 'auto', minHeight: 44, color: 'var(--muted)', textDecoration: 'none', fontSize: 13, fontWeight: 500, gap: 6 }}
          >
            <Icon name="flag" size={14} /> Denunciar
          </Link>
        </div>
      </article>
    );
  }
  return (
    <article className="stack" style={{ gap: 6, paddingBottom: 16, borderBottom: '1px solid var(--line)' }}>
      <div className="row between" style={{ gap: 8, alignItems: 'baseline' }}>
        <h3 className="h3">{i.role}</h3>
        {result}
      </div>
      <span className="small muted">
        {i.steps} · {i.when}
      </span>
      <p className="body" style={{ margin: 0, fontSize: 15 }}>
        {i.body}
      </p>
    </article>
  );
}

function InterviewList({ org, desktop }: { org: Org; desktop: boolean }) {
  const [all, setAll] = useState(false);
  if (!org.interviews.length) return <Empty title="Ainda sem entrevistas partilhadas." body="Fizeste uma entrevista aqui? Conta como correu, de forma anónima." />;
  const shown = all ? org.interviews : org.interviews.slice(0, 2);
  return (
    <div className="stack" style={{ gap: desktop ? 0 : 16 }}>
      {shown.map((i) => (
        <InterviewItem key={i.id} i={i} org={org} desktop={desktop} />
      ))}
      {org.interviews.length > 2 && (
        <button
          type="button"
          className={desktop ? 'btn btn-ghost lift' : 'btn btn-ghost btn-block'}
          aria-expanded={all}
          onClick={() => setAll(!all)}
          style={{ alignSelf: desktop ? 'flex-start' : undefined, marginTop: desktop ? 16 : 0, height: 48, borderRadius: 16, fontSize: 15 }}
        >
          {all ? 'Mostrar menos' : `Ver todas as ${org.interviews.length} entrevistas`}
        </button>
      )}
    </div>
  );
}

/* ---------- Salários ---------- */

function salaryScale(org: Org) {
  const shown = org.salaries.filter((s) => s.count >= MIN_SALARIES);
  const hidden = org.salaries.filter((s) => s.count < MIN_SALARIES);
  const lo = shown.length ? Math.floor((Math.min(...shown.map((s) => s.min)) - 50) / 100) * 100 : 0;
  const hi = shown.length ? Math.ceil((Math.max(...shown.map((s) => s.max)) + 50) / 100) * 100 : 1;
  const p = (v: number) => ((v - lo) / (hi - lo)) * 100;
  return { shown, hidden, p };
}

function hiddenExtra(org: Org) {
  const { hidden } = salaryScale(org);
  return hidden.map((h) => `${h.role} tem ${h.count} — falta${MIN_SALARIES - h.count === 1 ? '' : 'm'} ${MIN_SALARIES - h.count}`).join('; ');
}

function hiddenNote(org: Org) {
  const extra = hiddenExtra(org);
  const base = `Só mostramos uma função com pelo menos ${MIN_SALARIES} salários: numa equipa pequena, menos do que isso podia identificar alguém.`;
  return extra ? `${base} ${extra}.` : base;
}

function SalaryBands({ org, desktop }: { org: Org; desktop: boolean }) {
  const { shown, p } = salaryScale(org);
  const [note, setNote] = useState(false);
  if (!shown.length) {
    return (
      <Empty
        title={org.type === 'Voluntariado' ? 'Aqui o trabalho é voluntário.' : 'Ainda não há salários suficientes.'}
        body={
          org.type === 'Voluntariado'
            ? 'Não há salários para mostrar. Vê as avaliações para saber como é o dia a dia.'
            : `Mostramos uma função quando houver pelo menos ${MIN_SALARIES} salários partilhados.`
        }
      />
    );
  }
  return (
    <div className="stack">
      {shown.map((s) => {
        const aria = `${s.role}: de ${euros(s.min)} a ${euros(s.max)}, valor do meio ${euros(s.median)}, ${s.count} salários`;
        const l = p(s.min);
        const r = p(s.max);
        const m = p(s.median);
        const bar = (h: number) => (
          <div role="img" aria-label={aria} style={{ position: 'relative', height: h }}>
            <div style={{ position: 'absolute', left: 0, right: 0, top: h / 2 - 1, height: 2, background: 'var(--line)' }} />
            <div style={{ position: 'absolute', top: h / 2 - 2, height: 4, borderRadius: 2, background: 'var(--teal)', left: `${l}%`, width: `${r - l}%` }} />
            <div
              style={{
                position: 'absolute',
                top: 0,
                width: h,
                height: h,
                marginLeft: -h / 2,
                borderRadius: h / 2,
                background: 'var(--surface)',
                border: `${h > 20 ? 5 : 4}px solid var(--ink)`,
                boxSizing: 'border-box',
                left: `${m}%`,
              }}
            />
          </div>
        );
        if (desktop) {
          return (
            <div
              key={s.role}
              style={{ display: 'grid', gridTemplateColumns: 'minmax(130px, 170px) minmax(0, 1fr)', gap: 32, alignItems: 'center', padding: '22px 0', borderTop: '1px solid var(--line)' }}
            >
              <div className="stack" style={{ gap: 2 }}>
                <span style={{ fontSize: 15, fontWeight: 600 }}>{s.role}</span>
                <span className="num" style={{ fontSize: 24, lineHeight: 1.15 }}>
                  {euros(s.median)}
                </span>
                <span className="small muted">{plural(s.count, 'salário', 'salários')}</span>
              </div>
              <div className="stack" style={{ gap: 8 }}>
                {bar(24)}
                <div className="mono small muted" style={{ position: 'relative', height: 18 }} aria-hidden="true">
                  <span style={{ position: 'absolute', left: `${l}%`, transform: 'translateX(-50%)', whiteSpace: 'nowrap' }}>{euros(s.min)}</span>
                  <span style={{ position: 'absolute', left: `${r}%`, transform: 'translateX(-50%)', whiteSpace: 'nowrap' }}>{euros(s.max)}</span>
                </div>
              </div>
            </div>
          );
        }
        return (
          <div key={s.role} className="stack" style={{ gap: 10, padding: '16px 0', borderBottom: '1px solid var(--line)' }}>
            <div className="row between" style={{ alignItems: 'baseline' }}>
              <span style={{ fontSize: 16, fontWeight: 600 }}>
                {s.role} <span className="small muted" style={{ fontWeight: 400 }}>· {s.count}</span>
              </span>
              <span className="num" style={{ fontSize: 22 }}>
                {euros(s.median)}
              </span>
            </div>
            {bar(18)}
            <div className="row between mono small muted" aria-hidden="true">
              <span>{euros(s.min)}</span>
              <span>{euros(s.max)}</span>
            </div>
          </div>
        );
      })}
      {desktop ? (
        <div className="stack" style={{ gap: 8, paddingTop: 16, borderTop: '1px solid var(--line)' }}>
          <MoreToggle open={note} onToggle={() => setNote(!note)} label="Porque não aparecem outras funções?" openLabel="Esconder" controls="sal-note" />
          {note && (
            <p id="sal-note" className="body fade-up" style={{ margin: 0, maxWidth: 560, fontSize: 15, lineHeight: 1.55 }}>
              {hiddenNote(org)}
            </p>
          )}
        </div>
      ) : (
        <p className="small muted" style={{ margin: 0, paddingTop: 16 }}>
          Valor grande = valor do meio. Só funções com {MIN_SALARIES}+ salários.
          {hiddenExtra(org) ? ` Ainda não aparece: ${hiddenExtra(org)}.` : ''}
        </p>
      )}
    </div>
  );
}

function PaidOnTime({ org, size }: { org: Org; size: number }) {
  if (org.paidOnTimePct == null) return null;
  return (
    <BigRing value={org.paidOnTimePct} pct size={size} thickness={Math.round(size * 0.09)} ariaLabel={`${org.paidOnTimePct}% dizem que o salário chega a horas`}>
      <span style={{ fontSize: Math.round(size * 0.26) }}>{org.paidOnTimePct}%</span>
    </BigRing>
  );
}

/* ------------------------------------------------------------------ */
/* Mobile                                                              */
/* ------------------------------------------------------------------ */

function MobileOrg({ org, tab }: { org: Org; tab: Tab }) {
  const { has, m, startReview } = useOrgBasics(org);
  const [active, setActive] = useState(org.locations[0]?.id ?? '');

  if (tab !== 'avaliacoes') {
    const cta = tab === 'entrevistas' ? 'Partilhar a minha entrevista' : org.type === 'Voluntariado' ? 'Avaliar esta organização' : 'Partilhar o meu salário';
    return (
      <div className="page" style={{ gap: 24 }}>
        <div className="row" style={{ gap: 12 }}>
          <BackButton fallback="/ranking" />
          <div className="stack grow">
            <h1 className="h2 ellipsis">{org.name}</h1>
            <span className="small muted">{has ? `${fmt(org.score)} · ${m}% para ti` : 'Ainda sem avaliações'}</span>
          </div>
        </div>
        <OrgTabs org={org} tab={tab} desktop={false} />
        {tab === 'entrevistas' ? <MobileInterviews org={org} /> : <MobileSalaries org={org} />}
        <div className="sticky-cta" style={{ bottom: 'var(--nav-h)', marginBottom: -16 }}>
          <button type="button" className="btn btn-primary btn-block" style={{ height: 56 }} onClick={startReview}>
            {cta}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="page" style={{ gap: 28 }}>
      <div className="row between">
        <BackButton fallback="/ranking" />
        <SaveButton org={org} />
      </div>

      <section aria-label="Resumo" className="stack" style={{ gap: 20 }}>
        <div className="stack" style={{ gap: 6 }}>
          <h1 className="h1" style={{ fontSize: 36 }}>
            {org.name}
          </h1>
          <div className="small muted">
            {meta(org)}
            {org.locations.length > 1 ? ` · ${org.locations.length} locais` : ''}
          </div>
        </div>
        <div className="row" style={{ gap: 20 }}>
          <BigRing value={org.score} size={112} thickness={11} muted={!has} ariaLabel={has ? `Nota ${fmt(org.score)} de 5, com ${org.reviewsCount} avaliações` : 'Ainda sem nota'}>
            <span style={{ fontSize: 36 }}>{has ? fmt(org.score) : '—'}</span>
            <span style={{ fontFamily: 'var(--font-body)', fontWeight: 400, fontSize: 13, color: 'var(--muted)' }}>{has ? 'de 5' : 'sem nota'}</span>
          </BigRing>
          <div className="stack" style={{ gap: 6 }}>
            {has && (
              <div className="row" style={{ alignItems: 'baseline', gap: 6, color: 'var(--teal-dark)' }}>
                <span className="num" style={{ fontSize: 32, lineHeight: 1 }}>
                  {m}%
                </span>
                <span style={{ fontSize: 15, fontWeight: 600 }}>para ti</span>
              </div>
            )}
            <p className="body" style={{ margin: 0, fontSize: 15, lineHeight: 1.4 }}>
              {org.summary}
            </p>
          </div>
        </div>
        <button type="button" className="btn btn-primary btn-block" style={{ height: 56 }} onClick={startReview}>
          Avaliar esta organização
        </button>
      </section>

      {has && <MobileCriteria org={org} />}

      <MobileMap org={org} active={active} setActive={setActive} />

      <section aria-label="Opiniões" className="stack" style={{ gap: 20 }}>
        <OrgTabs org={org} tab={tab} desktop={false} />
        <ReviewsSection org={org} desktop={false} />
      </section>
    </div>
  );
}

function MobileCriteria({ org }: { org: Org }) {
  const { prefs, rest, prio, v } = useCriteriaSplit(org);
  const [resp, setResp] = useState(false);
  const [all, setAll] = useState(false);
  const r = org.scores.respeito;
  const R = CRITERION.respeito;
  const list = prefs.filter((k) => k !== 'respeito');
  const more = rest.filter((k) => k !== 'respeito');
  return (
    <section aria-labelledby="o-que-importa" className="stack" style={{ gap: 4 }}>
      <h2 id="o-que-importa" className="h2" style={{ marginBottom: 8 }}>
        O que mais te importa
      </h2>

      <button
        type="button"
        aria-expanded={resp}
        aria-controls="resp-tags"
        onClick={() => setResp(!resp)}
        className="row"
        style={{ gap: 10, minHeight: 52, padding: '0 14px', margin: '0 -14px', border: 0, borderRadius: 16, background: 'var(--purple-tint)', color: 'var(--purple-text)', fontSize: 15, fontWeight: 600, textAlign: 'left' }}
      >
        {prio('respeito') ? <PrioMark n={prio('respeito')!} color={R.color} /> : null}
        <span className="grow">{R.label}</span>
        <span aria-hidden="true" style={{ display: 'flex', gap: 4 }}>
          {[0, 1, 2, 3, 4].map((k) => {
            const x = r ?? 0;
            return (
              <span
                key={k}
                style={{
                  width: 13,
                  height: 13,
                  borderRadius: 7,
                  background: x >= k + 0.75 ? 'var(--purple)' : x >= k + 0.25 ? 'linear-gradient(90deg, var(--purple) 50%, var(--purple-line) 50%)' : 'var(--purple-line)',
                }}
              />
            );
          })}
        </span>
        <span className="mono" style={{ fontSize: 13, width: 26, textAlign: 'right' }} aria-label={r == null ? 'sem dados' : `${fmt(r)} de 5`}>
          {r == null ? '—' : fmt(r)}
        </span>
        <Icon name="down" size={16} stroke={2} style={{ transform: resp ? 'rotate(180deg)' : undefined, transition: 'transform .2s' }} />
      </button>
      {resp && (
        <div id="resp-tags" className="stack fade-up" style={{ gap: 10, padding: '10px 0 6px' }}>
          <span className="small" style={{ color: 'var(--purple-text)', fontWeight: 600 }}>
            {harassmentLine(org)}
          </span>
          <RespeitoTags org={org} />
        </div>
      )}

      {list.map((k) => (
        <CritLine key={k} k={k} value={v(k)} priority={prio(k)} border minHeight={44} />
      ))}
      {all && (
        <div id="crit-rest" className="stack fade-up">
          {more.map((k) => (
            <CritLine key={k} k={k} value={v(k)} border minHeight={44} muted />
          ))}
        </div>
      )}
      <MoreToggle open={all} onToggle={() => setAll(!all)} label="Ver os 8 critérios" openLabel="Mostrar menos" controls="crit-rest" />
    </section>
  );
}

function MobileMap({ org, active, setActive }: { org: Org; active: string; setActive: (id: string) => void }) {
  const [open, setOpen] = useState(false);
  const cur = org.locations.find((l) => l.id === active) ?? org.locations[0];
  if (!cur) return null;
  return (
    <section aria-label="Localização" className="stack" style={{ gap: 12 }}>
      <button
        type="button"
        aria-expanded={open}
        aria-controls="org-map"
        onClick={() => setOpen(!open)}
        className="row"
        style={{ gap: 12, minHeight: 52, padding: 0, border: 0, borderTop: '1px solid var(--line)', borderBottom: '1px solid var(--line)', background: 'transparent', textAlign: 'left' }}
      >
        <Icon name="pin" size={20} style={{ color: 'var(--teal-text)', flex: 'none' }} />
        <span className="grow ellipsis" style={{ fontSize: 15, fontWeight: 500 }}>
          {org.locations.length > 1 ? `${org.locations.length} locais · ${org.city}` : cur.address}
        </span>
        <span style={{ fontSize: 15, fontWeight: 600, color: 'var(--teal-text)' }}>{open ? 'Fechar' : 'Ver mapa'}</span>
      </button>
      {open && (
        <div id="org-map" className="stack fade-up" style={{ gap: 6 }}>
          <MapView locations={org.locations} active={active} onPick={org.locations.length > 1 ? setActive : undefined} height={160} />
          <LocationPicker org={org} active={active} onPick={setActive} />
        </div>
      )}
    </section>
  );
}

function MobileInterviews({ org }: { org: Org }) {
  const [more, setMore] = useState(false);
  const s = interviewNumbers(org);
  return (
    <>
      {s.n > 0 && (
        <section aria-label="Resumo das entrevistas" className="stack" style={{ gap: 8 }}>
          <div className="row" style={{ gap: 18 }}>
            <BigRing value={s.positivePct} pct size={92} thickness={9} ariaLabel={`${s.positivePct}% tiveram boa experiência`}>
              <span style={{ fontSize: 24 }}>{s.positivePct}%</span>
            </BigRing>
            <div className="stack" style={{ gap: 4 }}>
              <span className="h2" style={{ lineHeight: 1.15 }}>
                tiveram boa experiência
              </span>
              <span className="small muted">{plural(s.n, 'entrevista partilhada', 'entrevistas partilhadas')}</span>
            </div>
          </div>
          {more && (
            <div id="int-more" className="stack fade-up" style={{ gap: 16, paddingTop: 12 }}>
              <InterviewRings org={org} size={80} />
              {s.usualSteps && (
                <div className="stack" style={{ gap: 2, paddingTop: 12, borderTop: '1px solid var(--line)' }}>
                  <span className="small muted">Processo mais comum</span>
                  <span style={{ fontSize: 15, fontWeight: 600 }}>{s.usualSteps}</span>
                </div>
              )}
            </div>
          )}
          <MoreToggle open={more} onToggle={() => setMore(!more)} label="Ver mais números" openLabel="Mostrar menos" controls="int-more" />
        </section>
      )}
      <section aria-label="Entrevistas partilhadas">
        <InterviewList org={org} desktop={false} />
      </section>
    </>
  );
}

function MobileSalaries({ org }: { org: Org }) {
  const n = salaryTotal(org);
  return (
    <>
      {org.paidOnTimePct != null && n > 0 && (
        <section aria-label="Pontualidade" className="row" style={{ gap: 18 }}>
          <PaidOnTime org={org} size={92} />
          <div className="stack" style={{ gap: 4 }}>
            <span className="h2" style={{ lineHeight: 1.15 }}>
              recebem a horas
            </span>
            <span className="small muted">{plural(n, 'salário', 'salários')} · bruto mensal</span>
          </div>
        </section>
      )}
      <section aria-label="Salários por função">
        <SalaryBands org={org} desktop={false} />
      </section>
    </>
  );
}

/* ------------------------------------------------------------------ */
/* Desktop                                                             */
/* ------------------------------------------------------------------ */

const twoCols: React.CSSProperties = {
  display: 'grid',
  gridTemplateColumns: 'minmax(0, 720px) minmax(280px, 340px)',
  justifyContent: 'space-between',
  gap: 64,
  alignItems: 'start',
};

function DesktopOrg({ org, tab }: { org: Org; tab: Tab }) {
  const { has, m, startReview } = useOrgBasics(org);
  const [active, setActive] = useState(org.locations[0]?.id ?? '');

  const back = (
    <Link to="/ranking" className="row" style={{ alignSelf: 'flex-start', gap: 6, minHeight: 44, textDecoration: 'none', fontSize: 15, fontWeight: 500, color: 'var(--body)' }}>
      <Icon name="back" size={16} /> Ranking
    </Link>
  );

  if (tab !== 'avaliacoes') {
    return (
      <div className="container" style={{ paddingTop: 8, paddingBottom: 80 }}>
        {back}
        <section aria-label="Organização" className="row wrap" style={{ gap: 24, padding: '16px 0 40px' }}>
          <Ring value={org.score} size={80} inner="var(--ground)" fontSize={24} muted={!has} />
          <div className="row wrap" style={{ flex: '1 1 360px', minWidth: 0, gap: 16 }}>
            <h1 className="h1" style={{ fontSize: 40, lineHeight: 1 }}>
              {org.name}
            </h1>
            {has && <span className="pill pill-match" style={{ fontSize: 15, padding: '6px 14px' }}>{m}% para ti</span>}
          </div>
          <button type="button" className="btn btn-primary lift" style={{ height: 56, padding: '0 24px' }} onClick={startReview}>
            {tab === 'entrevistas' ? 'Partilhar a minha entrevista' : org.type === 'Voluntariado' ? 'Avaliar esta organização' : 'Partilhar o meu salário'}
          </button>
        </section>
        <OrgTabs org={org} tab={tab} desktop />
        <div style={{ ...twoCols, paddingTop: 48 }}>{tab === 'entrevistas' ? <DesktopInterviews org={org} /> : <DesktopSalaries org={org} />}</div>
      </div>
    );
  }

  return (
    <div className="container" style={{ paddingTop: 8, paddingBottom: 80 }}>
      {back}
      <section aria-label="Resumo" className="row wrap between" style={{ gap: 48, padding: '24px 0 56px' }}>
        <div className="stack" style={{ flex: '1 1 520px', minWidth: 0, gap: 16 }}>
          <h1 className="h1" style={{ fontSize: 56, lineHeight: 1 }}>
            {org.name}
          </h1>
          <span className="muted" style={{ fontSize: 16 }}>
            {org.type} · {org.sector} · {org.city}
            {org.locations.length > 1 ? ` · ${org.locations.length} locais` : ''}
          </span>
          <p className="body" style={{ margin: 0, maxWidth: 520, fontSize: 22, lineHeight: 1.4 }}>
            {org.summary}
          </p>
          <div className="row wrap" style={{ gap: 12, paddingTop: 12 }}>
            <button type="button" className="btn btn-primary lift" style={{ height: 56, padding: '0 26px' }} onClick={startReview}>
              Avaliar esta organização
            </button>
            <SaveButton org={org} large />
          </div>
        </div>
        <div className="stack" style={{ flex: 'none', alignItems: 'center', gap: 16 }}>
          <BigRing value={org.score} size={208} thickness={17} muted={!has} ariaLabel={has ? `Nota ${fmt(org.score)} de 5, com ${org.reviewsCount} avaliações` : 'Ainda sem nota'}>
            <span style={{ fontSize: 56 }}>{has ? fmt(org.score) : '—'}</span>
            <span style={{ fontFamily: 'var(--font-body)', fontWeight: 400, fontSize: 13, color: 'var(--muted)' }}>
              {has ? `de 5 · ${plural(org.reviewsCount, 'avaliação', 'avaliações')}` : 'sem avaliações'}
            </span>
          </BigRing>
          {has && (
            <span className="pill pill-match" style={{ fontSize: 16, padding: '8px 16px' }}>
              {m}% para ti
            </span>
          )}
        </div>
      </section>

      <OrgTabs org={org} tab={tab} desktop />

      <div style={{ ...twoCols, paddingTop: 40 }}>
        <section aria-label="Avaliações" className="stack">
          <ReviewsSection org={org} desktop />
        </section>
        <aside className="stack" style={{ gap: 48 }}>
          {has && <DesktopRespeito org={org} />}
          {has && <DesktopCriteria org={org} />}
          <section aria-labelledby="onde-fica" className="stack" style={{ gap: 12 }}>
            <h2 id="onde-fica" className="h2" style={{ fontSize: 20 }}>
              Onde fica
            </h2>
            <MapView locations={org.locations} active={active} onPick={org.locations.length > 1 ? setActive : undefined} height={190} showLink={false} />
            <LocationPicker org={org} active={active} onPick={setActive} />
            {(() => {
              const cur = org.locations.find((l) => l.id === active) ?? org.locations[0];
              return cur ? (
                <a
                  className="link"
                  style={{ alignSelf: 'flex-start' }}
                  href={`https://www.openstreetmap.org/?mlat=${cur.lat}&mlon=${cur.lng}#map=17/${cur.lat}/${cur.lng}`}
                  target="_blank"
                  rel="noreferrer"
                >
                  Abrir no mapa <Icon name="external" size={14} />
                </a>
              ) : null;
            })()}
          </section>
        </aside>
      </div>
    </div>
  );
}

function DesktopRespeito({ org }: { org: Org }) {
  const [tags, setTags] = useState(false);
  const r = org.scores.respeito ?? 0;
  return (
    <section aria-labelledby="resp-h" style={{ background: 'var(--purple-tint)', borderRadius: 24, padding: 22 }} className="stack">
      <div className="row" style={{ gap: 16 }}>
        <Ring value={r} size={64} color="var(--purple)" track="var(--purple-line)" inner="var(--purple-tint)" fontSize={20} ariaLabel={`Respeito e inclusão ${fmt(r)} de 5`} />
        <span className="stack" style={{ gap: 4 }}>
          <h2 id="resp-h" className="h2" style={{ fontSize: 20, color: 'var(--purple-text)' }}>
            Respeito e inclusão
          </h2>
          <span className="small" style={{ lineHeight: 1.4, color: 'var(--purple-text)' }}>
            {harassmentLine(org)}
          </span>
        </span>
      </div>
      <button
        type="button"
        className="link"
        aria-expanded={tags}
        aria-controls="resp-tags-d"
        onClick={() => setTags(!tags)}
        style={{ color: 'var(--purple-text)', alignSelf: 'flex-start', paddingBottom: tags ? 6 : 0 }}
      >
        {tags ? 'Esconder o que dizem' : 'Ver o que dizem'}
        <Icon name="down" size={16} style={{ transform: tags ? 'rotate(180deg)' : undefined, transition: 'transform .15s' }} />
      </button>
      {tags && (
        <div id="resp-tags-d" className="fade-up">
          <RespeitoTags org={org} />
        </div>
      )}
    </section>
  );
}

function DesktopCriteria({ org }: { org: Org }) {
  const { prefs, rest, prio, v } = useCriteriaSplit(org);
  const [all, setAll] = useState(false);
  return (
    <section aria-labelledby="prio-h" className="stack" style={{ gap: 12 }}>
      <h2 id="prio-h" className="h2" style={{ fontSize: 20, marginBottom: 4 }}>
        As tuas prioridades
      </h2>
      {prefs.map((k) => (
        <CritLine key={k} k={k} value={v(k)} priority={prio(k)} bold />
      ))}
      {all && (
        <div id="crit-rest-d" className="stack fade-up" style={{ gap: 12, paddingTop: 12, borderTop: '1px solid var(--line)' }}>
          {rest.map((k) => (
            <CritLine key={k} k={k} value={v(k)} muted />
          ))}
        </div>
      )}
      <MoreToggle open={all} onToggle={() => setAll(!all)} label="Ver os 8 critérios" openLabel="Mostrar só as prioridades" controls="crit-rest-d" />
      <Link to="/preferencias" className="small" style={{ alignSelf: 'flex-start', minHeight: 32, display: 'inline-flex', alignItems: 'center', color: 'var(--muted)' }}>
        Mudar as minhas prioridades
      </Link>
    </section>
  );
}

function DesktopInterviews({ org }: { org: Org }) {
  const s = interviewNumbers(org);
  return (
    <>
      <section aria-labelledby="como-correram" className="stack">
        <h2 id="como-correram" className="h2" style={{ fontSize: 24, marginBottom: 8 }}>
          Como correram
        </h2>
        <InterviewList org={org} desktop />
      </section>
      <aside aria-labelledby="em-resumo" className="stack" style={{ gap: 24 }}>
        <h2 id="em-resumo" className="h2" style={{ fontSize: 20 }}>
          Em resumo
        </h2>
        {s.n > 0 ? <InterviewRings org={org} /> : <span className="body">Ainda sem números.</span>}
        {s.usualSteps && (
          <div className="stack" style={{ gap: 6, paddingTop: 20, borderTop: '1px solid var(--line)' }}>
            <span className="small muted">Processo mais comum</span>
            <span style={{ fontSize: 16, fontWeight: 600 }}>{s.usualSteps}</span>
          </div>
        )}
        {s.n > 0 && (
          <div className="stack" style={{ gap: 6, paddingTop: 20, borderTop: '1px solid var(--line)' }}>
            <span className="small muted">Receberam oferta</span>
            <span className="num" style={{ fontSize: 24 }}>
              {s.offerPct}%
            </span>
          </div>
        )}
      </aside>
    </>
  );
}

function DesktopSalaries({ org }: { org: Org }) {
  const n = salaryTotal(org);
  const yes = org.paidOnTimePct != null ? Math.round((org.paidOnTimePct / 100) * n) : 0;
  return (
    <>
      <section aria-labelledby="quanto" className="stack">
        <h2 id="quanto" className="h2" style={{ fontSize: 24 }}>
          Quanto se ganha
        </h2>
        <span className="small muted" style={{ padding: '6px 0 16px' }}>
          Bruto mensal · o ponto é o valor do meio
        </span>
        <SalaryBands org={org} desktop />
      </section>
      {org.paidOnTimePct != null && n > 0 && (
        <aside aria-labelledby="a-horas" className="stack" style={{ alignItems: 'flex-start', gap: 16 }}>
          <PaidOnTime org={org} size={160} />
          <h2 id="a-horas" className="h2" style={{ fontSize: 20 }}>
            Salário pago a horas
          </h2>
          <span className="small muted">
            Segundo {yes} de {plural(n, 'pessoa', 'pessoas')}.
          </span>
        </aside>
      )}
    </>
  );
}
