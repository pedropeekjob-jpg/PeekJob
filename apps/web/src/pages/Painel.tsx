import { Shell } from '../components/Layout';
import { pulseStats } from '../features/painel/painel';
import { HeadInfo, PendingSection, PublicLink, Pulse, RespeitoCard, ScoreRing, WeekCriteria } from '../features/painel/PainelParts';
import { usePainel } from '../features/painel/usePainel';
import styles from '../features/painel/Painel.module.css';
import { tr } from '../i18n';
import { useToggle } from '../lib/useToggle';
import { useIsDesktop } from '../lib/useMedia';

/** Painel da organização (contentor: dados, estado do pulso e layout) */
export default function Painel() {
  const desktop = useIsDesktop();
  const { org, pending, answered, unanswered, rank } = usePainel();
  const [pulseOpen, togglePulse] = useToggle();

  const ring = <ScoreRing org={org} desktop={desktop} />;
  const head = <HeadInfo org={org} pulseOpen={pulseOpen} onTogglePulse={togglePulse} />;
  const pulse = pulseOpen && <Pulse stats={pulseStats(org, rank, pending.length, answered)} />;
  const publicLink = <PublicLink org={org} desktop={desktop} />;
  const pendingSection = <PendingSection reviews={pending} unanswered={unanswered} desktop={desktop} />;

  if (desktop) {
    return (
      <Shell>
        <div className={`container ${styles.container}`}>
          <section aria-label={tr('Resumo', 'Summary')} className={`row wrap ${styles.summaryDesktop}`}>
            {ring}
            {head}
            {publicLink}
          </section>
          {pulse}
          <div className={styles.columns}>
            {pendingSection}
            <div className={styles.side}>
              <WeekCriteria org={org} />
              <RespeitoCard org={org} />
            </div>
          </div>
        </div>
      </Shell>
    );
  }

  return (
    <Shell nav>
      <div className={`page ${styles.page}`}>
        <section aria-label={tr('Resumo', 'Summary')} className={styles.summary}>
          <div className={`row ${styles.summaryRow}`}>
            {ring}
            {head}
          </div>
          {pulse}
          {publicLink}
        </section>
        {pendingSection}
        <WeekCriteria org={org} />
        <RespeitoCard org={org} />
      </div>
    </Shell>
  );
}
