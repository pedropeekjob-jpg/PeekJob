import { useState } from 'react';
import { MoreToggle } from '../../components/UI';
import { tr } from '../../i18n';
import { useStore, type SupportMessage } from '../../lib/store';
import { useToggle } from '../../lib/useToggle';
import { APPEAL_MIN, appealStatusText, OUT_OF_COURT } from './support';
import styles from './Support.module.css';

/** Pedir a revisão de uma decisão: texto obrigatório, uma vez por decisão; o estado fica no aviso */
function useAppealForm(id: string) {
  const { appeal } = useStore();
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [sent, setSent] = useState(false);
  const ok = text.trim().length >= APPEAL_MIN;
  const send = async () => {
    if (!ok || busy) return;
    setBusy(true);
    const r = await appeal(id, text.trim());
    setBusy(false);
    if (r.ok) setSent(true);
    else setError(r.message);
  };
  return { text, setText, busy, error, sent, ok, send };
}

/** Contestar (DSA art. 20.º) no aviso da decisão; na resposta, os passos que restam (art. 21.º) */
export function AppealBox({ n }: { n: SupportMessage }) {
  const [open, toggle] = useToggle();
  const form = useAppealForm(n.id);
  const formId = `appeal-${n.id}`;

  if (n.details?.decision === 'appeal_confirmed') return <p className={`small ${styles.appealNext}`}>{OUT_OF_COURT()}</p>;
  if (form.sent) {
    return (
      <p role="status" className={`small ${styles.appealStatus}`}>
        {tr('Pedido de revisão enviado. Uma pessoa da equipa revê a decisão e responde aqui.', 'Review request sent. Someone from the team will review the decision and answer here.')}
      </p>
    );
  }
  const status = appealStatusText(n.appeal);
  if (n.appeal?.status !== 'available') return status ? <p className={`small ${styles.appealStatus}`}>{status}</p> : null;

  return (
    <div className={styles.appeal}>
      <p className="small muted">{status}</p>
      <MoreToggle open={open} onToggle={toggle} controls={formId} label={tr('Contestar esta decisão', 'Appeal this decision')} openLabel={tr('Cancelar', 'Cancel')} />
      {open && (
        <div id={formId} className={`fade-up ${styles.appealForm}`}>
          <label htmlFor={`${formId}-t`} className={styles.appealLabel}>
            {tr('Porque deve ser revista?', 'Why should it be reviewed?')}
          </label>
          <textarea
            id={`${formId}-t`}
            className="textarea"
            rows={4}
            maxLength={2000}
            value={form.text}
            onChange={(e) => form.setText(e.target.value)}
            placeholder={tr('Explica o que achas que não está certo na decisão.', 'Explain what you think is wrong with the decision.')}
          />
          {form.error && (
            <span role="alert" className={styles.appealError}>
              {form.error}
            </span>
          )}
          <button type="button" className="btn btn-dark" disabled={!form.ok || form.busy} onClick={form.send}>
            {tr('Pedir revisão', 'Request review')}
          </button>
          <span className="small muted">{tr('Uma pessoa da equipa (não um automatismo) revê e responde aqui.', 'A person on the team (not an automated system) reviews it and answers here.')}</span>
        </div>
      )}
    </div>
  );
}
