import { Link } from 'react-router';
import { Icon } from '../components/Icon';
import { MobileHomeHeader, Shell } from '../components/Layout';
import { CONTACT_EMAIL, SOCIAL } from '../config';
import { SUPPORT } from '../data/content';
import { tr } from '../i18n';
import { useIsDesktop } from '../lib/useMedia';
import '../styles/info.css';

/** Contacto: email da equipa, organizações, redes sociais e, à parte, ajuda urgente */
export default function Contacto() {
  const desktop = useIsDesktop();
  return (
    <Shell nav footer>
      {!desktop && <MobileHomeHeader />}
      <div className={desktop ? 'container info-page' : 'info-page page-x'}>
        <section className="info-hero zone zone-band">
          <span className="info-eyebrow">{tr('Contacto', 'Contact')}</span>
          <h1 className="info-title">{tr('Fala connosco.', 'Talk to us.')}</h1>
          <p className="info-lead">
            {tr('Dúvidas, sugestões, imprensa ou parcerias: respondemos por email.', 'Questions, ideas, press or partnerships: we reply by email.')}
          </p>
        </section>

        <div className="info-grid">
          <a className="info-card info-card-link" href={`mailto:${CONTACT_EMAIL}`} data-ev="cta_click" data-ev-cta="email" data-ev-area="contacto">
            <span className="info-icon"><Icon name="mail" size={22} /></span>
            <h3>{tr('Escreve-nos', 'Email us')}</h3>
            <p className="mono-ish">{CONTACT_EMAIL}</p>
          </a>
          <Link className="info-card info-card-link" to="/para-organizacoes" data-ev="cta_click" data-ev-cta="para-organizacoes" data-ev-area="contacto">
            <span className="info-icon"><Icon name="shield" size={22} /></span>
            <h3>{tr('És uma organização?', 'Are you an organisation?')}</h3>
            <p>{tr('Reivindica a tua página e responde às avaliações.', 'Claim your page and reply to reviews.')}</p>
          </Link>
          <div className="info-card">
            <span className="info-icon"><Icon name="heart" size={22} /></span>
            <h3>{tr('Segue a PeekJob', 'Follow PeekJob')}</h3>
            <p className="row info-links">
              <a className="link" href={SOCIAL.facebook} target="_blank" rel="noopener noreferrer"><Icon name="facebook" size={18} /> Facebook</a>
              <a className="link" href={SOCIAL.instagram} target="_blank" rel="noopener noreferrer"><Icon name="instagram" size={18} /> Instagram</a>
            </p>
          </div>
        </div>

        <section aria-labelledby="t-help" className="info-help">
          <h2 id="t-help" className="info-h2">{tr('Precisas de ajuda com uma situação no trabalho?', 'Need help with a situation at work?')}</h2>
          <p className="info-lead is-compact">
            {tr(
              'A PeekJob não faz denúncias nem acompanha casos. Estas entidades podem ajudar, de forma confidencial. Em perigo, liga 112.',
              'PeekJob doesn’t file complaints or follow up on cases. These organisations can help, confidentially. If you are in danger, call 112.',
            )}
          </p>
          <ul className="info-support">
            {SUPPORT.map((o) => (
              <li key={o.short}>
                <strong>{o.short}</strong>
                <span>{o.full}</span>
                <span className="row wrap info-actions">
                  {o.phone && <a className="link" href={o.tel}>{o.phone}</a>}
                  <a className="link" href={o.url} target="_blank" rel="noopener noreferrer">{o.site}</a>
                </span>
              </li>
            ))}
          </ul>
        </section>
      </div>
    </Shell>
  );
}
