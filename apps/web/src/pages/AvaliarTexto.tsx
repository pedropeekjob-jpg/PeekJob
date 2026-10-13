import { Link, Navigate, useNavigate } from 'react-router-dom';
import { apiMode } from '../api/http';
import { useOrg } from '../api/orgs';
import { Icon } from '../components/Icon';
import { Shell } from '../components/Layout';
import { RewriteHelper } from '../components/RewriteHelper';
import { PublishErrorBox } from '../features/review/PublishErrorBox';
import { SupportAlert } from '../features/review/SupportAlert';
import { REVIEW_TEXT_MAX, useReviewDraft } from '../features/review/useReviewDraft';
import { tr } from '../i18n';
import { useStore } from '../lib/store';
import { useIsDesktop } from '../lib/useMedia';
import { FlowHead, LockLine, MiniSteps, TagPicker } from '../features/review/FlowParts';
import styles from './AvaliarTexto.module.css';

/** Avaliar · passo 2 no telemóvel: etiquetas, texto, avisos e publicar (no computador está no ecrã das notas) */
export default function AvaliarTexto() {
  const desktop = useIsDesktop();
  const nav = useNavigate();
  const { draft, remote } = useStore();
  const org = useOrg(draft.orgId);
  const review = useReviewDraft();

  if (apiMode && draft.orgId && !org && !remote.ready) return null;
  // Ao publicar o rascunho é limpo antes de ir para "publicado": não voltar a /avaliar pelo meio
  if (!draft.orgId || !org) return review.busy ? null : <Navigate to="/avaliar" replace />;
  if (desktop) return <Navigate to="/avaliar/notas" replace />;

  const { text, redFlags, insult } = review;
  const textClass = insult ? styles.textBlocked : redFlags.flagged ? styles.textFlagged : styles.text;
  const publish = async () => {
    if (await review.publish()) nav('/avaliar/feito');
  };

  return (
    <Shell>
      <div className={`page ${styles.page}`}>
        <FlowHead icon="back" label={tr('Voltar às notas', 'Back to scores')} onClick={() => nav('/avaliar/notas')} right={<MiniSteps current={2} />} />
        <h1 className={styles.title}>{tr('Conta como é, em poucas linhas', 'Tell us what it’s like, in a few lines')}</h1>

        <fieldset className={styles.tags}>
          <legend className={styles.legend}>{tr('O que se destaca?', 'What stands out?')}</legend>
          <TagPicker visible={4} tags={review.tags} onToggle={review.toggleTag} />
        </fieldset>

        <div className={styles.field}>
          <label htmlFor="texto" className={`row between ${styles.label}`}>
            <span>{tr('A tua experiência', 'Your experience')}</span>
            <span className={`mono muted ${text.length > REVIEW_TEXT_MAX - 40 ? styles.countOver : styles.count}`}>
              {text.length}/{REVIEW_TEXT_MAX}
            </span>
          </label>
          <textarea
            id="texto"
            className={`textarea ${textClass}`}
            rows={5}
            maxLength={REVIEW_TEXT_MAX}
            value={text}
            aria-invalid={insult}
            aria-describedby="texto-ajuda"
            placeholder={tr('O que acontece no dia a dia? Sem nomes.', 'What happens day to day? No names.')}
            onChange={(e) => review.setText(e.target.value)}
          />
          <span id="texto-ajuda" className="sr-only">
            {tr('Descreve o que acontece, não quem é. Sem nomes nem insultos.', 'Describe what happens, not who. No names or insults.')}
          </span>
        </div>

        {redFlags.flagged && <SupportAlert redFlags={redFlags} />}
        <RewriteHelper text={text} onUse={review.useText} />

        {!redFlags.flagged && !insult && text.trim().length > 0 && (
          <div role="status" className={`row ${styles.ok}`}>
            <Icon name="check" size={18} stroke={2.2} />
            {tr('Tudo certo para publicar.', 'All set to publish.')}
          </div>
        )}

        {review.done === 0 && (
          <div className={`small ${styles.missing}`}>
            {tr('Falta pelo menos uma nota.', 'At least one score is missing.')} <Link to="/avaliar/notas">{tr('Voltar às notas', 'Back to scores')}</Link>
          </div>
        )}

        <div className={`sticky-cta stack ${styles.cta}`}>
          <LockLine center>{tr('Publicação anónima', 'Anonymous post')}</LockLine>
          <PublishErrorBox error={review.error} onUseSuggestion={review.useText} />
          <button type="button" className={`btn btn-primary btn-block ${styles.publish}`} disabled={!review.canPublish || review.busy} onClick={publish}>
            {insult ? tr('Corrige a frase para publicar', 'Fix the sentence to publish') : tr('Publicar avaliação', 'Publish review')}
          </button>
        </div>
      </div>
    </Shell>
  );
}
