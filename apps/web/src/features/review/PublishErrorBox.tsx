import { memo } from 'react';
import { Link } from 'react-router';
import { tr } from '../../i18n';
import styles from './PublishErrorBox.module.css';
import type { PublishError } from './useReviewDraft';

/** Entrar a meio de avaliar: depois de entrar volta-se às notas (o rascunho fica guardado) */
export const SIGN_IN_TO_PUBLISH = `/entrar?${new URLSearchParams({ next: '/avaliar/notas' })}`;

/** Erro ao publicar, com a versão sugerida pela API quando existe (422) e "Entrar" quando a sessão expirou (401) */
export const PublishErrorBox = memo(function PublishErrorBox({ error, onUseSuggestion }: { error: PublishError | null; onUseSuggestion: (text: string) => void }) {
  if (!error) return null;
  return (
    <div role="alert" className={`card warn ${styles.box}`}>
      <span>{error.message}</span>
      {error.suggestion && (
        <button type="button" className={`link ${styles.use}`} onClick={() => onUseSuggestion(error.suggestion!)}>
          {tr('Usar a versão sugerida', 'Use the suggested version')}
        </button>
      )}
      {error.signIn && (
        // backToFlow: entrar neste separador recua para estas notas em vez de abrir outra entrada
        <Link to={SIGN_IN_TO_PUBLISH} state={{ backToFlow: true }} className={`link ${styles.use}`}>
          {tr('Entrar', 'Sign in')}
        </Link>
      )}
    </div>
  );
});
