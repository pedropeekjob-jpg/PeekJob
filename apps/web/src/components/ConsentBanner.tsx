import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { analytics, useAnalyticsConsent } from '../analytics';
import { Switch } from './UI';

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
      <div className="stack" style={{ gap: 6 }}>
        <strong id="pj-consent-t" style={{ fontSize: 16 }}>Ajudas-nos a melhorar a PeekJob?</strong>
        <span className="small body">
          Com a tua autorização usamos o Google Analytics para perceber que páginas e passos funcionam melhor.
          Nunca enviamos o que escreves, onde trabalhas, o teu email ou o NIF, e não há publicidade.{' '}
          <Link to="/metodologia#privacidade">Saber mais</Link>
        </span>
      </div>
      <div className="row" style={{ gap: 10 }}>
        <button type="button" className="btn btn-ghost" onClick={() => choose(false)}>
          Recusar
        </button>
        <button type="button" className="btn btn-primary" onClick={() => choose(true)}>
          Aceitar
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
      label="Estatísticas de utilização"
      hint="Google Analytics, sem textos, emails nem organizações avaliadas."
    />
  );
}
