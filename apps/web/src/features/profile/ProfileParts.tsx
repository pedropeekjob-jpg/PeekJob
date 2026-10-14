import type { CSSProperties, ReactNode } from 'react';
import { Link } from 'react-router';
import { Icon } from '../../components/Icon';
import { CRITERION, type CriterionKey } from '../../data/criteria';
import { tr } from '../../i18n';
import { unreadLabel } from './profile';
import type { Profile } from './useProfile';
import styles from './Profile.module.css';

/** Número de mensagens por ler (24 px no telemóvel, 28 px no computador) */
export function UnreadBadge({ n, size }: { n: number; size: number }) {
  return (
    <span aria-label={unreadLabel(n)} className={styles.badge} style={{ '--size': `${size}px` } as CSSProperties}>
      {n}
    </span>
  );
}

export function ResetDemo({ p }: { p: Profile }) {
  return (
    <div className={styles.reset}>
      <button type="button" className={`link ${styles.resetButton}`} onClick={p.reset}>
        <Icon name="sparkle" size={16} />
        {tr('Repor dados de demonstração', 'Reset demo data')}
      </button>
      {p.resetDone && (
        <span role="status" className={`small ${styles.resetDone}`}>
          {tr('Dados repostos: sessão, rascunho de exemplo e guardadas.', 'Data reset: session, sample draft and saved.')}
        </span>
      )}
    </div>
  );
}

/** Sem sessão: convite para entrar */
export function SignInInvite({ p }: { p: Profile }) {
  return (
    <div className={styles.invite}>
      <div className={styles.inviteHead}>
        <h1 className={styles.inviteTitle}>{tr('A tua conta', 'Your account')}</h1>
        <p className="lead">{tr('Entra para guardar organizações, ver as tuas avaliações e receber mensagens privadas de apoio.', 'Sign in to save organisations, see your reviews and get private support messages.')}</p>
      </div>
      <div className={`card dark ${styles.inviteCard}`}>
        <span aria-hidden="true" className={styles.inviteDeco} />
        <span className={styles.inviteCardTitle}>{tr('Sem palavra-passe nem nome', 'No password, no name')}</span>
        <span className={styles.inviteCardText}>{tr('Só o teu email, que nunca aparece nas avaliações.', 'Just your email, which never appears in reviews.')}</span>
      </div>
      <Link to="/entrar" className={`btn btn-primary ${styles.inviteButton}`}>
        {tr('Entrar com email', 'Sign in with email')}
      </Link>
      <Link to="/" className={`link ${styles.start}`}>
        {tr('Continuar a explorar sem conta', 'Keep exploring without an account')}
      </Link>
      <ResetDemo p={p} />
    </div>
  );
}

/** Linha de lista com seta (telemóvel) */
export function MRow({ to, label, children, last = false }: { to: string; label: string; children?: ReactNode; last?: boolean }) {
  return (
    <Link to={to} className={`plain row ${styles.mrow}`} data-last={last || undefined}>
      <span className={`grow ${styles.mrowLabel}`}>{label}</span>
      {children}
      <Icon name="next" size={16} className={styles.arrow} />
    </Link>
  );
}

/** Prioridades numeradas com a cor do critério */
export function PrefChips({ prefs }: { prefs: CriterionKey[] }) {
  return (
    <div className="chips">
      {prefs.map((k, i) => (
        <span key={k} className={`row ${styles.pref}`}>
          <span className={styles.prefNum} style={{ '--c': CRITERION[k].color } as CSSProperties}>
            {i + 1}
          </span>
          {CRITERION[k].label}
        </span>
      ))}
    </div>
  );
}
