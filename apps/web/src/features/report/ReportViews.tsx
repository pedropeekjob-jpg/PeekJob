import { useId } from 'react';
import { Link, useNavigate } from 'react-router';
import { Icon } from '../../components/Icon';
import type { Org } from '../../data/orgs';
import { tr } from '../../i18n';
import { useToggle } from '../../lib/useToggle';
import type { ReportTarget } from './report';
import { Confirmation, ContactFields, DetailBox, DetailCount, IllegalSupport, ModSteps, QuotedTarget, ReasonPicker, SendError } from './ReportParts';
import type { ReportState } from './useReport';
import styles from './Report.module.css';

interface ViewProps {
  org: Org;
  target: ReportTarget;
  r: ReportState;
  orgPath: string;
}

/** Computador: formulário à esquerda; como moderamos e apoio à direita */
export function ReportDesktop({ org, target, r, orgPath }: ViewProps) {
  const nav = useNavigate();
  const fieldId = useId();
  const [steps, toggleSteps] = useToggle();
  return (
    <div className={`container ${styles.container}`}>
      <Link to={orgPath} className={`row ${styles.backLink}`}>
        <Icon name="back" size={16} /> {org.name}
      </Link>
      <div className={styles.columns}>
        <section aria-label={tr(`Denunciar ${target.kind}`, `Report ${target.kind === 'avaliação' ? 'review' : 'interview'}`)}>
          {r.sent ? (
            <Confirmation r={r} orgPath={orgPath} desktop />
          ) : (
            <div className={styles.form}>
              <div className={styles.head}>
                <h1 className={`h1 ${styles.title}`}>{tr('O que está errado?', 'What’s wrong?')}</h1>
                <QuotedTarget target={target} />
              </div>
              <ReasonPicker r={r} desktop />
              <div className={styles.detail}>
                <div className={`row between ${styles.baseline}`}>
                  <label htmlFor={fieldId} className={styles.detailLabel}>
                    {tr('Comentário', 'Comment')} <span className={styles.optional}>{tr('(opcional)', '(optional)')}</span>
                  </label>
                  <DetailCount r={r} live />
                </div>
                <DetailBox r={r} id={fieldId} />
              </div>
              <ContactFields r={r} />
              <SendError r={r} />
              <div className={`row wrap ${styles.actions}`}>
                <button type="button" className={`btn btn-dark lift ${styles.send}`} onClick={r.send} aria-disabled={!r.reason || r.busy}>
                  {tr('Enviar denúncia', 'Send report')}
                </button>
                <button type="button" className={`link ${styles.cancel}`} onClick={() => nav(orgPath)}>
                  {tr('Cancelar', 'Cancel')}
                </button>
              </div>
            </div>
          )}
        </section>

        <aside className={styles.aside}>
          <section aria-labelledby="mod-h" className={styles.how}>
            <h2 id="mod-h" className={`h2 ${styles.howTitle}`}>
              {tr('Como moderamos', 'How we moderate')}
            </h2>
            <span className={`body ${styles.howText}`}>{tr('Uma pessoa revê em até 48 horas. É anónimo.', 'A person reviews it within 48 hours. It’s anonymous.')}</span>
            {steps && <ModSteps />}
            <button type="button" className={`link ${styles.start}`} aria-expanded={steps} aria-controls="mod-steps" onClick={toggleSteps}>
              {steps ? tr('Esconder os passos', 'Hide the steps') : tr('Ver os 3 passos', 'See the 3 steps')}
            </button>
          </section>
          <IllegalSupport />
        </aside>
      </div>
    </div>
  );
}

/** Telemóvel: folha sobre fundo escuro (tocar no fundo fecha) */
export function ReportMobile({ target, r, orgPath }: ViewProps) {
  const fieldId = useId();
  const [detailOpen, openDetail] = useToggle();
  return (
    <div className={styles.backdrop}>
      <Link to={orgPath} aria-label={tr('Fechar', 'Close')} className={styles.backdropClose} />
      <div role="dialog" aria-modal="false" aria-labelledby="den-title" className={styles.sheet}>
        <div className={`row ${styles.handleRow}`} aria-hidden="true">
          <span className={styles.handle} />
        </div>
        <div className={styles.sheetBody}>
          {r.sent ? (
            <>
              <span id="den-title" className="sr-only">
                {tr('Denúncia enviada', 'Report sent')}
              </span>
              <div className={styles.sentGap}>
                <Confirmation r={r} orgPath={orgPath} desktop={false} />
              </div>
              <IllegalSupport />
            </>
          ) : (
            <>
              <div className={`row between ${styles.sheetHead}`}>
                <div className={styles.headMobile}>
                  <h1 id="den-title" className={`h1 ${styles.titleMobile}`}>
                    {tr('O que está errado?', 'What’s wrong?')}
                  </h1>
                  <QuotedTarget target={target} />
                </div>
                <Link to={orgPath} className={`icon-btn bare ${styles.close}`} aria-label={tr('Fechar', 'Close')}>
                  <Icon name="close" />
                </Link>
              </div>
              <ReasonPicker r={r} desktop={false} />
              {detailOpen ? (
                <div className="field fade-up">
                  <div className={`row between ${styles.baseline}`}>
                    <label htmlFor={fieldId} className="small muted">
                      {tr('Detalhe (opcional)', 'Detail (optional)')}
                    </label>
                    <DetailCount r={r} />
                  </div>
                  <DetailBox r={r} id={fieldId} />
                </div>
              ) : (
                <button type="button" className={`link ${styles.addDetail}`} onClick={openDetail} aria-expanded={false}>
                  <Icon name="plus" size={16} /> {tr('Adicionar detalhe', 'Add detail')}
                </button>
              )}
              <IllegalSupport />
              <ContactFields r={r} />
              <SendError r={r} />
              <button type="button" className={`btn btn-dark btn-block ${styles.sendMobile}`} onClick={r.send} aria-disabled={!r.reason || r.busy}>
                {tr('Enviar denúncia', 'Send report')}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
