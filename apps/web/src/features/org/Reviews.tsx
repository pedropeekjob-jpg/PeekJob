import { Link } from 'react-router';
import { Ring } from '../../components/Data';
import { Icon } from '../../components/Icon';
import { Empty } from '../../components/UI';
import type { Org, Review } from '../../data/orgs';
import { tr } from '../../i18n';
import { tagLabel, whenLabel } from '../../i18n/labels';
import { fmt } from '../../lib/format';
import { useStore, type MyReview } from '../../lib/store';
import { useToggle } from '../../lib/useToggle';
import { reviewLists } from './org';
import { optionLabel, paramMeta, isExtraKey, type ExtraKey, type ParamKey } from '../../data/params';
import { CRITERIA } from '../../data/criteria';
import { PublishErrorBox } from '../review/PublishErrorBox';
import { REVIEW_TEXT_MAX } from '../review/useReviewDraft';
import { OrgReply } from './OrgCommon';
import { useMyReview } from './useMyReview';
import { useOrgActions, useUseful } from './useOrgPage';
import styles from './Reviews.module.css';

/** Denunciar uma avaliação ou entrevista */
export function ReportLink({ org, itemId }: { org: Org; itemId: string }) {
  return (
    <Link to={`/org/${org.id}/denunciar/${itemId}`} className={`row ${styles.report}`}>
      <Icon name="flag" size={14} /> {tr('Denunciar', 'Report')}
    </Link>
  );
}

/**
 * O que a pessoa respondeu além das notas (21/10): comentários por critério e parâmetros do tipo de trabalho.
 * Ordem: critérios pela ordem habitual, depois os parâmetros.
 */
export function ReviewDetails({ r }: { r: Pick<Review, 'extras' | 'comments' | 'scores'> }) {
  const extras = r.extras ?? {};
  const comments = r.comments ?? {};
  const keys: ParamKey[] = [
    ...CRITERIA.map((c) => c.key).filter((k) => comments[k]),
    ...(Object.keys(extras) as ExtraKey[]).filter(isExtraKey),
    ...(Object.keys(comments).filter((k) => isExtraKey(k) && extras[k] === undefined) as ExtraKey[]),
  ];
  if (!keys.length) return null;
  const answer = (k: ParamKey) => {
    const v = isExtraKey(k) ? extras[k] : r.scores?.[k];
    if (typeof v === 'boolean') return v ? tr('Sim', 'Yes') : tr('Não', 'No');
    if (typeof v === 'number') return tr(`${v} de 5`, `${v} of 5`);
    if (typeof v === 'string') return optionLabel(v);
    return null;
  };
  return (
    <dl className={styles.details}>
      {keys.map((k) => {
        const a = answer(k);
        return (
          <div key={k} className={styles.detail}>
            <dt className={styles.detailName}>
              {paramMeta(k).label}
              {a && <span className={styles.detailAnswer}> · {a}</span>}
            </dt>
            {comments[k] && <dd className={styles.detailText}>{comments[k]}</dd>}
          </div>
        );
      })}
    </dl>
  );
}

/** Corrigir o texto ou apagar a minha avaliação (RGPD: retificação e apagamento sem apagar a conta) */
function MyReviewActions({ r }: { r: MyReview }) {
  const m = useMyReview(r);
  const id = `mine-text-${r.id}`;
  if (m.mode === 'edit') {
    return (
      <div className={`stack fade-up ${styles.mineEdit}`}>
        <label htmlFor={id} className="small muted">
          {tr('O teu texto (as notas ficam iguais)', 'Your text (your scores stay the same)')}
        </label>
        <textarea id={id} className="textarea" rows={4} maxLength={REVIEW_TEXT_MAX} value={m.draft} onChange={(e) => m.setDraft(e.target.value)} />
        <PublishErrorBox error={m.error} onUseSuggestion={m.useSuggestion} />
        <div className={`row wrap ${styles.mineButtons}`}>
          <button type="button" className="btn btn-dark" disabled={m.busy || !m.changed} onClick={() => void m.save()}>
            {m.busy ? tr('A guardar…', 'Saving…') : tr('Guardar', 'Save')}
          </button>
          <button type="button" className="btn" disabled={m.busy} onClick={m.cancel}>
            {tr('Cancelar', 'Cancel')}
          </button>
        </div>
      </div>
    );
  }
  if (m.mode === 'delete') {
    return (
      <div className={`stack fade-up ${styles.mineEdit}`}>
        <span className="body">{tr('Apagar esta avaliação? Não dá para desfazer.', 'Delete this review? This can’t be undone.')}</span>
        <PublishErrorBox error={m.error} onUseSuggestion={m.useSuggestion} />
        <div className={`row wrap ${styles.mineButtons}`}>
          <button type="button" className="btn btn-dark" disabled={m.busy} onClick={() => void m.remove()}>
            {m.busy ? tr('A apagar…', 'Deleting…') : tr('Apagar de vez', 'Delete for good')}
          </button>
          <button type="button" className="btn" disabled={m.busy} onClick={m.cancel}>
            {tr('Cancelar', 'Cancel')}
          </button>
        </div>
      </div>
    );
  }
  return (
    <div className={`row ${styles.mineButtons}`}>
      <button type="button" className={`link small row ${styles.mineAction}`} onClick={m.edit}>
        <Icon name="edit" size={14} /> {tr('Corrigir o texto', 'Edit text')}
      </button>
      <button type="button" className={`link small ${styles.mineAction}`} onClick={m.askDelete}>
        {tr('Apagar', 'Delete')}
      </button>
    </div>
  );
}

/** A minha avaliação (só eu vejo a etiqueta) */
function MyReviewItem({ r, org, desktop }: { r: MyReview; org: Org; desktop: boolean }) {
  const loc = org.locations.find((l) => l.id === r.locationId);
  return (
    <article className={`stack ${styles.mine}`} aria-label={tr('A tua avaliação', 'Your review')}>
      <div className={`row ${styles.mineHead}`}>
        {desktop && <Ring value={r.avg} size={44} inner="var(--ground)" fontSize={13} />}
        <span className={`row wrap grow ${styles.mineTags}`}>
          <span className="pill pill-ink">{tr('A tua avaliação', 'Your review')}</span>
          <span className="small muted">
            {loc ? `${loc.label} · ` : ''}
            {whenLabel(r.when)}
            {r.edited ? tr(' · editada', ' · edited') : ''}
          </span>
        </span>
        {!desktop && (
          <span className={`num ${styles.mineScore}`} aria-label={tr(`Nota ${fmt(r.avg)} de 5`, `Score ${fmt(r.avg)} out of 5`)}>
            {fmt(r.avg)}
          </span>
        )}
      </div>
      {r.text && <p className={`body ${styles.mineText}`}>{r.text}</p>}
      <ReviewDetails r={r} />
      {r.tags.length > 0 && (
        <div className={`chips ${styles.chips}`}>
          {r.tags.map((t) => (
            <span key={t} className="pill pill-match">
              {tagLabel(t)}
            </span>
          ))}
        </div>
      )}
      <span className={`small muted row ${styles.lockLine}`}>
        <Icon name="lock" size={14} /> {tr('Publicada sem o teu nome. Só tu vês esta etiqueta.', 'Published without your name. Only you see this label.')}
      </span>
      <MyReviewActions r={r} />
    </article>
  );
}

function VerifiedMark() {
  return (
    <svg role="img" aria-label={tr('Avaliação verificada', 'Verified review')} width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--teal-text)" strokeWidth="2.6" strokeLinecap="round" className={styles.check}>
      <title>{tr('Avaliação verificada', 'Verified review')}</title>
      <path d="M20 6L9 17l-5-5" />
    </svg>
  );
}

/** Uma avaliação: título, texto, resposta da organização, útil e denunciar */
function ReviewItem({ r, org, desktop }: { r: Review; org: Org; desktop: boolean }) {
  const useful = useUseful();
  const n = useful.count(r);
  const meta = `${r.role} · ${whenLabel(r.when)}`;
  const check = r.verified ? <VerifiedMark /> : null;
  const actions = (
    <div className={`row ${styles.actions}`}>
      <button
        type="button"
        aria-pressed={useful.isOn(r)}
        onClick={() => useful.toggle(r)}
        aria-label={tr(`Útil, ${n} ${n === 1 ? 'pessoa' : 'pessoas'}`, `Helpful, ${n} ${n === 1 ? 'person' : 'people'}`)}
        className={`row ${styles.useful}`}
      >
        <Icon name="thumb" size={16} filled={false} className={styles.usefulIcon} />
        {tr('Útil', 'Helpful')} <span className="mono">{n}</span>
      </button>
      <ReportLink org={org} itemId={r.id} />
    </div>
  );

  if (desktop) {
    return (
      <article className={`stack ${styles.reviewDesktop}`}>
        <div className={`row ${styles.reviewDesktopHead}`}>
          <Ring value={r.score} size={44} inner="var(--ground)" fontSize={13} />
          <span className={styles.reviewDesktopText}>
            <h3 className={`h3 ${styles.reviewDesktopTitle}`}>{r.title}</h3>
            <span className={`row small muted ${styles.reviewDesktopMeta}`}>
              {check}
              {meta}
            </span>
          </span>
        </div>
        <p className={`body ${styles.reviewDesktopBody}`}>{r.body}</p>
        <ReviewDetails r={r} />
        <OrgReply org={org} review={r} />
        {actions}
      </article>
    );
  }
  return (
    <article className={`stack ${styles.review}`}>
      <div className={`row small muted ${styles.reviewMeta}`}>
        {check}
        <span>{meta}</span>
        <span className={`num ${styles.reviewScore}`} aria-label={tr(`Nota ${fmt(r.score)} de 5`, `Score ${fmt(r.score)} out of 5`)}>
          {fmt(r.score)}
        </span>
      </div>
      <h3 className={`h3 ${styles.reviewTitle}`}>{r.title}</h3>
      <p className={`body ${styles.reviewBody}`}>{r.body}</p>
      <ReviewDetails r={r} />
      <OrgReply org={org} review={r} />
      {actions}
    </article>
  );
}

/** Lista de avaliações (a minha primeiro) ou convite para ser a primeira pessoa */
export function ReviewsSection({ org, desktop }: { org: Org; desktop: boolean }) {
  const { myReviews } = useStore();
  const { startReview } = useOrgActions(org);
  const [all, toggleAll] = useToggle();
  const { mine, others, shown } = reviewLists(org, myReviews, all);
  if (!mine.length && !others.length) {
    return (
      <Empty
        title={tr('Ainda sem avaliações.', 'No reviews yet.')}
        body={tr('Trabalhas ou trabalhaste aqui? Conta como é: ajudas quem vem a seguir, e é anónimo.', 'If you work or worked here, your review helps people who are looking. It’s anonymous.')}
        action={
          <button type="button" className={`btn btn-primary ${styles.firstReview}`} onClick={startReview}>
            {tr('Sê a primeira pessoa a avaliar', 'Be the first to review')}
          </button>
        }
      />
    );
  }
  return (
    <div className={styles.list}>
      {mine.map((r) => (
        <MyReviewItem key={r.id} r={r} org={org} desktop={desktop} />
      ))}
      {shown.map((r) => (
        <ReviewItem key={r.id} r={r} org={org} desktop={desktop} />
      ))}
      {others.length > 2 && (
        <button type="button" className={`${desktop ? 'btn btn-ghost lift' : 'btn btn-ghost btn-block'} ${styles.more}`} aria-expanded={all} onClick={toggleAll}>
          {all ? tr('Mostrar menos', 'Show less') : tr(`Ver todas as ${org.reviewsCount} avaliações`, `See all ${org.reviewsCount} reviews`)}
        </button>
      )}
    </div>
  );
}
