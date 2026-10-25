import { useState } from 'react';
import { Navigate } from 'react-router';
import { apiMode } from '../api/http';
import { orgRoles, useOrg } from '../api/orgs';
import { Icon } from '../components/Icon';
import { Shell } from '../components/Layout';
import { DeskSteps, FlowHead, LockLine, MiniSteps } from '../features/review/FlowParts';
import { jobError } from '../features/review/job';
import { JobForm } from '../features/review/JobParts';
import { useFlowNav } from '../features/review/useFlowNav';
import styles from '../features/review/OrgPicker.module.css';
import { tr } from '../i18n';
import { useStore, type JobDraft } from '../lib/store';
import { useIsDesktop } from '../lib/useMedia';

/**
 * Avaliar · passo 1 (fim): o teu trabalho lá. Pedido do cliente (25/10): depois de escolher a organização,
 * o cargo e o período em que lá trabalhou (ou se ainda trabalha), antes de avaliar.
 */
export default function AvaliarCargo() {
  const desktop = useIsDesktop();
  const { draft, updateDraft, remote } = useStore();
  const org = useOrg(draft.orgId);
  const { go, back, leave } = useFlowNav();
  const [error, setError] = useState<string | null>(null);

  if (apiMode && draft.orgId && !org && !remote.ready) return null;
  if (!draft.orgId || !org) return <Navigate to="/avaliar" replace />;

  const job = draft.job;
  const change = (patch: Partial<JobDraft>) => {
    updateDraft((d) => ({ job: { ...d.job, ...patch } }));
    setError(null);
  };
  const next = () => {
    const e = jobError(job);
    setError(e);
    if (!e) go('/avaliar/notas');
  };
  const location = org.locations.find((l) => l.id === draft.locationId)?.label;
  const where = location && org.locations.length > 1 ? `${org.name} · ${location.split(' · ').pop()}` : org.name;
  const title = tr('O teu trabalho lá', 'Your job there');
  const form = <JobForm job={job} known={orgRoles(org)} error={error} onChange={change} onSubmit={next} />;

  if (desktop) {
    return (
      <Shell chrome="header">
        <div className={`container ${styles.desktop}`}>
          <DeskSteps
            current={1}
            right={
              <button type="button" className={`row ${styles.cancel}`} onClick={() => leave('/')}>
                <Icon name="close" size={18} />
                {tr('Cancelar', 'Cancel')}
              </button>
            }
          />
          <div className={styles.jobDesktop}>
            <div className={styles.intro}>
              <h1 className={styles.desktopTitle}>{title}</h1>
              <p className={`lead ${styles.lead}`}>{where}</p>
            </div>
            {form}
            <div className={`row wrap between ${styles.footer}`}>
              <button type="button" className={`link ${styles.back}`} onClick={() => back('/avaliar')}>
                {tr('Escolher outra organização', 'Choose another organisation')}
              </button>
              <button type="button" className={`btn btn-primary lift ${styles.next}`} onClick={next}>
                {tr('Continuar para a avaliação', 'Continue to the review')} <Icon name="next" size={18} stroke={2} />
              </button>
            </div>
            <LockLine>{tr('A avaliação fica ligada ao local, não a ti.', 'The review is linked to the location, not to you.')}</LockLine>
          </div>
        </div>
      </Shell>
    );
  }

  return (
    <Shell>
      <div className={`page ${styles.mobilePage}`}>
        <FlowHead icon="back" label={tr('Voltar', 'Back')} onClick={() => back('/avaliar')} right={<MiniSteps current={1} />} />
        <div className={`fade-up ${styles.mobilePick}`}>
          <div className="stack">
            <h1 className={styles.title}>{title}</h1>
            <span className="small muted">{where}</span>
          </div>
          {form}
        </div>
        <div className="sticky-cta">
          <button type="button" className={`btn btn-primary btn-block ${styles.cta}`} onClick={next}>
            {tr('Continuar', 'Continue')}
          </button>
        </div>
      </div>
    </Shell>
  );
}
