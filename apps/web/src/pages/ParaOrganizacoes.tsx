import { Link } from 'react-router';
import { Shell } from '../components/Layout';
import { ORG_BY_ID } from '../data/orgs';
import { Faq, HeroRing, HowItWorks, Plans } from '../features/organizations/ForOrgsParts';
import styles from '../features/organizations/ForOrgs.module.css';
import { tr } from '../i18n';
import { useIsDesktop } from '../lib/useMedia';

/** Exemplo do anel: a página demonstrativa (Padaria Ribeira) */
const EXAMPLE = ORG_BY_ID['padaria-ribeira'];

/** Para organizações: o que ganham ao reivindicar a página, como funciona e planos */
export default function ParaOrganizacoes() {
  const desktop = useIsDesktop();
  return (
    <Shell nav>
      <div className={desktop ? `container ${styles.desktop}` : `page ${styles.page}`}>
        <section aria-labelledby="po-h" className={`row wrap ${styles.hero}`}>
          <div className={styles.heroText}>
            <span className="label">{tr('Para organizações', 'For organisations')}</span>
            <h1 id="po-h" className={`h1 ${styles.title}`}>
              {tr('A tua equipa já fala de ti. Responde.', 'Your team is already talking about you. Reply.')}
            </h1>
            <p className={`lead ${styles.lead}`}>{tr('Para PME, associações, voluntariado e nome individual.', 'For SMEs, associations, volunteering and sole traders.')}</p>
            <div className={`row wrap ${styles.ctas}`}>
              <Link to="/painel" className={`btn btn-primary lift ${styles.cta} ${styles.ctaMain}`}>
                {tr('Reivindicar a minha página', 'Claim my page')}
              </Link>
              <Link to="/metodologia" className={`btn btn-ghost lift ${styles.cta}`}>
                {tr('Como calculamos', 'How we score')}
              </Link>
            </div>
          </div>
          <div className={`row ${styles.heroArt}`}>
            <HeroRing org={EXAMPLE} />
          </div>
        </section>

        <div className={`row wrap ${styles.middle}`}>
          <HowItWorks />
          <Faq />
        </div>

        <Plans />
      </div>
    </Shell>
  );
}
