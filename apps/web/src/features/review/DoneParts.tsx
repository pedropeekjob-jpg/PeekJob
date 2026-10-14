import { Link } from 'react-router';
import { Ring } from '../../components/Data';
import { Icon } from '../../components/Icon';
import { tr } from '../../i18n';
import { fmt } from '../../lib/format';
import { privateMessagesText } from './done';
import styles from './Done.module.css';

/** Nota média com uma animação de entrada */
export function DoneRing({ avg, desktop }: { avg: number; desktop: boolean }) {
  return (
    <span className={styles.doneRing}>
      <Ring
        value={avg}
        size={desktop ? 160 : 132}
        thickness={desktop ? 15 : 12}
        inner="var(--ground)"
        fontSize={desktop ? 48 : 38}
        ariaLabel={tr(`A tua nota média: ${fmt(avg)} de 5`, `Your average score: ${fmt(avg)} out of 5`)}
      />
    </span>
  );
}

/** Relato grave: com sessão, a mensagem privada de apoio; sem sessão, convite para entrar e ajuda já */
export function SupportCard({ signedIn, unread }: { signedIn: boolean; unread: number }) {
  if (signedIn) {
    return (
      <Link to="/apoio" className={`plain row lift ${styles.messages}`}>
        <span className={styles.messagesIcon}>
          <Icon name="mail" size={16} stroke={2} />
        </span>
        <span className={`grow ${styles.messagesText}`}>
          <span className={styles.messagesTitle}>
            {tr('Tens', 'You have')} {privateMessagesText(unread)}
          </span>
          <span className={styles.messagesHint}>{tr('Onde pedir ajuda', 'Where to get help')}</span>
        </span>
        <Icon name="next" size={18} />
      </Link>
    );
  }
  return (
    <section className={styles.signIn} aria-label={tr('Apoio', 'Support')}>
      <span className={styles.signInTitle}>{tr('O que descreveste pode ser ilegal', 'What you described may be illegal')}</span>
      <span className={`small body ${styles.signInText}`}>
        {tr('Entra com o teu email para receberes os contactos de apoio numa mensagem privada. Ninguém mais a vê.', 'Sign in with your email to get support contacts in a private message. No one else sees it.')}
      </span>
      <div className={`row wrap ${styles.signInActions}`}>
        <Link to="/entrar" className={`btn btn-purple btn-sm ${styles.signInButton}`}>
          {tr('Entrar', 'Sign in')}
        </Link>
        <Link to="/apoio" className={`link ${styles.helpLink}`}>
          {tr('Ver onde pedir ajuda agora', 'See where to get help now')} <Icon name="next" size={16} />
        </Link>
      </div>
    </section>
  );
}

/** Ver/esconder as 8 notas (ligação no computador, linha inteira no telemóvel) */
export function NotesToggle({ open, onToggle, desktop }: { open: boolean; onToggle: () => void; desktop: boolean }) {
  return (
    <button type="button" aria-expanded={open} onClick={onToggle} className={desktop ? `link ${styles.notesLink}` : `row between ${styles.notesRow}`}>
      {open ? tr('Esconder as tuas notas', 'Hide your scores') : tr('Ver as tuas 8 notas', 'Show your 8 scores')}
      <Icon name="down" size={18} className={styles.chevron} />
    </button>
  );
}

/**
 * Verificar depois de publicar: a avaliação já está publicada; confirmar que trabalha lá dá-lhe o selo.
 * Já verificada: só a confirmação.
 */
/** `state`: o estado do fluxo de avaliar, para que "Agora não" recue até aqui em vez de repetir este ecrã */
export function VerifyInvite({ orgId, verified, state }: { orgId: string; verified: boolean; state?: unknown }) {
  if (verified) {
    return (
      <p className={`row small ${styles.verified}`}>
        <Icon name="check" size={16} stroke={2.4} /> {tr('Avaliação verificada.', 'Verified review.')}
      </p>
    );
  }
  return (
    <section aria-labelledby="verificar-depois" className={styles.verify}>
      <h2 id="verificar-depois" className={styles.verifyTitle}>
        {tr('Confirma que trabalhas lá', 'Confirm you work there')}
      </h2>
      <p className={`small body ${styles.verifyText}`}>
        {tr('A tua avaliação ganha o selo Verificado. Leva um minuto e nada fica ligado a ti.', 'Your review gets the Verified badge. It takes a minute and nothing is linked to you.')}
      </p>
      <Link to={`/avaliar/verificar?org=${encodeURIComponent(orgId)}`} state={state} className={`btn btn-ghost btn-sm ${styles.verifyButton}`} data-ev="cta_click" data-ev-cta="verificar_depois" data-ev-area="publicado">
        {tr('Confirmar agora', 'Confirm now')}
      </Link>
    </section>
  );
}
