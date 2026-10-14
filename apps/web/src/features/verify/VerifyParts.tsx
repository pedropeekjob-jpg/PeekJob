import { useEffect, useRef, type ClipboardEvent, type KeyboardEvent } from 'react';
import { Link } from 'react-router';
import { Icon } from '../../components/Icon';
import { tr } from '../../i18n';
import { CODE_LENGTH, codeStatus, writeDigits, type Code } from './code';
import type { Method } from './useVerification';
import styles from './Verify.module.css';

const TAB_KEYS = ['ArrowRight', 'ArrowLeft', 'Home', 'End'];

/** Separadores email / documento (padrão ARIA de separadores: setas mudam e focam) */
export function MethodTabs({ method, desktop, onChange }: { method: Method; desktop: boolean; onChange: (m: Method) => void }) {
  const tabs: [Method, string, string][] = [
    ['email', desktop ? tr('Email do trabalho', 'Work email') : 'Email', 'mail'],
    ['documento', desktop ? tr('Contrato ou recibo', 'Contract or payslip') : tr('Documento', 'Document'), 'file'],
  ];
  const onKey = (e: KeyboardEvent<HTMLButtonElement>, m: Method) => {
    if (!TAB_KEYS.includes(e.key)) return;
    e.preventDefault();
    const to: Method = m === 'email' ? 'documento' : 'email';
    onChange(to);
    document.getElementById(`tab-${to}`)?.focus();
  };
  return (
    <div role="tablist" aria-label={tr('Forma de verificar', 'How to verify')} className={desktop ? styles.tabsDesktop : `segmented ${styles.tabs}`}>
      {tabs.map(([m, label, icon]) => (
        <button
          key={m}
          type="button"
          role="tab"
          id={`tab-${m}`}
          aria-selected={method === m}
          aria-controls="verif-panel"
          tabIndex={method === m ? 0 : -1}
          onKeyDown={(e) => onKey(e, m)}
          onClick={() => onChange(m)}
          className={desktop ? styles.tabDesktop : styles.tab}
        >
          {desktop && <Icon name={icon} size={18} />}
          {label}
        </button>
      ))}
    </div>
  );
}

/** Passo 1 do email: endereço do trabalho */
export function EmailStep({ email, error, desktop, onChange, onSend }: { email: string; error: string; desktop: boolean; onChange: (v: string) => void; onSend: () => void }) {
  return (
    <div className={`fade-up ${styles.block}`}>
      <label htmlFor="ve" className={styles.label}>
        {desktop ? tr('Email do trabalho', 'Work email') : tr('Email da organização', 'Organisation email')}
      </label>
      <div className={`row wrap ${styles.emailRow}`}>
        <input
          className={`input ${styles.emailInput}`}
          id="ve"
          type="email"
          autoComplete="email"
          inputMode="email"
          value={email}
          placeholder={tr('nome@organizacao.pt', 'name@organisation.com')}
          aria-invalid={!!error}
          aria-describedby={error ? 've-err' : 've-hint'}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && onSend()}
        />
        {desktop && (
          <button type="button" className={`btn btn-dark lift ${styles.send}`} onClick={onSend}>
            {tr('Enviar código', 'Send code')}
          </button>
        )}
      </div>
      {error ? (
        <span id="ve-err" role="alert" className={styles.error}>
          {error}
        </span>
      ) : (
        <span id="ve-hint" className="small muted">
          {tr('Enviamos 6 dígitos e esquecemos o endereço.', 'We send 6 digits and forget the address.')}
        </span>
      )}
    </div>
  );
}

/**
 * Código de 6 dígitos: escrever avança, colar preenche, setas e apagar navegam.
 * O foco vai para o primeiro dígito quando o código aparece e quando é reenviado.
 */
export function CodeInput({ email, code, resent, onChange, onResend, onChangeEmail }: { email: string; code: Code; resent: boolean; onChange: (c: Code) => void; onResend: () => void; onChangeEmail: () => void }) {
  const refs = useRef<(HTMLInputElement | null)[]>([]);
  const focus = (i: number) => refs.current[i]?.focus();
  // quando o código aparece, o foco vai para o primeiro dígito
  useEffect(() => focus(0), []);

  const write = (i: number, raw: string) => {
    const r = writeDigits(code, i, raw);
    onChange(r.code);
    if (r.focus !== i) focus(r.focus);
  };
  const onKey = (i: number, e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && !code[i] && i > 0) focus(i - 1);
    if (e.key === 'ArrowLeft' && i > 0) focus(i - 1);
    if (e.key === 'ArrowRight' && i < CODE_LENGTH - 1) focus(i + 1);
  };
  const onPaste = (i: number, e: ClipboardEvent<HTMLInputElement>) => {
    const text = e.clipboardData.getData('text');
    if (!/\d/.test(text)) return;
    e.preventDefault();
    write(i, text);
  };
  const firstEmpty = code.indexOf('');

  return (
    <div className={`fade-up ${styles.codeBlock}`}>
      <div className={styles.sentTo}>
        {tr('Código enviado para', 'Code sent to')} <strong>{email}</strong>
      </div>
      <div role="group" aria-label={tr('Código de 6 dígitos', '6-digit code')} className={styles.digits}>
        {code.map((v, i) => (
          <input
            // a posição é a identidade de cada dígito
            // eslint-disable-next-line react/no-array-index-key
            key={i}
            ref={(el) => {
              refs.current[i] = el;
            }}
            aria-label={tr(`Dígito ${i + 1} de 6`, `Digit ${i + 1} of 6`)}
            inputMode="numeric"
            autoComplete={i === 0 ? 'one-time-code' : 'off'}
            maxLength={i === 0 ? CODE_LENGTH : 1}
            value={v}
            onChange={(e) => write(i, e.target.value)}
            onKeyDown={(e) => onKey(i, e)}
            onPaste={(e) => onPaste(i, e)}
            onFocus={(e) => e.target.select()}
            className={`digit ${i === firstEmpty ? styles.digitNext : v ? styles.digitFilled : styles.digit}`}
          />
        ))}
      </div>
      <div className={`row wrap ${styles.codeActions}`}>
        <span role="status">{codeStatus(code, resent)}</span>
        <button
          type="button"
          className="link"
          onClick={() => {
            onResend();
            focus(0);
          }}
        >
          {tr('Reenviar código', 'Resend code')}
        </button>
        <button type="button" className="link" onClick={onChangeEmail}>
          {tr('Mudar email', 'Change email')}
        </button>
      </div>
    </div>
  );
}

/** PDF ou fotografia (o telemóvel converte HEIC em JPEG quando o HEIC não está na lista) */
const ACCEPT = 'application/pdf,image/jpeg,image/png,image/webp';

/** Documento (contrato ou recibo): só se procura o NIF da organização; o ficheiro não é guardado */
export function DocumentPicker({ file, desktop, onChange }: { file: File | null; desktop: boolean; onChange: (f: File | null) => void }) {
  return (
    <div className={`fade-up ${styles.docBlock}`}>
      <label className={`file-drop ${file ? styles.dropChosen : styles.drop}`} htmlFor="vf">
        <span className={styles.dropIcon}>
          <Icon name={file ? 'check' : 'upload'} size={18} stroke={2} />
        </span>
        <span className={styles.dropText}>
          <span className={`ellipsis ${styles.dropName}`}>{file?.name || tr('Escolher foto ou PDF', 'Choose a photo or PDF')}</span>
          <span className="small muted">
            {file ? tr('Tocar para escolher outro ficheiro', 'Tap to choose another file') : desktop ? tr('Contrato ou recibo · foto ou PDF', 'Contract or payslip · photo or PDF') : tr('Contrato, recibo ou declaração', 'Contract, payslip or statement')}
          </span>
        </span>
        <input id="vf" type="file" accept={ACCEPT} onChange={(e) => onChange(e.target.files?.[0] ?? null)} className={styles.fileInput} />
      </label>
      {file ? (
        <div role="status" className={`row fade-up ${styles.fileOk}`}>
          <Icon name="shield" size={18} className={styles.fileOkIcon} />
          <span>{tr('Só procuramos o NIF da organização. O ficheiro é apagado logo a seguir.', 'We only look for the organisation’s NIF (tax number). The file is deleted straight after.')}</span>
        </div>
      ) : (
        <span className="small muted">{tr('Só procuramos o NIF da organização e depois o ficheiro é apagado. Podes tapar o resto (o teu nome, por exemplo).', 'We only look for the organisation’s NIF (tax number), then the file is deleted. You can cover the rest (your name, for example).')}</span>
      )}
    </div>
  );
}

/** "Já confirmaste…" quando o rascunho já está verificado */
export function AlreadyVerified({ method }: { method: Method }) {
  return (
    <div role="status" className={`row ${styles.already}`}>
      <Icon name="check" size={18} stroke={2.2} />
      {tr(
        <>Já confirmaste {method === 'email' ? 'por email' : 'com documento'}. Podes continuar.</>,
        <>You’ve already verified {method === 'email' ? 'by email' : 'with a document'}. You can continue.</>,
      )}
    </div>
  );
}

/** Cartão "O teu anonimato" (computador) */
export function AnonymityCard() {
  const promises = [
    tr('Guardamos só o “sim”.', 'We only keep the “yes”.'),
    tr('Email e ficheiro não ficam.', 'We don’t keep your email or file.'),
    tr('A organização não sabe quem foi.', 'The organisation doesn’t know who it was.'),
  ];
  return (
    <aside aria-label={tr('O teu anonimato', 'Your anonymity')} className={styles.anonymity}>
      <span className={styles.lockBadge}>
        <Icon name="lock" size={18} stroke={2} />
      </span>
      <h2 className={styles.h2}>{tr('O teu anonimato', 'Your anonymity')}</h2>
      <ul className={styles.promises}>
        {promises.map((p) => (
          <li key={p} className={`row ${styles.promise}`}>
            <Icon name="check" size={18} stroke={2.2} className={styles.promiseIcon} />
            {p}
          </li>
        ))}
      </ul>
      <Link to="/metodologia" className={`link ${styles.howLink}`}>
        {tr('Como calculamos →', 'How we score →')}
      </Link>
    </aside>
  );
}
