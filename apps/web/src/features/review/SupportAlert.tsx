import { Link } from 'react-router-dom';
import { tr } from '../../i18n';
import { flagLabel } from '../../i18n/labels';
import type { RedFlagResult } from '../../lib/moderation';
import styles from './SupportAlert.module.css';

const and = () => tr(' e ', ' and ');

/** Frase com o que foi encontrado ("Salário em atraso: pode ser incumprimento salarial.") */
export function flagSentence(rf: Pick<RedFlagResult, 'found' | 'kinds'>): string {
  const found = rf.found.map(flagLabel).join(and());
  if (!found) return '';
  return `${found.charAt(0).toUpperCase()}${found.slice(1)}: ${tr('pode ser', 'this may be')} ${rf.kinds.map(flagLabel).join(and())}.`;
}

/**
 * Aviso de possível ilegalidade com ligação ao apoio. Não bloqueia a publicação.
 * `compact`: linha (telemóvel); `card`: cartão com a frase do que foi encontrado (computador).
 */
export function SupportAlert({ redFlags, variant = 'compact' }: { redFlags: Pick<RedFlagResult, 'found' | 'kinds'>; variant?: 'compact' | 'card' }) {
  const text =
    variant === 'card'
      ? `${flagSentence(redFlags)} ${tr('A organização não é avisada.', 'The organisation is not told.')}`
      : tr(`Pode configurar ${redFlags.kinds.map(flagLabel).join(' e ')}. A organização não é avisada.`, `This may amount to ${redFlags.kinds.map(flagLabel).join(' and ')}. The organisation is not told.`);
  return (
    <section role="status" aria-label={tr('Apoio', 'Support')} className={`${styles[variant]} fade-up`}>
      <div className={styles.body}>
        <span className={styles.title}>{tr('Isto pode ser uma ilegalidade', 'This may be against the law')}</span>
        <span className={styles.text}>{text}</span>
      </div>
      <Link to="/apoio" className={`btn lift ${styles.help}`}>
        {tr('Pedir ajuda', 'Get help')}
      </Link>
    </section>
  );
}
