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
import { OrgReply } from './OrgCommon';
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
          </span>
        </span>
        {!desktop && (
          <span className={`num ${styles.mineScore}`} aria-label={tr(`Nota ${fmt(r.avg)} de 5`, `Score ${fmt(r.avg)} out of 5`)}>
            {fmt(r.avg)}
          </span>
        )}
      </div>
      {r.text && <p className={`body ${styles.mineText}`}>{r.text}</p>}
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
        <OrgReply org={org} reviewId={r.id} />
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
      <OrgReply org={org} reviewId={r.id} />
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
        body={tr('Se trabalhas ou trabalhaste aqui, a tua avaliação ajuda quem procura. É anónima.', 'If you work or worked here, your review helps people who are looking. It’s anonymous.')}
        action={
          <button type="button" className={`btn btn-primary ${styles.firstReview}`} onClick={startReview}>
            {tr('Ser a primeira pessoa a avaliar', 'Be the first to review')}
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
