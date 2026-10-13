import { Link, Navigate, useNavigate } from 'react-router-dom';
import { apiMode } from '../api/http';
import { useOrg } from '../api/orgs';
import { Icon } from '../components/Icon';
import { Shell } from '../components/Layout';
import { useVerification } from '../features/verify/useVerification';
import { AlreadyVerified, AnonymityCard, CodeInput, DocumentPicker, EmailStep, MethodTabs } from '../features/verify/VerifyParts';
import styles from '../features/verify/Verify.module.css';
import { tr } from '../i18n';
import { useStore } from '../lib/store';
import { useIsDesktop } from '../lib/useMedia';
import { DeskSteps, FlowHead } from '../features/review/FlowParts';

/** Avaliar · passo 2 (opcional): confirmar que trabalha lá, por email do trabalho ou documento */
export default function AvaliarVerificar() {
  const { draft, remote } = useStore();
  const org = useOrg(draft.orgId);
  if (apiMode && draft.orgId && !org && !remote.ready) return null;
  if (!draft.orgId || !org) return <Navigate to="/avaliar" replace />;
  return <Verify orgId={org.id} orgName={org.name} locationLabel={org.locations.find((l) => l.id === draft.locationId)?.label} />;
}

function Verify({ orgId, orgName, locationLabel }: { orgId: string; orgName: string; locationLabel?: string }) {
  const desktop = useIsDesktop();
  const nav = useNavigate();
  const v = useVerification(orgId);
  const toScores = () => nav('/avaliar/notas');

  const sendingEmail = v.isEmail && !v.codeStep;
  const primaryDisabled = !sendingEmail && !v.canFinish && !v.alreadyVerified;
  const ctaLabel = v.codeStep
    ? desktop
      ? tr('Confirmar e continuar', 'Confirm and continue')
      : tr('Confirmar e começar', 'Confirm and start')
    : v.isEmail
      ? tr('Enviar código', 'Send code')
      : v.file
        ? tr('Continuar', 'Continue')
        : tr('Escolhe um ficheiro', 'Choose a file');
  const primaryLabel = !v.canFinish && v.alreadyVerified && !sendingEmail ? tr('Continuar', 'Continue') : ctaLabel;
  const primary = async () => {
    if (sendingEmail) return void (await v.sendCode());
    if (v.canFinish) return void ((await v.finish()) && toScores());
    if (v.alreadyVerified) toScores();
  };

  const panel = (
    <div role="tabpanel" id="verif-panel" aria-labelledby={`tab-${v.method}`} className={styles.panel}>
      {sendingEmail && <EmailStep email={v.email} error={v.emailError} desktop={desktop} onChange={v.setEmail} onSend={v.sendCode} />}
      {v.codeStep && <CodeInput email={v.email} code={v.code} resent={v.resent} onChange={v.setCode} onResend={v.resend} onChangeEmail={v.backToEmail} />}
      {!v.isEmail && <DocumentPicker file={v.file} desktop={desktop} onChange={v.setFile} />}
      {v.apiError && (
        <div role="alert" className={`card warn ${styles.apiError}`}>
          {v.apiError}
        </div>
      )}
    </div>
  );
  const already = v.alreadyVerified && <AlreadyVerified method={v.alreadyVerified} />;
  const tabs = <MethodTabs method={v.method} desktop={desktop} onChange={v.setMethod} />;

  if (desktop) {
    return (
      <Shell chrome="header">
        <div className={`container ${styles.desktop}`}>
          <DeskSteps
            current={2}
            right={
              <Link to="/avaliar" className={`plain row ${styles.orgLink}`}>
                <span className={styles.orgName}>{orgName}</span>
                {locationLabel && <span className="muted">{locationLabel}</span>}
                <span className={styles.orgChange}>{tr('Mudar', 'Change')}</span>
              </Link>
            }
          />
          <div className={styles.columns}>
            <section className={styles.main}>
              <div className={styles.intro}>
                <h1 className={styles.desktopTitle}>{tr('Confirma que trabalhas lá', 'Confirm you work there')}</h1>
                <p className={`lead ${styles.lead}`}>
                  {tr(<>Ganhas o selo <strong>Verificado</strong>.</>, <>You get the <strong>Verified</strong> badge.</>)}{' '}
                  <Link to="/metodologia" className={styles.why}>
                    {tr('Porque pedimos isto?', 'Why do we ask?')}
                  </Link>
                </p>
              </div>
              {already}
              {tabs}
              {panel}
              <div className={`row wrap ${styles.actions}`}>
                {!sendingEmail && (
                  <button type="button" className={`btn btn-primary lift ${styles.next}`} disabled={primaryDisabled} onClick={primary}>
                    {primaryLabel} {!primaryDisabled && <Icon name="next" size={18} stroke={2} />}
                  </button>
                )}
                <button type="button" data-ev="verification" data-ev-method="none" data-ev-step="skipped" className={`link ${styles.quiet}`} onClick={toScores}>
                  {tr('Avaliar sem verificar', 'Review without verifying')}
                </button>
                <Link to="/avaliar" className={`link ${styles.back}`}>
                  <Icon name="back" size={16} /> {tr('Voltar', 'Back')}
                </Link>
              </div>
            </section>
            <AnonymityCard />
          </div>
        </div>
      </Shell>
    );
  }

  return (
    <Shell>
      <div className={`page ${styles.mobilePage}`}>
        <FlowHead
          icon="back"
          label={tr('Voltar', 'Back')}
          onClick={() => nav('/avaliar')}
          right={
            <>
              <span className="small muted">{tr('Antes de começar', 'Before you start')}</span>
              <button type="button" onClick={toScores} data-ev="verification" data-ev-method="none" data-ev-step="skipped" className={styles.skip}>
                {tr('Saltar', 'Skip')}
              </button>
            </>
          }
        />
        <div className={styles.mobileIntro}>
          <h1 className={styles.title}>{tr('Confirma que trabalhas lá', 'Confirm you work there')}</h1>
          <p className="small muted">{tr(<>Ganhas o selo Verificado em {orgName}. Leva um minuto.</>, <>You get the Verified badge at {orgName}. It takes a minute.</>)}</p>
        </div>
        {already}
        {tabs}
        {panel}
        <div className={`row small body ${styles.privacy}`}>
          <Icon name="lock" size={16} className={styles.privacyIcon} />
          {tr('O teu nome e email nunca ficam ligados à avaliação.', 'Your name and email are never linked to the review.')}
        </div>
        <div className="sticky-cta">
          <button type="button" className={`btn btn-primary btn-block ${styles.cta}`} disabled={primaryDisabled} onClick={primary}>
            {primaryLabel}
          </button>
        </div>
      </div>
    </Shell>
  );
}
