import { Link, useNavigate } from 'react-router-dom';
import { apiMode } from '../api/http';
import { useOrg } from '../api/orgs';
import { Shell } from '../components/Layout';
import { Empty } from '../components/UI';
import { publishedReview, reviewsCountText, totalAfterPublishing, unreadAfterPublishing } from '../features/review/done';
import { DoneRing, NotesToggle, SupportCard } from '../features/review/DoneParts';
import styles from '../features/review/Done.module.css';
import { tr } from '../i18n';
import { useStore } from '../lib/store';
import { useIsDesktop } from '../lib/useMedia';
import { useToggle } from '../lib/useToggle';
import { FlowHead, MiniSteps, NotesGrid } from '../features/review/FlowParts';

/** Avaliação publicada: agradecer, mostrar a nota e, se houve relato grave, o apoio */
export default function AvaliarFeito() {
  const desktop = useIsDesktop();
  const nav = useNavigate();
  const { myReviews, lastPublished, user, messages } = useStore();
  const review = publishedReview(myReviews, lastPublished);
  const org = useOrg(review?.orgId);
  const [open, toggleOpen] = useToggle();
  const goHome = () => nav('/');

  if (!review) {
    return (
      <Shell chrome="header">
        <div className={desktop ? 'container dpage' : 'page no-nav'}>
          {!desktop && <FlowHead icon="close" label={tr('Fechar e voltar ao início', 'Close and go back home')} onClick={goHome} />}
          <Empty
            title={tr('Ainda não publicaste nenhuma avaliação', 'You haven’t published a review yet')}
            body={tr('Leva uns 2 minutos e ninguém fica a saber que foste tu.', 'It takes about 2 minutes and no one will know it was you.')}
            action={
              <Link to="/avaliar" className={`btn btn-primary ${styles.emptyAction}`}>
                {tr('Avaliar onde trabalho', 'Review where I work')}
              </Link>
            }
          />
        </div>
      </Shell>
    );
  }

  const name = org?.name ?? tr('A organização', 'The organisation');
  const reviewsN = reviewsCountText(totalAfterPublishing(org, apiMode));
  const orgLink = org ? `/org/${org.id}` : '/';
  const support = review.flagged && <SupportCard signedIn={!!user} unread={unreadAfterPublishing(messages)} />;
  const toggle = <NotesToggle open={open} onToggle={toggleOpen} desktop={desktop} />;
  const seeOnPage = tr('Ver na página da organização', 'See it on the organisation’s page');

  if (desktop) {
    return (
      <Shell chrome="header">
        <div className={`container fade-up ${styles.container}`}>
          <div className={`row wrap ${styles.columns}`}>
            <div className={styles.main}>
              <div className={`row wrap ${styles.heroDesktop}`}>
                <DoneRing avg={review.avg} desktop />
                <div className={styles.heroDesktopText}>
                  <h1 className={styles.titleDesktop}>{tr('Publicado. Obrigado.', 'Published. Thank you.')}</h1>
                  <p className={`lead ${styles.lead}`}>{tr(<>Ninguém sabe que foste tu. {name} passa a ter {reviewsN}.</>, <>No one knows it was you. {name} now has {reviewsN}.</>)}</p>
                </div>
              </div>
              <div className={`row wrap ${styles.toggleRow}`}>{toggle}</div>
              {open && <NotesGrid desktop scores={review.scores} />}
            </div>
            <aside className={styles.aside}>
              {support}
              <Link to={orgLink} className={`btn btn-dark lift ${styles.ctaMain}`}>
                {seeOnPage}
              </Link>
              <Link to="/" className={`btn ${styles.homeDesktop}`}>
                {tr('Voltar ao início', 'Back to home')}
              </Link>
            </aside>
          </div>
        </div>
      </Shell>
    );
  }

  return (
    <Shell>
      <div className={`page ${styles.mobilePage}`}>
        <FlowHead icon="close" label={tr('Fechar e voltar ao início', 'Close and go back home')} onClick={goHome} right={<MiniSteps current={3} done />} />
        <div className={styles.hero}>
          <DoneRing avg={review.avg} desktop={false} />
          <h1 className={styles.heroTitle}>{tr('Publicado. Obrigado.', 'Published. Thank you.')}</h1>
          <div className={styles.heroText}>{tr(<>{name} passa a ter {reviewsN}.</>, <>{name} now has {reviewsN}.</>)}</div>
        </div>

        {support}

        <section aria-label={tr('As tuas notas', 'Your scores')} className={`stack ${styles.notes}`}>
          {toggle}
          {open && <NotesGrid scores={review.scores} />}
        </section>

        <div className={`sticky-cta stack ${styles.cta}`}>
          <Link to={orgLink} className={`btn btn-dark btn-block ${styles.ctaMain}`}>
            {seeOnPage}
          </Link>
          <Link to="/" className={`btn btn-block ${styles.ctaHome}`}>
            {tr('Voltar ao início', 'Back to home')}
          </Link>
        </div>
      </div>
    </Shell>
  );
}
