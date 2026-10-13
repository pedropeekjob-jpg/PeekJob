import { Link } from 'react-router-dom';
import { Shell } from '../components/Layout';
import { TopBar } from '../components/UI';
import { FormulaCard, FormulaDesktop, Ideas, Privacy, RespeitoSupport, Rules, ScoreDemo } from '../features/methodology/MethodologyParts';
import styles from '../features/methodology/Methodology.module.css';
import { tr } from '../i18n';
import { useHashScroll } from '../lib/useHashScroll';
import { useIsDesktop } from '../lib/useMedia';

/** Como calculamos: fórmula pública, demonstração, regras, respeito e privacidade */
export default function Metodologia() {
  const desktop = useIsDesktop();
  // #privacidade (ligação do rodapé)
  useHashScroll();

  if (desktop) {
    return (
      <Shell>
        <div className={`container ${styles.container}`}>
          <div className={`row wrap ${styles.top}`}>
            <div className={styles.intro}>
              <h1 className={`h1 ${styles.title}`}>{tr('A nota não está à venda.', 'The score is not for sale.')}</h1>
              <p className={`lead ${styles.lead}`}>{tr('A fórmula é pública e igual para todas.', 'The formula is public and the same for everyone.')}</p>
              <FormulaDesktop />
            </div>
            <div className={styles.demoCol}>
              <ScoreDemo desktop />
            </div>
          </div>

          <div className={`row wrap ${styles.bottom}`}>
            <div className={styles.mainCol}>
              <Rules />
              <Privacy />
            </div>
            <div className={styles.sideCol}>
              <RespeitoSupport desktop />
            </div>
          </div>
        </div>
      </Shell>
    );
  }

  return (
    <Shell>
      <div className="page no-nav">
        <TopBar back="/ranking" />
        <div className={styles.mobileHead}>
          <h1 className={`h1 ${styles.mobileTitle}`}>{tr('A nota não está à venda.', 'The score is not for sale.')}</h1>
          <p className={`body ${styles.mobileLead}`}>{tr('Fórmula pública. Ninguém paga para subir ou esconder avaliações.', 'Public formula. Nobody pays to rank higher or hide reviews.')}</p>
        </div>
        <Ideas />
        <FormulaCard />
        <ScoreDemo />
        <Rules />
        <RespeitoSupport />
        <Privacy />
        <Link to="/ranking" className={`btn btn-dark btn-block ${styles.back}`}>
          {tr('Voltar ao ranking', 'Back to the ranking')}
        </Link>
      </div>
    </Shell>
  );
}
