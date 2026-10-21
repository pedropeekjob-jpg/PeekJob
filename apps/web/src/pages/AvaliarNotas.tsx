import { useCallback, useState } from 'react';
import { Navigate } from 'react-router';
import { apiMode } from '../api/http';
import { useOrg } from '../api/orgs';
import { Ring } from '../components/Data';
import { Icon } from '../components/Icon';
import { Shell } from '../components/Layout';
import { ResponsibilityNote } from '../components/UI';
import { RewriteHelper } from '../components/RewriteHelper';
import type { CriterionKey } from '../data/criteria';
import type { Org } from '../data/orgs';
import { PublishErrorBox } from '../features/review/PublishErrorBox';
import { SupportAlert } from '../features/review/SupportAlert';
import { ReviewTextMobile } from '../features/review/ReviewTextMobile';
import { useFlowNav } from '../features/review/useFlowNav';
import { REVIEW_TEXT_MAX, useReviewDraft } from '../features/review/useReviewDraft';
import { tr } from '../i18n';
import { fmt } from '../lib/format';
import { useStore } from '../lib/store';
import { useIsDesktop } from '../lib/useMedia';
import { DeskSteps, FlowHead, LockLine, MiniSteps, RecommendButtons, ScoreRow, TagPicker } from '../features/review/FlowParts';
import { DESKTOP_ORDER, MOBILE_ORDER, scoreOf } from '../features/review/flow';
import styles from './AvaliarNotas.module.css';

type Review = ReturnType<typeof useReviewDraft>;
interface ViewProps {
  org: Org;
  locationLabel?: string;
  verified: boolean;
  review: Review;
}

/** Avaliar · notas, comentário (opcional) e publicar, no mesmo ecrã (telemóvel e computador) */
export default function AvaliarNotas() {
  const desktop = useIsDesktop();
  const { draft, remote } = useStore();
  const org = useOrg(draft.orgId);
  const review = useReviewDraft();

  if (apiMode && draft.orgId && !org && !remote.ready) return null;
  // Ao publicar o rascunho é limpo antes de ir para "publicado": não voltar a /avaliar pelo meio
  if (!draft.orgId || !org) return review.busy ? null : <Navigate to="/avaliar" replace />;

  const props: ViewProps = { org, locationLabel: org.locations.find((l) => l.id === draft.locationId)?.label, verified: !!draft.verified, review };
  return desktop ? <DesktopNotas {...props} /> : <MobileNotas {...props} />;
}

const recommendLabel = (v: boolean | null) =>
  v === true ? tr('recomendas', 'you recommend it') : v === false ? tr('não recomendas', 'you don’t recommend it') : tr('sem resposta', 'no answer');

function MobileNotas({ org, locationLabel, review }: ViewProps) {
  const { go, leave, change } = useFlowNav();
  const [help, setHelp] = useState<CriterionKey | null>(null);
  const toggleHelp = useCallback((k: CriterionKey) => setHelp((h) => (h === k ? null : k)), []);
  const { done, insult } = review;
  // "publicado" substitui as notas: voltar atrás nunca cai num rascunho já publicado
  const publish = async () => {
    if (await review.publish()) go('/avaliar/feito', { replace: true });
  };
  return (
    <Shell>
      <div className={`page ${styles.mobile}`}>
        <FlowHead icon="close" label={tr('Fechar (o rascunho fica guardado)', 'Close (your draft is saved)')} onClick={() => leave(`/org/${org.id}`)} right={<MiniSteps current={2} />} />
        <div className={styles.titleBlock}>
          <h1 className={styles.title}>{tr('Dá uma nota de 1 a 5', 'Score from 1 to 5')}</h1>
          <div className="small muted">
            {org.name}
            {locationLabel ? ` · ${locationLabel.split(' · ').pop()}` : ''} ·{' '}
            <button type="button" className={`link ${styles.change}`} onClick={change}>
              {tr('Mudar', 'Change')}
            </button>
          </div>
        </div>

        <div className="stack">
          {MOBILE_ORDER.map((k) => (
            <ScoreRow key={k} k={k} value={scoreOf(review.scores, k)} onPick={review.setScore} helpOpen={help === k} onHelp={toggleHelp} />
          ))}
        </div>

        <div className={`row between ${styles.recommend}`}>
          <span className={styles.recommendLabel}>{tr('Recomendavas a um amigo?', 'Would you recommend it to a friend?')}</span>
          <RecommendButtons value={review.recommend} onChange={review.setRecommend} />
        </div>

        <ReviewTextMobile review={review} />
        <ResponsibilityNote />

        <div className={`sticky-cta stack ${styles.cta}`}>
          <PublishErrorBox error={review.error} onUseSuggestion={review.useText} />
          <button type="button" className={`btn btn-dark btn-block ${styles.next}`} disabled={!review.canPublish || review.busy} onClick={publish}>
            {insult ? tr('Corrige a frase para publicar', 'Fix the sentence to publish') : done ? tr('Publicar avaliação', 'Publish review') : tr('Dá pelo menos uma nota', 'Give at least one score')}
            {!insult && <span className={`mono ${styles.nextCount}`}>{done}/8</span>}
          </button>
          <LockLine center>{tr('Publicação anónima', 'Anonymous post')}</LockLine>
        </div>
      </div>
    </Shell>
  );
}

function DesktopNotas({ org, locationLabel, verified, review }: ViewProps) {
  const { go, change } = useFlowNav();
  const { text, redFlags, insult, done, average } = review;
  const textClass = insult ? styles.textBlocked : redFlags.flagged ? styles.textFlagged : styles.text;
  const publish = async () => {
    if (await review.publish()) go('/avaliar/feito', { replace: true });
  };
  return (
    <Shell chrome="header">
      <div className={`container ${styles.desktop}`}>
        <DeskSteps
          current={2}
          onChange={change}
          right={
            <button type="button" className={`row ${styles.orgLink}`} onClick={change}>
              <span className={styles.orgName}>{org.name}</span>
              {verified ? <span className="pill pill-match">{tr('Verificado', 'Verified')}</span> : locationLabel && <span className="muted">{locationLabel}</span>}
              <span className={styles.orgChange}>{tr('Mudar', 'Change')}</span>
            </button>
          }
        />
        <div className={styles.columns}>
          <div className={styles.main}>
            <div className={styles.intro}>
              <h1 className={styles.desktopTitle}>{tr('Como é trabalhar lá?', 'What’s it like to work there?')}</h1>
              <p className={`lead ${styles.lead}`}>{tr('De 1 a 5. Se não sabes, deixa em branco, não faz mal.', 'From 1 to 5. Not sure? Leave it blank, that’s fine.')}</p>
            </div>

            <section aria-label={tr('Notas por critério', 'Scores by criterion')} className={styles.scores}>
              {DESKTOP_ORDER.map((k) => (
                <ScoreRow key={k} k={k} desktop value={scoreOf(review.scores, k)} onPick={review.setScore} />
              ))}
              <div className={`row wrap between ${styles.scoresFoot}`}>
                <span className={styles.scoresFootLabel}>{tr('Recomendavas a um amigo?', 'Would you recommend it to a friend?')}</span>
                <RecommendButtons desktop value={review.recommend} onChange={review.setRecommend} />
              </div>
            </section>

            <section aria-labelledby="exp-t" className={styles.experience}>
              <h2 id="exp-t" className={styles.h2}>
                {tr('Conta como é', 'Tell us what it’s like')}
              </h2>
              <TagPicker desktop badFirst visible={3} tags={review.tags} onToggle={review.toggleTag} />
              <div className={styles.field}>
                <label htmlFor="texto" className="sr-only">
                  {tr('A tua experiência', 'Your experience')}
                </label>
                <textarea
                  id="texto"
                  className={`textarea ${textClass}`}
                  rows={4}
                  maxLength={REVIEW_TEXT_MAX}
                  value={text}
                  aria-describedby="texto-ajuda"
                  aria-invalid={insult}
                  onChange={(e) => review.setText(e.target.value)}
                />
                <div className={`row between small muted ${styles.fieldFoot}`}>
                  <span id="texto-ajuda">{tr('Descreve o que acontece, não quem é. Sem nomes.', 'Describe what happens, not who. No names.')}</span>
                  <span className={`mono ${text.length > REVIEW_TEXT_MAX - 40 ? styles.countOver : ''}`}>
                    {text.length}/{REVIEW_TEXT_MAX}
                  </span>
                </div>
              </div>
            </section>
          </div>

          <aside aria-label={tr('Pré-visualização', 'Preview')} className={styles.aside}>
            <div className={`row ${styles.summary}`}>
              <Ring value={average} size={104} thickness={9} inner="var(--ground)" muted={!done} fontSize={32} ariaLabel={done ? tr(`Nota média ${fmt(average)} de 5`, `Average score ${fmt(average)} out of 5`) : tr('Ainda sem notas', 'No scores yet')} />
              <div className={styles.summaryText}>
                <span className={styles.summaryTitle}>{tr('A tua nota', 'Your score')}</span>
                <span className="small muted">
                  {tr(`${done} de 8 notas`, `${done} of 8 scores`)} · {recommendLabel(review.recommend)}
                </span>
              </div>
            </div>

            {redFlags.flagged && <SupportAlert redFlags={redFlags} variant="card" />}
            <RewriteHelper text={text} desktop onUse={review.useText} />

            {!redFlags.flagged && !insult && done > 0 && (
              <div role="status" className={`row ${styles.ok}`}>
                <Icon name="check" size={18} stroke={2.2} />
                {tr('Tudo certo para publicar.', 'All set to publish.')}
              </div>
            )}

            <PublishErrorBox error={review.error} onUseSuggestion={review.useText} />
            <button type="button" className={`btn btn-dark lift ${styles.publish}`} disabled={!review.canPublish || review.busy} onClick={publish}>
              {insult ? tr('Corrige a frase para publicar', 'Fix the sentence to publish') : done ? tr('Publicar avaliação', 'Publish review') : tr('Dá pelo menos uma nota', 'Give at least one score')}
            </button>
            <LockLine>{tr('Publicada sem o teu nome.', 'Published without your name.')}</LockLine>
            <ResponsibilityNote />
          </aside>
        </div>
      </div>
    </Shell>
  );
}
