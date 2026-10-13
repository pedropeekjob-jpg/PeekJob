import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { analytics, useAnalyticsConsent } from '../analytics';
import { Switch } from './UI';
import { tr } from '../i18n';
import styles from './ConsentBanner.module.css';

const OPEN_EVENT = 'pj:consent-open';
/** Volta a mostrar a escolha (rodapé, Como calculamos) */
export const openConsent = () => window.dispatchEvent(new Event(OPEN_EVENT));

/**
 * Pedido de consentimento para estatísticas (Google Analytics).
 * Só aparece quando o Analytics está configurado. Recusar é tão fácil como aceitar.
 */
export function ConsentBanner() {
  const { configured, value } = useAnalyticsConsent();
  const [forced, setForced] = useState(false);
  useEffect(() => {
    const open = () => setForced(true);
    window.addEventListener(OPEN_EVENT, open);
    return () => window.removeEventListener(OPEN_EVENT, open);
  }, []);
  if (!configured || (value !== null && !forced)) return null;
  const choose = (ok: boolean) => {
    if (ok) analytics.grant();
    else if (value === 'granted') analytics.revoke();
    else analytics.deny();
    setForced(false);
  };
  return (
    <div role="dialog" aria-modal="false" aria-labelledby="pj-consent-t" className="consent">
      <div className={`stack ${styles.text}`}>
        <strong id="pj-consent-t" className={styles.title}>{tr('Ajudas-nos a melhorar a PeekJob?', 'Will you help us improve PeekJob?')}</strong>
        <span className="small body">
          {tr(
            'Com a tua autorização usamos o Google Analytics para perceber que páginas e passos funcionam melhor. Nunca enviamos o que escreves, onde trabalhas, o teu email ou o NIF, e não há publicidade.',
            'With your permission we use Google Analytics to see which pages and steps work best. We never send what you write, where you work, your email or your NIF (Portuguese tax number), and there are no ads.',
          )}{' '}
          <Link to="/metodologia#privacidade">{tr('Saber mais', 'Learn more')}</Link>
        </span>
      </div>
      <div className={`row ${styles.actions}`}>
        <button type="button" className="btn btn-ghost" onClick={() => choose(false)}>
          {tr('Recusar', 'Decline')}
        </button>
        <button type="button" className="btn btn-primary" onClick={() => choose(true)}>
          {tr('Aceitar', 'Accept')}
        </button>
      </div>
    </div>
  );
}

/** Interruptor para o Perfil */
export function AnalyticsSwitch() {
  const { configured, value } = useAnalyticsConsent();
  if (!configured) return null;
  return (
    <Switch
      checked={value === 'granted'}
      onChange={(v) => (v ? analytics.grant() : analytics.revoke())}
      label={tr('Estatísticas de utilização', 'Usage statistics')}
      hint={tr('Google Analytics, sem textos, emails nem organizações avaliadas.', 'Google Analytics, without your texts, emails or the organisations you review.')}
    />
  );
}
