import { EXTRA_KEYS, extraKind, type ExtraKey } from '../../data/params';
import { tr } from '../../i18n';
import { AddParams, ScoreRow, YesNoRow } from './FlowParts';
import type { ReviewDraft } from './useReviewDraft';
import styles from './Flow.module.css';

/**
 * Parâmetros do tipo de trabalho (21/10): três sugeridos pelo setor da organização, e outros da lista que a pessoa
 * acrescenta. Uns são nota de 1 a 5, outros sim/não; todos opcionais e com comentário.
 */
export function ExtrasSection({ review, sector, desktop = false }: { review: ReviewDraft; sector?: string | null; desktop?: boolean }) {
  const { shownExtras, suggested, extras, comments, badComments } = review;
  const available = EXTRA_KEYS.filter((k) => !shownExtras.includes(k));
  const known = sector && sector !== '—';
  const row = (k: ExtraKey) => {
    const common = {
      k,
      desktop,
      comment: comments[k],
      onComment: review.setComment,
      invalid: badComments.includes(k),
      onRemove: suggested.includes(k) ? undefined : review.removeExtra,
    };
    const v = extras[k];
    return extraKind(k) === 'yesno' ? (
      <YesNoRow key={k} {...common} value={typeof v === 'boolean' ? v : undefined} onPick={review.setExtra} />
    ) : (
      <ScoreRow key={k} {...common} value={typeof v === 'number' ? v : 0} onPick={review.setExtra} />
    );
  };
  return (
    <section aria-labelledby="extras-t" className={desktop ? styles.extrasWide : styles.extras}>
      <h2 id="extras-t" className={styles.extrasTitle}>
        {tr('No teu tipo de trabalho', 'In your line of work')}
      </h2>
      <p className="small muted">
        {known
          ? tr(`Sugestões para ${sector}. Responde só ao que faz sentido.`, `Suggestions for ${sector}. Only answer what makes sense.`)
          : tr('Responde só ao que faz sentido.', 'Only answer what makes sense.')}
      </p>
      <div className={desktop ? undefined : 'stack'}>{shownExtras.map(row)}</div>
      <AddParams available={available} onAdd={review.addExtra} />
    </section>
  );
}
