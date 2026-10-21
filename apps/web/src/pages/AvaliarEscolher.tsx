import { useEffect } from 'react';
import { Icon } from '../components/Icon';
import { ResponsibilityNote } from '../components/UI';
import { Shell } from '../components/Layout';
import styles from '../features/review/OrgPicker.module.css';
import { AddOrgForm, LocationPicker, OrgResults, OrgSearchBox, PickIllustration } from '../features/review/OrgPickerParts';
import { useAddOrg } from '../features/review/useAddOrg';
import { useFlowNav } from '../features/review/useFlowNav';
import { useOrgPicker } from '../features/review/useOrgPicker';
import { tr } from '../i18n';
import { useIsDesktop } from '../lib/useMedia';
import { DeskSteps, FlowHead, LockLine, MiniSteps } from '../features/review/FlowParts';

/** Avaliar · passo 1: escolher a organização (e o local) ou adicionar uma que falta */
export default function AvaliarEscolher() {
  const desktop = useIsDesktop();
  const { go, leave } = useFlowNav();
  const picker = useOrgPicker(desktop);
  const add = useAddOrg();
  const { step, chosen } = picker;

  // vindo da página da organização, com um só local: não há nada a escolher
  useEffect(() => {
    if (picker.autoStart && picker.confirm()) go('/avaliar/notas', { replace: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps -- só na entrada
  }, []);

  const startAdd = () => {
    add.start(picker.q);
    picker.setStep('add');
  };
  const next = async () => {
    const ok = step === 'add' ? await add.submit() : picker.confirm();
    if (ok) go('/avaliar/notas');
  };
  const nextLabel = step === 'add' ? tr('Adicionar e continuar', 'Add and continue') : tr('Continuar', 'Continue');

  const search = <OrgSearchBox value={picker.query} onChange={picker.setQuery} />;
  const results = (
    <OrgResults orgs={picker.visible} total={picker.results.length} query={picker.q} selectedId={step === 'confirm' ? chosen?.id ?? null : null} desktop={desktop} onPick={(o) => picker.pick(o) && go('/avaliar/notas')} />
  );
  const detail = (
    <>
      {step === 'confirm' && chosen && <LocationPicker org={chosen} active={picker.effectiveLocation} desktop={desktop} onPick={picker.setLocationId} onOther={() => picker.setStep('pick')} />}
      {step === 'add' && <AddOrgForm form={add.form} error={add.error} desktop={desktop} onChange={add.set} onSubmit={next} onBack={() => picker.setStep('pick')} />}
    </>
  );

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
          <div className={styles.columns}>
            <section aria-label={tr('Pesquisar organização', 'Search organisations')} className={styles.searchColumn}>
              <div className={styles.intro}>
                <h1 className={styles.desktopTitle}>{tr('Onde trabalhas?', 'Where do you work?')}</h1>
                <p className={`lead ${styles.lead}`}>{tr('Fica entre nós: ninguém sabe que foste tu.', 'It stays between us: no one will know it was you.')}</p>
                <ResponsibilityNote />
              </div>
              {search}
              {results}
              <button type="button" className={`lift row ${styles.addButton}`} onClick={startAdd}>
                <span className={styles.addIcon}>
                  <Icon name="plus" size={14} stroke={2.4} />
                </span>
                {tr('Adicionar organização que não está cá', 'Add an organisation that isn’t listed')}
              </button>
            </section>

            <section aria-live="polite" className={styles.detail}>
              {step === 'pick' && (
                <div className={`fade-up ${styles.placeholder}`}>
                  <PickIllustration />
                  <h2 className={styles.placeholderTitle}>{tr('Escolhe a organização à esquerda', 'Choose the organisation on the left')}</h2>
                </div>
              )}
              {detail}
              <div className={`row wrap between ${styles.footer}`}>
                <LockLine>{tr('A avaliação fica ligada ao local, não a ti.', 'The review is linked to the location, not to you.')}</LockLine>
                {step === 'pick' ? (
                  <button type="button" className={`btn ${styles.next}`} disabled>
                    {tr('Escolhe uma organização', 'Choose an organisation')}
                  </button>
                ) : (
                  <button type="button" className={`btn btn-primary lift ${styles.next}`} onClick={next}>
                    {nextLabel} <Icon name="next" size={18} stroke={2} />
                  </button>
                )}
              </div>
            </section>
          </div>
        </div>
      </Shell>
    );
  }

  return (
    <Shell>
      <div className={`page ${styles.mobilePage}`}>
        <FlowHead icon="close" label={tr('Fechar', 'Close')} onClick={() => leave('/')} right={<MiniSteps current={1} />} />
        {step === 'pick' && (
          <div className={`fade-up ${styles.mobilePick}`}>
            <h1 className={styles.title}>{tr('Onde trabalhas?', 'Where do you work?')}</h1>
            {search}
            {results}
            <button type="button" className={`link ${styles.addLink}`} onClick={startAdd}>
              {tr('Não encontras? Adicionar organização', 'Can’t find it? Add organisation')}
            </button>
            <ResponsibilityNote />
          </div>
        )}
        {detail}
        {step !== 'pick' && (
          <div className="sticky-cta">
            <button type="button" className={`btn btn-primary btn-block ${styles.cta}`} onClick={next}>
              {nextLabel}
            </button>
          </div>
        )}
      </div>
    </Shell>
  );
}
