import { tr } from '../../i18n';
import styles from './PublishErrorBox.module.css';
import type { PublishError } from './useReviewDraft';

/** Erro ao publicar, com a versão sugerida pela API quando existe (422) */
export function PublishErrorBox({ error, onUseSuggestion }: { error: PublishError | null; onUseSuggestion: (text: string) => void }) {
  if (!error) return null;
  return (
    <div role="alert" className={`card warn ${styles.box}`}>
      <span>{error.message}</span>
      {error.suggestion && (
        <button type="button" className={`link ${styles.use}`} onClick={() => onUseSuggestion(error.suggestion!)}>
          {tr('Usar a versão sugerida', 'Use the suggested version')}
        </button>
      )}
    </div>
  );
}
