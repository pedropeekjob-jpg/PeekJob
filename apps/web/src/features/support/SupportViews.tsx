import { Icon } from '../../components/Icon';
import { SUPPORT } from '../../data/content';
import { tr } from '../../i18n';
import type { SupportMessage } from '../../lib/store';
import { BackToProfile, Disclaimer, EntityCard, EntityRow, Found, ModerationNotices, PrivateBadge, Tips } from './SupportParts';
import styles from './Support.module.css';

export interface SupportViewProps {
  intro: string;
  found: string | null;
  notices: SupportMessage[];
  onBack: () => void;
}

const TITLE = () => tr('Não tens de passar por isto sozinho/a.', 'You don’t have to go through this alone.');

/** Computador: cabeçalho roxo, cartões das entidades, 112, avisos e conselhos */
export function SupportDesktop({ intro, found, notices, onBack }: SupportViewProps) {
  return (
    <>
      <section aria-labelledby="apoio-titulo" className={styles.hero}>
        <svg aria-hidden="true" viewBox="0 0 520 520" width="440" height="440" className={styles.heroArt}>
          <circle cx="260" cy="260" r="200" fill="none" stroke="#E6D6F2" strokeWidth="40" />
          <circle cx="260" cy="260" r="110" fill="none" stroke="#DCC8EA" strokeWidth="22" />
        </svg>
        <div className={`container stack ${styles.heroInner}`}>
          <div className={`row wrap ${styles.heroTop}`}>
            <button type="button" onClick={onBack} className={`row ${styles.back}`}>
              <Icon name="back" size={18} />
              {tr('Voltar', 'Back')}
            </button>
            <PrivateBadge />
          </div>
          <h1 id="apoio-titulo" className={styles.heroTitle}>
            {TITLE()}
          </h1>
          <p className={styles.heroIntro}>{intro}</p>
          <Found text={found} />
        </div>
      </section>

      <div className={`container ${styles.content}`}>
        <div className={styles.cards}>
          {SUPPORT.map((o) => (
            <EntityCard key={o.short} o={o} />
          ))}
        </div>

        <div className={`row wrap ${styles.bottom}`}>
          <a href="tel:112" className={`plain row lift ${styles.emergency}`}>
            <span className={styles.emergencyRing}>112</span>
            <span className={styles.emergencyCopy}>
              <span className={styles.emergencyTitle}>{tr('Estás em perigo agora?', 'Are you in danger right now?')}</span>
              <span className={styles.emergencyText}>{tr('Liga 112. É gratuito.', 'Call 112. It’s free.')}</span>
            </span>
          </a>
          <section className={styles.side}>
            <ModerationNotices notices={notices} />
            <Tips desktop />
          </section>
        </div>

        <div className={`row wrap between ${styles.footer}`}>
          <Disclaimer className={styles.disclaimer} />
          <BackToProfile />
        </div>
      </div>
    </>
  );
}

/** Telemóvel: cabeçalho roxo e lista de entidades */
export function SupportMobile({ intro, found, notices, onBack }: SupportViewProps) {
  return (
    <>
      <section aria-labelledby="apoio-titulo" className={styles.header}>
        <div className={styles.headerInner}>
          <div className="row between">
            <button type="button" aria-label={tr('Voltar', 'Back')} onClick={onBack} className={`icon-btn ${styles.iconBack}`}>
              <Icon name="back" size={18} />
            </button>
            <PrivateBadge />
          </div>
          <h1 id="apoio-titulo" className={styles.title}>
            {TITLE()}
          </h1>
          <p className={styles.intro}>{intro}</p>
          <Found text={found} />
        </div>
      </section>

      <div className={`page no-nav ${styles.body}`}>
        {SUPPORT.map((o) => (
          <EntityRow key={o.short} o={o} />
        ))}

        <div className={`row ${styles.emergencyRow}`}>
          <a href="tel:112" aria-label={tr('Ligar 112', 'Call 112')} className={`plain ${styles.call}`}>
            112
          </a>
          <span className={styles.emergencyText}>
            {tr(
              <>
                Em perigo agora? Liga <strong className={styles.ink}>112</strong>.
              </>,
              <>
                In danger right now? Call <strong className={styles.ink}>112</strong>.
              </>,
            )}
          </span>
        </div>

        <ModerationNotices notices={notices} />
        <section className={styles.tipsSection}>
          <Tips desktop={false} />
        </section>

        <Disclaimer className={styles.disclaimerMobile} />
      </div>
    </>
  );
}
