import { Icon } from '../../components/Icon';
import { RewriteHelper } from '../../components/RewriteHelper';
import { MoreToggle } from '../../components/UI';
import { tr } from '../../i18n';
import { useToggle } from '../../lib/useToggle';
import { TagPicker } from './FlowParts';
import { SupportAlert } from './SupportAlert';
import { REVIEW_TEXT_MAX, type ReviewDraft } from './useReviewDraft';
import styles from './ReviewText.module.css';

/**
 * Telemóvel: o comentário é opcional e fica no ecrã das notas (publica-se dali, sem passo extra).
 * Fechado por omissão; abre sozinho se já houver texto ou etiquetas.
 */
export function ReviewTextMobile({ review }: { review: ReviewDraft }) {
  const { text, redFlags, insult, done } = review;
  const [open, toggle] = useToggle(text.trim() !== '' || review.tags.length > 0);
  const textClass = insult ? styles.textBlocked : redFlags.flagged ? styles.textFlagged : styles.text;
  return (
    <section aria-label={tr('Comentário', 'Comment')} className={styles.section}>
      <MoreToggle
        open={open}
        onToggle={toggle}
        controls="review-text"
        label={tr('Contar como é (opcional)', 'Tell us what it’s like (optional)')}
        openLabel={tr('Esconder o comentário', 'Hide the comment')}
      />
      {open && (
        <div id="review-text" className={`fade-up ${styles.section}`}>
          <div className={styles.tags}>
            {/* o grupo das etiquetas já tem este nome: aqui é só a legenda visível */}
            <span aria-hidden="true" className={styles.legend}>
              {tr('O que se destaca?', 'What stands out?')}
            </span>
            <TagPicker visible={4} tags={review.tags} onToggle={review.toggleTag} />
          </div>
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
        </div>
      )}
      {redFlags.flagged && <SupportAlert redFlags={redFlags} />}
      <RewriteHelper text={text} onUse={review.useText} />
      {!redFlags.flagged && !insult && done > 0 && text.trim().length > 0 && (
        <div role="status" className={`row ${styles.ok}`}>
          <Icon name="check" size={18} stroke={2.2} />
          {tr('Tudo certo para publicar.', 'All set to publish.')}
        </div>
      )}
    </section>
  );
}
