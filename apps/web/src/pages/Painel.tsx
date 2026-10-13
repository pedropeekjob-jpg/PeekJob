import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useOrgs } from '../api/orgs';
import { Ring } from '../components/Data';
import { Icon } from '../components/Icon';
import { Shell } from '../components/Layout';
import { CRITERIA, DEFAULT_PREFS, type CriterionKey } from '../data/criteria';
import { WEEK_TAGS } from '../data/content';
import { ORG_BY_ID, type Review } from '../data/orgs';
import { fmt } from '../lib/format';
import { useStore } from '../lib/store';
import { useIsDesktop } from '../lib/useMedia';
import { BigRing, CritLine } from '../components/Score';
import styles from './Painel.module.css';
import { tr } from '../i18n';
import { tagLabel, whenLabel } from '../i18n/labels';

/** Painel de demonstração: a organização com sessão é a Padaria Ribeira */
const ORG = ORG_BY_ID['padaria-ribeira'];

/** Exemplo: variação de cada critério face à semana passada (só no POC) */
const WEEK_DELTA: Record<CriterionKey, number> = {
  respeito: 0.1,
  salario: 0.1,
  equilibrio: 0,
  ambiente: 0,
  lideranca: -0.1,
  estabilidade: 0,
  progressao: 0.2,
  proposito: -0.1,
};

/** Exemplo: sugestões de resposta pré-preenchidas (a organização edita antes de publicar) */
const SUGGESTED: Record<string, string> = {
  r1: 'Obrigado pelas palavras. Vamos rever os prémios de fim de ano com a equipa.',
  r2: 'Obrigado! Estamos a criar um plano de formação em pastelaria para quem quiser crescer dentro da casa.',
  r3: 'Obrigado por partilhares. Horários para quem cuida são para manter.',
};

const PENDING = ORG.reviews.slice(0, 3);

/** 1 → 1st, 2 → 2nd, 11 → 11th */
const ordinalEn = (n: number) => {
  const s = n % 100 >= 11 && n % 100 <= 13 ? 'th' : ({ 1: 'st', 2: 'nd', 3: 'rd' } as Record<number, string>)[n % 10] ?? 'th';
  return `${n}${s}`;
};

/** Os 3 critérios mais escolhidos como prioridade primeiro; os outros atrás de "Ver todos os 8" */
const ORDER: CriterionKey[] = [...DEFAULT_PREFS, ...CRITERIA.map((c) => c.key).filter((k) => !DEFAULT_PREFS.includes(k))];

export default function Painel() {
  const desktop = useIsDesktop();
  const { replies } = useStore();
  const orgs = useOrgs();
  const [pulse, setPulse] = useState(false);
  const [allCrit, setAllCrit] = useState(false);

  const answered = PENDING.filter((r) => replies[r.id]).length;
  const pending = PENDING.length - answered;

  /** posição entre as organizações avaliadas da mesma cidade */
  const cityRank = useMemo(() => {
    const same = orgs.filter((o) => o.city === ORG.city && o.reviewsCount > 0).sort((a, b) => b.score - a.score);
    return same.findIndex((o) => o.id === ORG.id) + 1;
  }, [orgs]);

  const respeito = ORG.scores.respeito ?? 0;
  const hasSeal = respeito >= 4.5;

  const ring = (
    <div style={{ position: 'relative', flex: 'none', width: desktop ? 168 : 112, height: desktop ? 168 : 112 }}>
      <div className="pulse" aria-hidden="true" style={{ position: 'absolute', inset: 0, borderRadius: '50%', border: '3px solid var(--teal)' }} />
      <BigRing value={ORG.score} size={desktop ? 168 : 112} thickness={desktop ? 14 : 10} ariaLabel={tr(`Nota ${fmt(ORG.score)} de 5`, `Score ${fmt(ORG.score)} out of 5`)} className={styles.ring}>
        <span style={{ fontSize: desktop ? 56 : 36 }}>{fmt(ORG.score)}</span>
      </BigRing>
    </div>
  );

  const trend = ORG.weekDelta;
  const headInfo = (
    <div className="stack" style={{ flex: '1 1 300px', minWidth: 0, gap: 10 }}>
      <span className="label">{tr('O teu painel', 'Your dashboard')}</span>
      <h1 className="h1" style={{ fontSize: desktop ? 52 : 34, lineHeight: 1 }}>
        {ORG.name}
      </h1>
      <span className="body" style={{ fontSize: desktop ? 16 : 15 }}>
        <strong style={{ color: trend > 0 ? 'var(--up)' : trend < 0 ? 'var(--down)' : 'var(--muted)' }}>
          {trend > 0 ? '▲' : trend < 0 ? '▼' : '='} {fmt(Math.abs(trend))} {tr('esta semana', 'this week')}
        </strong>{' '}
        · {ORG.reviewsCount} {tr('avaliações', 'reviews')}
      </span>
      <button type="button" className="link" aria-expanded={pulse} aria-controls="pulso" onClick={() => setPulse(!pulse)} style={{ alignSelf: 'flex-start', fontSize: 15 }}>
        {pulse ? tr('Esconder o pulso da semana', 'Hide this week’s pulse') : tr('Ver o pulso da semana', 'Show this week’s pulse')}
        <Icon name="down" size={16} style={{ transform: pulse ? 'rotate(180deg)' : undefined, transition: 'transform .15s' }} />
      </button>
    </div>
  );

  const publicLink = (
    <div className="stack" style={{ alignItems: desktop ? 'flex-end' : 'stretch', gap: 8 }}>
      <Link to={`/org/${ORG.id}`} className={'btn btn-dark lift' + (desktop ? '' : ' btn-block')} style={{ height: 52, borderRadius: 16 }}>
        {tr('Ver página pública', 'View public page')} <Icon name="next" size={18} />
      </Link>
      <span className="row small muted" style={{ gap: 6, justifyContent: desktop ? 'flex-end' : 'center' }}>
        <Icon name="lock" size={14} /> {tr('Não vês quem avaliou — nem nós.', 'You can’t see who reviewed — nor can we.')}
      </span>
    </div>
  );

  const pulseBlock = pulse && (
    <section
      id="pulso"
      className="fade-up row wrap"
      aria-label={tr('Pulso da semana', 'This week’s pulse')}
      style={{ marginTop: desktop ? 24 : 0, padding: '20px 0', borderTop: '1px solid var(--line)', borderBottom: '1px solid var(--line)', gap: desktop ? '20px 48px' : '16px 28px' }}
    >
      {[
        { v: String(PENDING.length), l: tr('avaliações novas', 'new reviews') },
        {
          v: tr(`${cityRank}.º`, ordinalEn(cityRank)),
          l: `${tr('em', 'in')} ${ORG.city}${typeof ORG.trend === 'number' && ORG.trend !== 0 ? ` (${ORG.trend > 0 ? '▲' : '▼'} ${Math.abs(ORG.trend)})` : ''}`,
        },
        { v: `${answered}/${PENDING.length}`, l: tr('respondidas', 'answered') },
      ].map((s) => (
        <div key={s.l} className="row" style={{ alignItems: 'baseline', gap: 8 }}>
          <span className="num" style={{ fontSize: 24, lineHeight: 1 }}>
            {s.v}
          </span>
          <span className="small body">{s.l}</span>
        </div>
      ))}
      <ul className="chips" style={{ listStyle: 'none', margin: 0, padding: 0, flexBasis: desktop ? undefined : '100%' }} aria-label={tr('Etiquetas mais usadas esta semana', 'Most used tags this week')}>
        {WEEK_TAGS.map((t) => (
          <li key={t.label} className="row" style={{ gap: 8, fontSize: 13, padding: '6px 12px', borderRadius: 999, background: 'var(--surface)', border: '1px solid var(--line)' }}>
            {tagLabel(t.label)}
            <span className="mono" style={{ fontSize: 12, color: t.up ? 'var(--up)' : 'var(--down)' }} aria-label={tr(`${t.n} menções, ${t.up ? 'a subir' : 'a descer'}`, `${t.n} mentions, ${t.up ? 'going up' : 'going down'}`)}>
              {t.up ? '▲' : '▼'} {t.n}
            </span>
          </li>
        ))}
      </ul>
    </section>
  );

  const pendingSection = (
    <section aria-labelledby="pr" className="stack" style={{ minWidth: 0 }}>
      <div className="row between" style={{ alignItems: 'baseline', gap: 12, paddingBottom: 8 }}>
        <h2 id="pr" className="h2" style={{ fontSize: 24 }}>
          {tr('Por responder', 'Awaiting reply')}
        </h2>
        <span role="status" className="small" style={{ color: pending ? 'var(--muted)' : 'var(--up)', fontWeight: pending ? 400 : 600 }}>
          {pending === 0 ? tr('Tudo respondido ✓', 'All answered ✓') : tr(`${pending} sem resposta`, `${pending} unanswered`)}
        </span>
      </div>
      {PENDING.map((r) => (
        <PendingReview key={r.id} r={r} desktop={desktop} />
      ))}
    </section>
  );

  const criteria = (
    <section aria-labelledby="cr" className="stack" style={{ gap: 6 }}>
      <div className="row between" style={{ alignItems: 'baseline', paddingBottom: 6 }}>
        <h2 id="cr" className="h2" style={{ fontSize: 24 }}>
          {tr('Critérios', 'Criteria')}
        </h2>
        <span className="small muted">{tr('vs. semana passada', 'vs. last week')}</span>
      </div>
      {ORDER.slice(0, 3).map((k) => (
        <CritLine key={k} k={k} value={ORG.scores[k]} delta={WEEK_DELTA[k]} minHeight={36} />
      ))}
      {allCrit && (
        <div id="crit-all" className="stack fade-up" style={{ gap: 6 }}>
          {ORDER.slice(3).map((k) => (
            <CritLine key={k} k={k} value={ORG.scores[k]} delta={WEEK_DELTA[k]} minHeight={36} />
          ))}
        </div>
      )}
      <button type="button" className="link" aria-expanded={allCrit} aria-controls="crit-all" onClick={() => setAllCrit(!allCrit)} style={{ alignSelf: 'flex-start', fontSize: 15 }}>
        {allCrit ? tr('Ver só os 3 principais', 'Show top 3 only') : tr('Ver todos os 8', 'Show all 8')}
      </button>
    </section>
  );

  const respeitoBlock = (
    <section aria-labelledby="ri" className="stack" style={{ background: 'var(--purple-tint)', borderRadius: 28, padding: 24, gap: 14 }}>
      <div className="row" style={{ gap: 16 }}>
        <Ring value={respeito} size={72} color="var(--purple)" track="var(--purple-line)" inner="var(--purple-tint)" fontSize={20} ariaLabel={tr(`Respeito e inclusão ${fmt(respeito)} de 5`, `Respect and inclusion ${fmt(respeito)} out of 5`)} />
        <div className="stack" style={{ gap: 4 }}>
          <h2 id="ri" className="h2" style={{ fontSize: 20, lineHeight: 1.1, color: 'var(--purple-text)' }}>
            {tr('Respeito e inclusão', 'Respect and inclusion')}
          </h2>
          <span className="small" style={{ color: 'var(--purple-text)' }}>
            {hasSeal
              ? tr('Tens o selo. Ganha-se por mérito, não se compra.', 'You have the badge. It’s earned on merit, never bought.')
              : tr('O selo ganha-se com nota acima de 4,5. Não se compra.', 'The badge is earned with a score above 4.5. It can’t be bought.')}
          </span>
        </div>
      </div>
      <ul className="chips" style={{ listStyle: 'none', margin: 0, padding: 0, gap: 6 }}>
        {ORG.respeitoTags.map((t) => (
          <li key={t.label} style={{ fontSize: 13, padding: '5px 11px', borderRadius: 999, background: 'var(--surface)', color: 'var(--purple-text)' }}>
            {tagLabel(t.label)} · {t.n}
          </li>
        ))}
      </ul>
      <span className="small" style={{ color: 'var(--purple-text)' }}>
        {ORG.harassmentReports === 0
          ? tr('Sem relatos de assédio.', 'No harassment reports.')
          : tr(`${ORG.harassmentReports} relatos de assédio — lê-os com atenção.`, `${ORG.harassmentReports} harassment reports — read them carefully.`)}
      </span>
    </section>
  );

  if (desktop) {
    return (
      <Shell>
        <div className="container" style={{ paddingTop: 32, paddingBottom: 80 }}>
          <section aria-label={tr('Resumo', 'Summary')} className="row wrap" style={{ gap: '32px 40px' }}>
            {ring}
            {headInfo}
            {publicLink}
          </section>
          {pulseBlock}
          <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1.6fr) minmax(300px, 1fr)', gap: '48px 64px', alignItems: 'start', paddingTop: 56 }}>
            {pendingSection}
            <div className="stack" style={{ gap: 48 }}>
              {criteria}
              {respeitoBlock}
            </div>
          </div>
        </div>
      </Shell>
    );
  }

  return (
    <Shell nav>
      <div className="page" style={{ gap: 28 }}>
        <section aria-label={tr('Resumo', 'Summary')} className="stack" style={{ gap: 20 }}>
          <div className="row" style={{ gap: 20 }}>
            {ring}
            {headInfo}
          </div>
          {pulseBlock}
          {publicLink}
        </section>
        {pendingSection}
        {criteria}
        {respeitoBlock}
      </div>
    </Shell>
  );
}

function PendingReview({ r, desktop }: { r: Review; desktop: boolean }) {
  const { replies, reply } = useStore();
  const published = replies[r.id];
  const [composing, setComposing] = useState(false);
  const [draft, setDraft] = useState(published ?? SUGGESTED[r.id] ?? '');
  const fid = `resp-${r.id}`;
  const indent = desktop ? 52 : 0;

  return (
    <article className="stack" style={{ padding: '22px 0', borderTop: '1px solid var(--line)', gap: 10 }}>
      <div className="row" style={{ gap: 12, alignItems: desktop ? 'center' : 'flex-start' }}>
        <Ring value={r.score} size={40} inner="var(--ground)" fontSize={13} />
        <span className="stack grow" style={{ gap: 2 }}>
          <span style={{ fontSize: 16, fontWeight: 600, lineHeight: 1.3 }}>{r.title}</span>
          {!desktop && <span className="small muted">{`${r.role} · ${whenLabel(r.when)}`}</span>}
        </span>
        {desktop && <span className="small muted" style={{ whiteSpace: 'nowrap' }}>{`${r.role} · ${whenLabel(r.when)}`}</span>}
      </div>
      <p className="body" style={{ margin: 0, fontSize: 15, lineHeight: 1.6, paddingLeft: indent }}>
        {r.body}
      </p>

      {published && !composing && (
        <div className="fade-up stack" style={{ marginLeft: indent, padding: '4px 0 4px 16px', borderLeft: '3px solid var(--teal)', gap: 4 }}>
          <span className="small" style={{ fontWeight: 600, color: 'var(--up)' }}>
            {tr('A tua resposta · publicada', 'Your reply · published')}
          </span>
          <span className="body" style={{ fontSize: 15, lineHeight: 1.55 }}>
            {published}
          </span>
          <button type="button" className="link small" style={{ alignSelf: 'flex-start', minHeight: 36, padding: 0 }} onClick={() => setComposing(true)}>
            <Icon name="edit" size={14} /> {tr('Editar resposta', 'Edit reply')}
          </button>
        </div>
      )}

      {composing && (
        <div className="fade-up stack" style={{ marginLeft: indent, gap: 8 }}>
          <label htmlFor={fid} className="small muted">
            {tr('Resposta pública, visível para todos', 'Public reply, visible to everyone')}
          </label>
          <textarea id={fid} className="textarea" rows={3} value={draft} onChange={(e) => setDraft(e.target.value)} placeholder={tr('Obrigado pela avaliação…', 'Thanks for your review…')} style={{ minHeight: 96, borderRadius: 16, fontSize: 15 }} />
          <div className="row wrap" style={{ gap: 10 }}>
            <button
              type="button"
              className="btn btn-dark"
              style={{ height: 46, borderRadius: 14, fontSize: 15 }}
              disabled={!draft.trim()}
              onClick={() => {
                reply(r.id, draft.trim());
                setComposing(false);
              }}
            >
              {tr('Publicar resposta', 'Publish reply')}
            </button>
            <button type="button" className="btn" style={{ height: 46, background: 'transparent', color: 'var(--body)', fontWeight: 500, fontSize: 15 }} onClick={() => setComposing(false)}>
              {tr('Cancelar', 'Cancel')}
            </button>
          </div>
        </div>
      )}

      {!published && !composing && (
        <button type="button" className="link" style={{ alignSelf: 'flex-start', marginLeft: indent, fontSize: 15 }} onClick={() => setComposing(true)}>
          {tr('Responder', 'Reply')}
        </button>
      )}
    </article>
  );
}
