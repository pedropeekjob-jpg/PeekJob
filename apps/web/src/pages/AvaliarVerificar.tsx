import { useRef, useState, type ClipboardEvent, type KeyboardEvent } from 'react';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import { Shell } from '../components/Layout';
import { Icon } from '../components/Icon';
import { useOrg } from '../api/orgs';
import { useStore } from '../lib/store';
import { useIsDesktop } from '../lib/useMedia';
import { DeskSteps, DISPLAY, FlowHead } from './Avaliar.parts';

type Method = 'email' | 'documento';
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PROMISES = ['Guardamos só o “sim”.', 'Email e ficheiro não ficam.', 'A organização não sabe quem foi.'];

export default function AvaliarVerificar() {
  const desktop = useIsDesktop();
  const nav = useNavigate();
  const { draft, updateDraft } = useStore();
  const org = useOrg(draft.orgId);

  const [method, setMethod] = useState<Method>(draft.verified ?? 'email');
  const [step, setStep] = useState<'email' | 'code'>('email');
  const [email, setEmail] = useState('');
  const [emailError, setEmailError] = useState('');
  const [code, setCode] = useState<string[]>(['', '', '', '', '', '']);
  const [resent, setResent] = useState(false);
  const [file, setFile] = useState('');
  const digitRefs = useRef<(HTMLInputElement | null)[]>([]);

  if (!draft.orgId || !org) return <Navigate to="/avaliar" replace />;

  const loc = org.locations.find((l) => l.id === draft.locationId);
  const filled = code.filter((c) => c !== '').length;
  const codeOk = filled === 6;
  const isEmail = method === 'email';
  const codeStep = isEmail && step === 'code';

  const sendCode = () => {
    if (!EMAIL_RE.test(email.trim())) {
      setEmailError('Escreve um email válido, por exemplo nome@organizacao.pt.');
      return;
    }
    setEmailError('');
    setStep('code');
    setResent(false);
    setTimeout(() => digitRefs.current[0]?.focus(), 30);
  };

  const setDigit = (i: number, raw: string) => {
    const d = raw.replace(/\D/g, '');
    if (d.length > 1) return paste(i, d);
    const c = code.slice();
    c[i] = d.slice(-1);
    setCode(c);
    if (d && i < 5) digitRefs.current[i + 1]?.focus();
  };
  const paste = (from: number, digits: string) => {
    const c = code.slice();
    digits.split('').slice(0, 6 - from).forEach((d, k) => (c[from + k] = d));
    setCode(c);
    digitRefs.current[Math.min(from + digits.length, 5)]?.focus();
  };
  const onKey = (i: number, e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && !code[i] && i > 0) digitRefs.current[i - 1]?.focus();
    if (e.key === 'ArrowLeft' && i > 0) digitRefs.current[i - 1]?.focus();
    if (e.key === 'ArrowRight' && i < 5) digitRefs.current[i + 1]?.focus();
  };
  const onPaste = (i: number, e: ClipboardEvent<HTMLInputElement>) => {
    const d = e.clipboardData.getData('text').replace(/\D/g, '');
    if (d) {
      e.preventDefault();
      paste(i, d);
    }
  };

  const canContinue = isEmail ? codeStep && codeOk : !!file;
  const finish = () => {
    if (!canContinue) return;
    updateDraft({ verified: method });
    nav('/avaliar/notas');
  };
  const skip = () => nav('/avaliar/notas');

  const ctaLabel = codeStep ? (desktop ? 'Confirmar e continuar' : 'Confirmar e começar') : isEmail ? 'Enviar código' : file ? 'Continuar' : 'Escolhe um ficheiro';
  const firstEmpty = code.indexOf('');
  const codeStatus = resent ? 'Código novo enviado. Expira em 10 minutos.' : codeOk ? 'Código completo.' : `Faltam ${6 - filled} dígito${6 - filled === 1 ? '' : 's'} · expira em 10 min`;

  /* ---------- Blocos ---------- */

  const tabs = (
    <div
      role="tablist"
      aria-label="Forma de verificar"
      className={desktop ? 'row wrap' : 'segmented'}
      style={desktop ? { gap: 8 } : { gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gridAutoFlow: 'row' }}
    >
      {(
        [
          ['email', desktop ? 'Email do trabalho' : 'Email', 'mail'],
          ['documento', desktop ? 'Contrato ou recibo' : 'Documento', 'file'],
        ] as const
      ).map(([m, label, icon]) => {
        const on = method === m;
        return (
          <button
            key={m}
            type="button"
            role="tab"
            id={`tab-${m}`}
            aria-selected={on}
            aria-controls="verif-panel"
            aria-pressed={desktop ? undefined : on}
            onClick={() => setMethod(m)}
            style={
              desktop
                ? { display: 'flex', alignItems: 'center', gap: 10, height: 48, padding: '0 20px', borderRadius: 999, border: `1px solid ${on ? 'var(--ink)' : 'var(--field)'}`, background: on ? 'var(--ink)' : 'var(--surface)', color: on ? '#fff' : 'var(--ink)', fontSize: 15, fontWeight: 600 }
                : { height: 44, fontSize: 15 }
            }
          >
            {desktop && <Icon name={icon} size={18} />}
            {label}
          </button>
        );
      })}
    </div>
  );

  const emailBlock = (
    <div className="stack fade-up" style={{ gap: desktop ? 10 : 6 }}>
      <label htmlFor="ve" style={{ fontSize: 13, fontWeight: 600, color: 'var(--body)' }}>
        {desktop ? 'Email do trabalho' : 'Email da organização'}
      </label>
      <div className="row wrap" style={{ gap: 12 }}>
        <input
          className="input"
          id="ve"
          type="email"
          autoComplete="email"
          inputMode="email"
          value={email}
          placeholder="nome@organizacao.pt"
          aria-invalid={!!emailError}
          aria-describedby={emailError ? 've-err' : 've-hint'}
          onChange={(e) => setEmail(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && sendCode()}
          style={{ flex: '1 1 280px', minWidth: 0, height: 56, borderRadius: 16 }}
        />
        {desktop && (
          <button type="button" className="btn btn-dark lift" style={{ height: 56, borderRadius: 16, padding: '0 26px' }} onClick={sendCode}>
            Enviar código
          </button>
        )}
      </div>
      {emailError ? (
        <span id="ve-err" role="alert" style={{ fontSize: 13, color: 'var(--warn-text)' }}>
          {emailError}
        </span>
      ) : (
        <span id="ve-hint" className="small muted">
          Enviamos 6 dígitos e esquecemos o endereço.
        </span>
      )}
    </div>
  );

  const codeBlock = (
    <div className="stack fade-up" style={{ gap: desktop ? 14 : 10 }}>
      <div style={{ fontSize: desktop ? 15 : 13, color: desktop ? 'var(--body)' : 'var(--muted)' }}>
        Código enviado para <strong style={{ color: 'var(--ink)', fontWeight: 600 }}>{email}</strong>
      </div>
      <div role="group" aria-label="Código de 6 dígitos" style={{ display: 'grid', gridTemplateColumns: `repeat(6, minmax(0, ${desktop ? '60px' : '1fr'}))`, gap: desktop ? 10 : 8 }}>
        {code.map((v, i) => (
          <input
            key={i}
            ref={(el) => {
              digitRefs.current[i] = el;
            }}
            aria-label={`Dígito ${i + 1} de 6`}
            inputMode="numeric"
            autoComplete={i === 0 ? 'one-time-code' : 'off'}
            maxLength={i === 0 ? 6 : 1}
            value={v}
            onChange={(e) => setDigit(i, e.target.value)}
            onKeyDown={(e) => onKey(i, e)}
            onPaste={(e) => onPaste(i, e)}
            onFocus={(e) => e.target.select()}
            className="digit"
            style={{
              height: desktop ? 64 : 56, minWidth: 0, textAlign: 'center', borderRadius: desktop ? 16 : 14,
              border: `2px solid ${i === firstEmpty ? 'var(--teal)' : v ? 'var(--ink)' : 'var(--field)'}`, background: 'var(--surface)',
              fontFamily: 'var(--font-mono)', fontSize: desktop ? 24 : 22, color: 'var(--ink)', padding: 0,
            }}
          />
        ))}
      </div>
      <div className="row wrap" style={{ gap: '0 20px', fontSize: 13, color: 'var(--muted)' }}>
        <span role="status">{codeStatus}</span>
        <button type="button" className="link" style={{ fontSize: 14 }} onClick={() => { setCode(['', '', '', '', '', '']); setResent(true); digitRefs.current[0]?.focus(); }}>
          Reenviar código
        </button>
        <button type="button" className="link" style={{ fontSize: 14 }} onClick={() => setStep('email')}>
          Mudar email
        </button>
      </div>
    </div>
  );

  const docBlock = (
    <div className="stack fade-up" style={{ gap: desktop ? 12 : 10 }}>
      <label className="file-drop" htmlFor="vf" style={{ position: 'relative', display: 'flex', alignItems: 'center', gap: desktop ? 16 : 14, padding: desktop ? 22 : 18, borderRadius: 20, border: `2px dashed ${file ? 'var(--teal)' : 'var(--grey)'}`, background: 'var(--surface)', cursor: 'pointer' }}>
        <span style={{ flex: 'none', width: desktop ? 48 : 44, height: desktop ? 48 : 44, borderRadius: 24, border: '4px solid var(--teal)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Icon name={file ? 'check' : 'upload'} size={18} stroke={2} />
        </span>
        <span className="stack grow" style={{ gap: 2 }}>
          <span className="ellipsis" style={{ fontSize: 16, fontWeight: 600 }}>{file || 'Escolher foto ou PDF'}</span>
          <span className="small muted">{file ? 'Tocar para escolher outro ficheiro' : desktop ? 'Contrato ou recibo · foto ou PDF' : 'Contrato, recibo ou declaração'}</span>
        </span>
        <input
          id="vf"
          type="file"
          accept="image/*,application/pdf"
          onChange={(e) => {
            const f = e.target.files?.[0];
            setFile(f ? f.name : '');
          }}
          style={{ position: 'absolute', width: 1, height: 1, opacity: 0 }}
        />
      </label>
      {file ? (
        <div role="status" className="row fade-up" style={{ gap: 10, fontSize: 15, color: 'var(--teal-dark)', alignItems: 'flex-start' }}>
          <Icon name="shield" size={18} style={{ flex: 'none', marginTop: 2 }} />
          <span>Só lemos o NIF e a data. O ficheiro é apagado logo a seguir.</span>
        </div>
      ) : (
        <span className="small muted">Só lemos o NIF e a data, e depois o ficheiro é apagado. Podes tapar o resto.</span>
      )}
    </div>
  );

  const already = draft.verified && (
    <div role="status" className="row" style={{ gap: 8, fontSize: 15, color: 'var(--teal-dark)' }}>
      <Icon name="check" size={18} stroke={2.2} />
      Já confirmaste {draft.verified === 'email' ? 'por email' : 'com documento'}. Podes continuar.
    </div>
  );

  const panel = (
    <div role="tabpanel" id="verif-panel" aria-labelledby={`tab-${method}`} className="stack" style={{ gap: 16 }}>
      {isEmail && !codeStep && emailBlock}
      {codeStep && codeBlock}
      {!isEmail && docBlock}
    </div>
  );

  const primary = () => {
    if (isEmail && !codeStep) return sendCode();
    if (canContinue) return finish();
    if (draft.verified) return nav('/avaliar/notas');
  };
  const primaryDisabled = !(isEmail && !codeStep) && !canContinue && !draft.verified;
  const primaryLabel = !canContinue && draft.verified && !(isEmail && !codeStep) ? 'Continuar' : ctaLabel;

  /* ---------- Desktop ---------- */
  if (desktop) {
    return (
      <Shell chrome="header">
        <div className="container" style={{ paddingBottom: 80 }}>
          <DeskSteps
            current={2}
            right={
              <Link to="/avaliar" className="plain row" style={{ minHeight: 44, gap: 10, fontSize: 15 }}>
                <span style={{ fontWeight: 600 }}>{org.name}</span>
                {loc && <span className="muted">{loc.label}</span>}
                <span style={{ fontWeight: 600, color: 'var(--teal-text)', paddingLeft: 4 }}>Mudar</span>
              </Link>
            }
          />
          <div className="row wrap" style={{ gap: 64, alignItems: 'flex-start', paddingTop: 48 }}>
            <section className="stack" style={{ flex: '1.6 1 560px', minWidth: 0, gap: 28 }}>
              <div className="stack" style={{ gap: 12 }}>
                <h1 style={{ ...DISPLAY, fontSize: 52, lineHeight: 1, letterSpacing: '-0.01em' }}>Confirma que trabalhas lá</h1>
                <p className="lead" style={{ fontSize: 16 }}>
                  Ganhas o selo <strong style={{ color: 'var(--teal-dark)' }}>Verificado</strong>.{' '}
                  <Link to="/metodologia" style={{ fontWeight: 600 }}>
                    Porque pedimos isto?
                  </Link>
                </p>
              </div>
              {already}
              {tabs}
              {panel}
              <div className="row wrap" style={{ gap: '12px 24px', paddingTop: 24, borderTop: '1px solid var(--line)' }}>
                {!(isEmail && !codeStep) && (
                  <button type="button" className="btn btn-primary lift" style={{ height: 56, padding: '0 28px' }} disabled={primaryDisabled} onClick={primary}>
                    {primaryLabel} {!primaryDisabled && <Icon name="next" size={18} stroke={2} />}
                  </button>
                )}
                <button type="button" className="link" style={{ color: 'var(--body)', fontWeight: 500, fontSize: 15 }} onClick={skip}>
                  Avaliar sem verificar
                </button>
                <Link to="/avaliar" className="link" style={{ color: 'var(--body)', fontWeight: 500, fontSize: 15, marginLeft: 'auto' }}>
                  <Icon name="back" size={16} /> Voltar
                </Link>
              </div>
            </section>

            <aside aria-label="O teu anonimato" className="stack" style={{ flex: '1 1 320px', minWidth: 0, position: 'sticky', top: 24, background: 'var(--ink)', color: '#fff', borderRadius: 28, padding: 32, gap: 20 }}>
              <span style={{ width: 48, height: 48, borderRadius: 24, border: '4px solid var(--teal)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Icon name="lock" size={18} stroke={2} />
              </span>
              <h2 style={{ ...DISPLAY, fontSize: 24, lineHeight: 1.1 }}>O teu anonimato</h2>
              <ul className="stack" style={{ margin: 0, padding: 0, listStyle: 'none', gap: 14 }}>
                {PROMISES.map((p) => (
                  <li key={p} className="row" style={{ gap: 12, fontSize: 15, lineHeight: 1.45, color: '#E2E5E6' }}>
                    <Icon name="check" size={18} stroke={2.2} style={{ color: 'var(--teal)', flex: 'none' }} />
                    {p}
                  </li>
                ))}
              </ul>
              <Link to="/metodologia" className="link" style={{ color: '#7FD6D9', fontSize: 15 }}>
                Como calculamos →
              </Link>
            </aside>
          </div>
        </div>
      </Shell>
    );
  }

  /* ---------- Mobile ---------- */
  return (
    <Shell>
      <div className="page no-nav" style={{ minHeight: '100dvh', paddingBottom: 0 }}>
        <FlowHead
          icon="back"
          label="Voltar"
          onClick={() => nav('/avaliar')}
          right={
            <>
              <span className="small muted">Antes de começar</span>
              <button type="button" onClick={skip} style={{ minWidth: 44, height: 44, border: 0, background: 'none', fontSize: 15, fontWeight: 500, color: 'var(--body)', padding: 0, textAlign: 'right' }}>
                Saltar
              </button>
            </>
          }
        />
        <div className="stack" style={{ gap: 8 }}>
          <h1 style={{ ...DISPLAY, fontSize: 32, lineHeight: 1.05 }}>Confirma que trabalhas lá</h1>
          <p className="small muted" style={{ margin: 0 }}>
            Ganhas o selo Verificado em {org.name}. Leva um minuto.
          </p>
        </div>
        {already}
        {tabs}
        {panel}
        <div className="row small body" style={{ gap: 10, paddingTop: 16, borderTop: '1px solid var(--line)' }}>
          <Icon name="lock" size={16} style={{ flex: 'none' }} />
          O teu nome e email nunca ficam ligados à avaliação.
        </div>
        <div className="sticky-cta">
          <button type="button" className="btn btn-primary btn-block" style={{ height: 56 }} disabled={primaryDisabled} onClick={primary}>
            {primaryLabel}
          </button>
        </div>
      </div>
    </Shell>
  );
}
