import type { CSSProperties } from 'react';
import { Link } from 'react-router';
import { apiMode } from '../../api/http';
import { Logo } from '../../components/Brand';
import { Icon } from '../../components/Icon';
import { tr } from '../../i18n';
import { ringVars, type DecorRing } from './signIn';
import type { LinkState, SignIn } from './useSignIn';
import styles from './SignIn.module.css';

const TAGLINE = () => tr('Como é trabalhar lá dentro, contado por quem sabe.', 'What it’s like to work there, from people who know.');

/** Anéis decorativos a flutuar (posição em px no telemóvel, em % no computador) */
export function DecorRings({ rings, unit }: { rings: DecorRing[]; unit: 'px' | '%' }) {
  return (
    <>
      {rings.map((r, i) => (
        <div key={r.join()} className={`float ${styles.ring}`} style={ringVars(r, i, unit) as CSSProperties} />
      ))}
    </>
  );
}

export function HomeLogo({ height, className }: { height: number; className: string }) {
  return (
    <Link to="/" aria-label={tr('PeekJob, início', 'PeekJob, home')} className={className}>
      <Logo height={height} dark />
    </Link>
  );
}

/** A validar o link do email, ou link expirado */
export function LinkStatus({ state, onRetry }: { state: Exclude<LinkState, 'idle'>; onRetry: () => void }) {
  return (
    <div className={`page no-nav ${styles.status}`}>
      <Logo height={48} />
      {state === 'checking' ? (
        <p className="lead" role="status">
          {tr('A entrar…', 'Signing in…')}
        </p>
      ) : (
        <div className={styles.expired} role="alert">
          <h1 className={styles.expiredTitle}>{tr('Este link já não funciona.', 'This link no longer works.')}</h1>
          <p className="lead">{tr('Os links valem 15 minutos e só podem ser usados uma vez.', 'Links last 15 minutes and can only be used once.')}</p>
          <Link to="/entrar" className="btn btn-primary" onClick={onRetry}>
            {tr('Pedir um novo link', 'Ask for a new link')}
          </Link>
        </div>
      )}
    </div>
  );
}

/** Email e "receber link" */
export function SignInForm({ s, desktop }: { s: SignIn; desktop: boolean }) {
  return (
    <form className={`fade-up ${styles.form}`} onSubmit={s.send} noValidate>
      {desktop ? (
        <div className={styles.formHead}>
          <h1 className={styles.title}>{tr('Entrar', 'Sign in')}</h1>
          <p className={`lead ${styles.lead}`}>{tr('Sem palavra-passe. Enviamos-te um link de acesso.', 'No password. We’ll send you a sign-in link.')}</p>
        </div>
      ) : (
        <h1 className={styles.title}>{TAGLINE()}</h1>
      )}
      <div className={`field ${styles.field}`}>
        <label htmlFor="le">{tr('O teu email', 'Your email')}</label>
        <input
          className={`input ${styles.input}`}
          id="le"
          type="email"
          autoComplete="email"
          inputMode="email"
          value={s.email}
          placeholder={tr('nome@gmail.com', 'name@gmail.com')}
          aria-invalid={!!s.error}
          aria-describedby={s.error ? 'le-err' : undefined}
          onChange={(e) => s.setEmail(e.target.value)}
        />
        {s.error && (
          <span id="le-err" role="alert" className={styles.error}>
            {s.error}
          </span>
        )}
      </div>
      {desktop ? (
        <>
          <button type="submit" className={`btn btn-primary btn-block lift ${styles.submit}`} disabled={s.busy}>
            {tr('Receber link de acesso', 'Get sign-in link')}
          </button>
          <span className={`row small muted ${styles.lock}`}>
            <Icon name="lock" size={14} />
            {tr('O teu email nunca aparece nas avaliações.', 'Your email never appears in reviews.')}
          </span>
        </>
      ) : (
        <>
          <div className="small muted">{tr('Sem palavra-passe nem nome. Enviamos-te um link.', 'No password, no name. We’ll send you a link.')}</div>
          <button type="submit" className={`btn btn-primary btn-block ${styles.submit} ${styles.bottom}`} disabled={s.busy}>
            {tr('Receber link de acesso', 'Get sign-in link')}
          </button>
        </>
      )}
    </form>
  );
}

/** Na demonstração não há email: este botão faz de link aberto */
export function OpenDemoLink({ s, className = '' }: { s: SignIn; className?: string }) {
  if (apiMode) return null;
  return (
    <button type="button" className={`btn btn-dark btn-block ${styles.submit} ${className}`} onClick={s.openDemoLink}>
      {tr('Abri o link · continuar', 'I opened the link · continue')}
    </button>
  );
}

/** Link enviado: confirmar o email e, no modo API, dizer para o abrir */
export function SentBlock({ s, desktop }: { s: SignIn; desktop: boolean }) {
  return (
    <div className={`fade-up ${styles.sent}`}>
      {desktop && (
        <div aria-hidden="true" className={styles.mailIcon}>
          <Icon name="mail" size={24} stroke={2} />
        </div>
      )}
      <div className={styles.sentText}>
        <h1 className={styles.title}>{tr('Vê o teu email.', 'Check your email.')}</h1>
        <p className={`lead ${styles.lead}`} role="status">
          {desktop ? tr('Link enviado para ', 'Link sent to ') : tr('Enviámos um link para ', 'We sent a link to ')}
          <strong className={styles.email}>{s.shownEmail}</strong>. {desktop ? tr('Válido 15 minutos.', 'Valid for 15 minutes.') : tr('Vale 15 minutos.', 'Lasts 15 minutes.')}
        </p>
      </div>
      {desktop && <OpenDemoLink s={s} className="lift" />}
      {apiMode && <p className="small muted">{tr('Abre o link nesse email para entrar. Podes fechar esta página.', 'Open the link in that email to sign in. You can close this page.')}</p>}
      <button type="button" className={`link ${styles.other}`} onClick={s.changeEmail}>
        {tr('Usar outro email', 'Use another email')}
      </button>
    </div>
  );
}

export function ExploreWithoutAccount() {
  return (
    <Link to="/" className={`link ${styles.explore}`}>
      {tr('Explorar sem conta', 'Explore without an account')}
    </Link>
  );
}

export function Tagline() {
  return <p className={styles.tagline}>{TAGLINE()}</p>;
}
