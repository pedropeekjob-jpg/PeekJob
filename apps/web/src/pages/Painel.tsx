import type { ReactNode } from 'react';
import { Link, useLocation } from 'react-router';
import { Shell } from '../components/Layout';
import { PageLoading } from '../components/PageLoading';
import { ClaimView } from '../features/painel/ClaimView';
import { pulseStats } from '../features/painel/painel';
import type { PainelData } from '../features/painel/painelData';
import { HeadInfo, PendingSection, PublicLink, Pulse, ReportLinks, RespeitoCard, ScoreRing, WeekCriteria } from '../features/painel/PainelParts';
import { usePainel, type PainelState } from '../features/painel/usePainel';
import styles from '../features/painel/Painel.module.css';
import { tr } from '../i18n';
import { useToggle } from '../lib/useToggle';
import { useIsDesktop } from '../lib/useMedia';

/** Painel da organização: entrar, pedir para gerir a página ou o painel dela */
export default function Painel() {
  const desktop = useIsDesktop();
  const state = usePainel();
  if (state.status === 'ready') return <Dashboard data={state.data} orgs={state.orgs} onSelect={state.select} desktop={desktop} />;
  return <Gate state={state} desktop={desktop} />;
}

function Gate({ state, desktop }: { state: Exclude<PainelState, { status: 'ready' }>; desktop: boolean }) {
  const { pathname, search } = useLocation();
  let body: ReactNode;
  if (state.status === 'loading') body = <PageLoading />;
  else if (state.status === 'error') body = <div role="alert" className="card warn">{state.message}</div>;
  else if (state.status === 'claim') body = <ClaimView claims={state.mine.claims} suggested={state.suggested} onSent={state.reload} />;
  else {
    body = (
      <div className={styles.gate}>
        <h1 className={`h1 ${styles.gateTitle}`}>{tr('Painel da organização', 'Organisation dashboard')}</h1>
        <p className="lead">{tr('Entra para gerir a página da tua organização.', 'Sign in to manage your organisation’s page.')}</p>
        <Link to={`/entrar?${new URLSearchParams({ next: pathname + search })}`} className="btn btn-dark">
          {tr('Entrar', 'Sign in')}
        </Link>
      </div>
    );
  }
  return (
    <Shell nav={!desktop}>
      <div className={desktop ? 'container' : 'page'}>{body}</div>
    </Shell>
  );
}

/** Escolher a página, quando se gere mais do que uma */
function Switcher({ orgs, current, onSelect }: { orgs: { id: string; name: string }[]; current: string; onSelect: (id: string) => void }) {
  if (orgs.length < 2) return null;
  return (
    <div className={`field ${styles.switcher}`}>
      <label htmlFor="painel-org">{tr('Página', 'Page')}</label>
      <select id="painel-org" className="input" value={current} onChange={(e) => onSelect(e.target.value)}>
        {orgs.map((o) => (
          <option key={o.id} value={o.id}>
            {o.name}
          </option>
        ))}
      </select>
    </div>
  );
}

function Dashboard({ data, orgs, onSelect, desktop }: { data: PainelData; orgs: { id: string; name: string }[]; onSelect: (id: string) => void; desktop: boolean }) {
  const { org } = data;
  const [pulseOpen, togglePulse] = useToggle();

  const ring = <ScoreRing org={org} desktop={desktop} />;
  const head = <HeadInfo org={org} weekDelta={data.weekDelta} pulseOpen={pulseOpen} onTogglePulse={togglePulse} />;
  const pulse = pulseOpen && <Pulse stats={pulseStats(org, data.rank, data.newReviews, data.answered)} tags={data.tags} />;
  const publicLink = <PublicLink org={org} desktop={desktop} />;
  const pendingSection = <PendingSection reviews={data.pending} orgId={org.id} unanswered={data.unanswered} desktop={desktop} />;
  const criteria = <WeekCriteria org={org} delta={data.criteriaDelta} peers={data.peers} />;
  const switcher = <Switcher orgs={orgs} current={org.id} onSelect={onSelect} />;
  const reports = <ReportLinks orgId={org.id} pro={data.plan === 'pro'} />;

  if (desktop) {
    return (
      <Shell>
        <div className={`container ${styles.container}`}>
          {switcher}
          <section aria-label={tr('Resumo', 'Summary')} className={`row wrap ${styles.summaryDesktop}`}>
            {ring}
            {head}
            {publicLink}
          </section>
          {pulse}
          <div className={styles.columns}>
            {pendingSection}
            <div className={styles.side}>
              {criteria}
              {reports}
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
        {switcher}
        <section aria-label={tr('Resumo', 'Summary')} className={styles.summary}>
          <div className={`row ${styles.summaryRow}`}>
            {ring}
            {head}
          </div>
          {pulse}
          {publicLink}
        </section>
        {pendingSection}
        {criteria}
        {reports}
        <RespeitoCard org={org} />
      </div>
    </Shell>
  );
}
