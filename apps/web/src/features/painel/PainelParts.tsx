import { Link } from 'react-router';
import { Ring } from '../../components/Data';
import { Icon } from '../../components/Icon';
import { BigRing, CritLine } from '../../components/Score';
import { MoreToggle } from '../../components/UI';
import type { Org, Review } from '../../data/orgs';
import { tr } from '../../i18n';
import { tagLabel, whenLabel } from '../../i18n/labels';
import { fmt } from '../../lib/format';
import { useToggle } from '../../lib/useToggle';
import type { CriterionKey } from '../../data/criteria';
import { CRITERIA_ORDER, direction, harassmentNote, SEAL_MIN, weekChange } from './painel';
import { useReply } from './usePainel';
import styles from './Painel.module.css';

/** Nota grande com um anel a pulsar à volta */
export function ScoreRing({ org, desktop }: { org: Org; desktop: boolean }) {
  return (
    <div className={styles.ringWrap}>
      <div className={`pulse ${styles.pulseRing}`} aria-hidden="true" />
      <BigRing value={org.score} size={desktop ? 168 : 112} thickness={desktop ? 14 : 10} ariaLabel={tr(`Nota ${fmt(org.score)} de 5`, `Score ${fmt(org.score)} out of 5`)} className={styles.ring}>
        <span className={styles.score}>{fmt(org.score)}</span>
      </BigRing>
    </div>
  );
}

export function HeadInfo({ org, weekDelta, pulseOpen, onTogglePulse }: { org: Org; weekDelta: number; pulseOpen: boolean; onTogglePulse: () => void }) {
  return (
    <div className={styles.head}>
      <span className="label">{tr('O teu painel', 'Your dashboard')}</span>
      <h1 className={`h1 ${styles.name}`}>{org.name}</h1>
      <span className={`body ${styles.week}`}>
        <strong className={styles.change} data-dir={direction(weekDelta)}>
          {weekChange(weekDelta)}
        </strong>{' '}
        · {org.reviewsCount} {tr('avaliações', 'reviews')}
      </span>
      <button type="button" className={`link ${styles.pulseToggle}`} aria-expanded={pulseOpen} aria-controls="pulso" onClick={onTogglePulse}>
        {pulseOpen ? tr('Esconder o pulso da semana', 'Hide this week’s pulse') : tr('Ver o pulso da semana', 'Show this week’s pulse')}
        <Icon name="down" size={16} className={styles.chevron} />
      </button>
    </div>
  );
}

export function PublicLink({ org, desktop }: { org: Org; desktop: boolean }) {
  return (
    <div className={styles.public}>
      <Link to={`/org/${org.id}`} className={`btn btn-dark lift${desktop ? '' : ' btn-block'} ${styles.publicLink}`}>
        {tr('Ver página pública', 'View public page')} <Icon name="next" size={18} />
      </Link>
      <span className={`row small muted ${styles.anon}`}>
        <Icon name="lock" size={14} /> {tr('Não vês quem avaliou — nem nós.', 'You can’t see who reviewed — nor can we.')}
      </span>
    </div>
  );
}

/** Pulso da semana: números e etiquetas mais usadas */
export function Pulse({ stats, tags }: { stats: { value: string; label: string }[]; tags: { label: string; n: number; up: boolean }[] }) {
  return (
    <section id="pulso" className={`fade-up row wrap ${styles.pulse}`} aria-label={tr('Pulso da semana', 'This week’s pulse')}>
      {stats.map((s) => (
        <div key={s.label} className={`row ${styles.stat}`}>
          <span className={`num ${styles.statValue}`}>{s.value}</span>
          <span className="small body">{s.label}</span>
        </div>
      ))}
      <ul className={`chips ${styles.weekTags}`} aria-label={tr('Etiquetas mais usadas esta semana', 'Most used tags this week')}>
        {tags.map((t) => (
          <li key={t.label} className={`row ${styles.weekTag}`}>
            {tagLabel(t.label)}
            <span className={`mono ${styles.weekTagCount}`} data-dir={t.up ? 'up' : 'down'} aria-label={tr(`${t.n} menções, ${t.up ? 'a subir' : 'a descer'}`, `${t.n} mentions, ${t.up ? 'going up' : 'going down'}`)}>
              {t.up ? '▲' : '▼'} {t.n}
            </span>
          </li>
        ))}
      </ul>
    </section>
  );
}

/** Uma avaliação por responder: texto, resposta publicada ou caixa para responder */
function PendingReview({ review, orgId, desktop }: { review: Review; orgId: string; desktop: boolean }) {
  const r = useReply(review);
  const title = review.title || review.tags?.map(tagLabel).join(' · ');
  const id = `resp-${review.id}`;
  const meta = `${review.role} · ${whenLabel(review.when)}`;
  return (
    <article className={styles.review}>
      <div className={`row ${styles.reviewHead}`}>
        <Ring value={review.score} size={40} inner="var(--ground)" fontSize={13} />
        <span className={`grow ${styles.reviewTitleBlock}`}>
          {title && <span className={styles.reviewTitle}>{title}</span>}
          {!desktop && <span className="small muted">{meta}</span>}
        </span>
        {desktop && <span className={`small muted ${styles.nowrap}`}>{meta}</span>}
      </div>
      <p className={`body ${styles.reviewBody}`}>{review.body}</p>

      {r.published && !r.composing && (
        <div className={`fade-up ${styles.published}`}>
          <span className={`small ${styles.publishedLabel}`}>{tr('A tua resposta · publicada', 'Your reply · published')}</span>
          <span className={`body ${styles.publishedText}`}>{r.published}</span>
          <button type="button" className={`link small ${styles.edit}`} onClick={r.start}>
            <Icon name="edit" size={14} /> {tr('Editar resposta', 'Edit reply')}
          </button>
        </div>
      )}

      {r.composing && (
        <div className={`fade-up ${styles.compose}`}>
          <label htmlFor={id} className="small muted">
            {tr('Resposta pública, visível para todos', 'Public reply, visible to everyone')}
          </label>
          <textarea id={id} className={`textarea ${styles.textarea}`} rows={3} value={r.draft} onChange={(e) => r.setDraft(e.target.value)} placeholder={tr('Obrigado pela avaliação…', 'Thanks for your review…')} />
          {r.error && (
            <span role="alert" className={`small ${styles.replyError}`}>
              {r.error}
            </span>
          )}
          <div className={`row wrap ${styles.composeActions}`}>
            <button type="button" className={`btn btn-dark ${styles.publish}`} disabled={!r.canPublish} onClick={() => void r.publish(orgId)}>
              {tr('Publicar resposta', 'Publish reply')}
            </button>
            <button type="button" className={`btn ${styles.cancel}`} onClick={r.cancel}>
              {tr('Cancelar', 'Cancel')}
            </button>
          </div>
        </div>
      )}

      {!r.published && !r.composing && (
        <button type="button" className={`link ${styles.replyButton}`} onClick={r.start}>
          {tr('Responder', 'Reply')}
        </button>
      )}
    </article>
  );
}

export function PendingSection({ reviews, orgId, unanswered, desktop }: { reviews: Review[]; orgId: string; unanswered: number; desktop: boolean }) {
  return (
    <section aria-labelledby="pr" className={styles.pending}>
      <div className={`row between ${styles.sectionHead}`}>
        <h2 id="pr" className={`h2 ${styles.sectionTitle}`}>
          {tr('Por responder', 'Awaiting reply')}
        </h2>
        <span role="status" className={`small ${styles.pendingStatus}`} data-done={unanswered === 0 || undefined}>
          {unanswered === 0 ? tr('Tudo respondido ✓', 'All answered ✓') : tr(`${unanswered} sem resposta`, `${unanswered} unanswered`)}
        </span>
      </div>
      {reviews.map((r) => (
        <PendingReview key={r.id} review={r} orgId={orgId} desktop={desktop} />
      ))}
    </section>
  );
}

type Peers = { sector: string; count: number; score: number } | null;

/**
 * Critérios: 3 principais e "ver todos". Com o Pro, a variação de cada um e a média do setor;
 * sem o Pro, só as notas (e o que o Pro acrescenta).
 */
export function WeekCriteria({ org, delta, peers }: { org: Org; delta: Partial<Record<CriterionKey, number>> | null; peers: Peers }) {
  const [all, toggleAll] = useToggle();
  const line = (k: CriterionKey) => <CritLine key={k} k={k} value={org.scores[k]} delta={delta ? (delta[k] ?? 0) : undefined} minHeight={36} />;
  return (
    <section aria-labelledby="cr" className={styles.criteria}>
      <div className={`row between ${styles.criteriaHead}`}>
        <h2 id="cr" className={`h2 ${styles.sectionTitle}`}>
          {tr('Critérios', 'Criteria')}
        </h2>
        {delta && <span className="small muted">{tr('vs. semana passada', 'vs. last week')}</span>}
      </div>
      {CRITERIA_ORDER.slice(0, 3).map(line)}
      {all && (
        <div id="crit-all" className={`fade-up ${styles.criteriaRest}`}>
          {CRITERIA_ORDER.slice(3).map(line)}
        </div>
      )}
      <MoreToggle open={all} onToggle={toggleAll} label={tr('Ver todos os 8', 'Show all 8')} openLabel={tr('Ver só os 3 principais', 'Show top 3 only')} controls="crit-all" />
      {peers && (
        <p className={`small body ${styles.peers}`}>
          {tr(`Média do setor (${peers.sector}): `, `Sector average (${peers.sector}): `)}
          <strong className="num">{fmt(peers.score)}</strong> · {tr(`${peers.count} organizações`, `${peers.count} organisations`)}
        </p>
      )}
      {!delta && (
        <p className={`small ${styles.proNote}`}>
          {tr('Com o plano Pro: a variação de cada critério e a comparação com o setor. Nunca muda a posição no ranking.', 'With the Pro plan: how each criterion changes and how you compare with your sector. It never changes your ranking.')}{' '}
          <Link to="/para-organizacoes" className="link">
            {tr('Ver planos', 'See plans')}
          </Link>
        </p>
      )}
    </section>
  );
}

export function RespeitoCard({ org }: { org: Org }) {
  const respeito = org.scores.respeito ?? 0;
  return (
    <section aria-labelledby="ri" className={styles.respeito}>
      <div className={`row ${styles.respeitoHead}`}>
        <Ring value={respeito} size={72} color="var(--purple)" track="var(--purple-line)" inner="var(--purple-tint)" fontSize={20} ariaLabel={tr(`Respeito e inclusão ${fmt(respeito)} de 5`, `Respect and inclusion ${fmt(respeito)} out of 5`)} />
        <div className={styles.respeitoText}>
          <h2 id="ri" className={`h2 ${styles.respeitoTitle}`}>
            {tr('Respeito e inclusão', 'Respect and inclusion')}
          </h2>
          <span className={`small ${styles.purple}`}>
            {respeito >= SEAL_MIN
              ? tr('Tens o selo. Ganha-se por mérito, não se compra.', 'You have the badge. It’s earned on merit, never bought.')
              : tr('O selo ganha-se com nota acima de 4,5. Não se compra.', 'The badge is earned with a score above 4.5. It can’t be bought.')}
          </span>
        </div>
      </div>
      <ul className={`chips ${styles.respeitoTags}`}>
        {org.respeitoTags.map((t) => (
          <li key={t.label} className={styles.respeitoTag}>
            {tagLabel(t.label)} · {t.n}
          </li>
        ))}
      </ul>
      <span className={`small ${styles.purple}`}>{harassmentNote(org.harassmentReports)}</span>
    </section>
  );
}

/** Relatórios semanal e mensal (21/10): no Pro abrem; sem o Pro explicam o que trazem */
export function ReportLinks({ orgId, pro }: { orgId: string; pro: boolean }) {
  const href = (periodo: 'semana' | 'mes') => `/painel/relatorio?${new URLSearchParams({ periodo, org: orgId })}`;
  return (
    <section aria-labelledby="rel" className={styles.reports}>
      <div className={`row between ${styles.criteriaHead}`}>
        <h2 id="rel" className={`h2 ${styles.sectionTitle}`}>
          {tr('Relatórios', 'Reports')}
        </h2>
        {!pro && <span className="pill">Pro</span>}
      </div>
      <p className="small body">
        {tr(
          'Resultados, comparação com organizações parecidas, pontos fortes e o que melhorar, com passos concretos.',
          'Results, comparison with similar organisations, strengths and what to improve, with concrete steps.',
        )}
      </p>
      <div className={`row wrap ${styles.reportButtons}`}>
        <Link to={href('semana')} className="btn btn-ghost">
          {tr('Relatório semanal', 'Weekly report')}
        </Link>
        <Link to={href('mes')} className="btn btn-ghost">
          {tr('Relatório mensal', 'Monthly report')}
        </Link>
      </div>
    </section>
  );
}
