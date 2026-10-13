import { useEffect, useRef, useState, type FormEvent } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { apiMode } from '../api/http';
import { Shell } from '../components/Layout';
import { Logo } from '../components/Brand';
import { Icon } from '../components/Icon';
import { useStore } from '../lib/store';
import { useIsDesktop } from '../lib/useMedia';
import { isEmailLike } from '../lib/validation';
import { tr } from '../i18n';

const DISPLAY = { fontFamily: 'var(--font-display)', fontWeight: 600, margin: 0 } as const;

// Anéis decorativos: [x, y, tamanho, espessura, cor, opacidade]
const RINGS_M: [number, number, number, number, string, number][] = [
  [30, 40, 70, 10, '#00A9AF', 1], [120, 10, 110, 14, '#FFFFFF', 1], [250, 60, 64, 9, '#00A9AF', 1], [300, -10, 40, 6, '#A7A9AC', 1],
  [190, 120, 44, 7, '#652D90', 1], [70, 130, 30, 5, '#A7A9AC', 1], [330, 110, 24, 5, '#FFFFFF', 1],
];
const RINGS_D: [number, number, number, number, string, number][] = [
  [10, 4, 140, 16, '#00A9AF', 1], [52, 0, 210, 22, '#FFFFFF', 0.85], [78, 30, 80, 10, '#00A9AF', 1],
  [36, 52, 64, 9, '#652D90', 1], [8, 70, 48, 7, '#A7A9AC', 0.7], [66, 72, 110, 12, '#00A9AF', 0.9],
];

export default function Entrar() {
  const desktop = useIsDesktop();
  const nav = useNavigate();
  const { user, login, requestLink, verifyLink, onboarded } = useStore();
  const [params] = useSearchParams();
  const token = params.get('token');
  const [linkState, setLinkState] = useState<'idle' | 'checking' | 'error'>(token && apiMode ? 'checking' : 'idle');
  const [busy, setBusy] = useState(false);
  const tried = useRef(false);

  // Modo API: a pessoa chega aqui pelo link do email (#/entrar?token=...)
  useEffect(() => {
    if (!apiMode || !token || tried.current) return;
    tried.current = true;
    verifyLink(token).then((r) => {
      if (r.ok) nav(onboarded ? '/explorar' : '/preferencias', { replace: true });
      else setLinkState('error');
    });
  }, [token, verifyLink, nav, onboarded]);
  const [email, setEmail] = useState(user?.email ?? '');
  const [sent, setSent] = useState(false);
  const [error, setError] = useState('');

  const send = async (e: FormEvent) => {
    e.preventDefault();
    if (!isEmailLike(email)) {
      setError(tr('Escreve um email válido, por exemplo nome@gmail.com.', 'Enter a valid email, for example name@gmail.com.'));
      return;
    }
    setError('');
    if (apiMode) {
      setBusy(true);
      const r = await requestLink(email.trim());
      setBusy(false);
      if (!r.ok) {
        setError(r.message);
        return;
      }
    }
    setSent(true);
  };
  const open = () => {
    login(email.trim());
    nav('/preferencias');
  };

  if (linkState !== 'idle') {
    return (
      <Shell chrome="none">
        <div className="page no-nav" style={{ minHeight: '100dvh', justifyContent: 'center', alignItems: 'flex-start' }}>
          <Logo height={48} />
          {linkState === 'checking' ? (
            <p className="lead" role="status">{tr('A entrar…', 'Signing in…')}</p>
          ) : (
            <div className="stack" style={{ gap: 12 }} role="alert">
              <h1 style={{ ...DISPLAY, fontSize: 30 }}>{tr('Este link já não funciona.', 'This link no longer works.')}</h1>
              <p className="lead">{tr('Os links valem 15 minutos e só podem ser usados uma vez.', 'Links last 15 minutes and can only be used once.')}</p>
              <Link to="/entrar" className="btn btn-primary" onClick={() => setLinkState('idle')}>
                {tr('Pedir um novo link', 'Ask for a new link')}
              </Link>
            </div>
          )}
        </div>
      </Shell>
    );
  }

  const rings = (list: typeof RINGS_M, pct: boolean) =>
    list.map(([x, y, s, b, c, o], i) => (
      <div
        key={i}
        className="float"
        style={{
          position: 'absolute', left: pct ? `${x}%` : x, top: pct ? `${y}%` : y, width: s, height: s, borderRadius: '50%',
          border: `${b}px solid ${c}`, opacity: o, animationDelay: `${(i * 0.8).toFixed(1)}s`,
        }}
      />
    ));

  const form = (
    <form className="stack fade-up" style={{ gap: desktop ? 24 : 20, flex: desktop ? undefined : 1 }} onSubmit={send} noValidate>
      {desktop ? (
        <div className="stack" style={{ gap: 10 }}>
          <h1 style={{ ...DISPLAY, fontSize: 40, lineHeight: 1 }}>{tr('Entrar', 'Sign in')}</h1>
          <p className="lead" style={{ fontSize: 16 }}>
            {tr('Sem palavra-passe. Enviamos-te um link de acesso.', 'No password. We’ll send you a sign-in link.')}
          </p>
        </div>
      ) : (
        <h1 style={{ ...DISPLAY, fontSize: 32, lineHeight: 1.05 }}>{tr('Como é trabalhar lá dentro, contado por quem sabe.', 'What it’s like to work there, from people who know.')}</h1>
      )}
      <div className="field">
        <label htmlFor="le" style={desktop ? { fontSize: 15 } : { fontSize: 13, fontWeight: 500, color: 'var(--body)' }}>
          {tr('O teu email', 'Your email')}
        </label>
        <input
          className="input"
          id="le"
          type="email"
          autoComplete="email"
          inputMode="email"
          value={email}
          placeholder={tr('nome@gmail.com', 'name@gmail.com')}
          aria-invalid={!!error}
          aria-describedby={error ? 'le-err' : undefined}
          onChange={(e) => setEmail(e.target.value)}
          style={{ height: desktop ? 56 : 54, borderRadius: 16 }}
        />
        {error && (
          <span id="le-err" role="alert" style={{ fontSize: 13, color: 'var(--warn-text)' }}>
            {error}
          </span>
        )}
      </div>
      {desktop ? (
        <>
          <button type="submit" className="btn btn-primary btn-block lift" style={{ height: 56 }} disabled={busy}>
            {tr('Receber link de acesso', 'Get sign-in link')}
          </button>
          <span className="row small muted" style={{ gap: 8 }}>
            <Icon name="lock" size={14} />
            {tr('O teu email nunca aparece nas avaliações.', 'Your email never appears in reviews.')}
          </span>
        </>
      ) : (
        <>
          <div className="small muted">{tr('Sem palavra-passe nem nome. Enviamos-te um link.', 'No password, no name. We’ll send you a link.')}</div>
          <button type="submit" className="btn btn-primary btn-block" style={{ height: 56, marginTop: "auto" }} disabled={busy}>
            {tr('Receber link de acesso', 'Get sign-in link')}
          </button>
        </>
      )}
    </form>
  );

  const sentBlock = (
    <div className="stack fade-up" style={{ gap: desktop ? 24 : 12 }}>
      {desktop && (
        <div aria-hidden="true" style={{ width: 72, height: 72, borderRadius: '50%', border: '8px solid var(--teal)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Icon name="mail" size={24} stroke={2} />
        </div>
      )}
      <div className="stack" style={{ gap: desktop ? 10 : 12 }}>
        <h1 style={{ ...DISPLAY, fontSize: desktop ? 40 : 32, lineHeight: desktop ? 1 : 1.05 }}>{tr('Vê o teu email.', 'Check your email.')}</h1>
        <p className="lead" role="status" style={{ fontSize: desktop ? 16 : 15 }}>
          {desktop ? tr('Link enviado para ', 'Link sent to ') : tr('Enviámos um link para ', 'We sent a link to ')}
          <strong style={{ color: 'var(--ink)' }}>{email.trim()}</strong>. {desktop ? tr('Válido 15 minutos.', 'Valid for 15 minutes.') : tr('Vale 15 minutos.', 'Lasts 15 minutes.')}
        </p>
      </div>
      {desktop && !apiMode && (
        <button type="button" className="btn btn-dark btn-block lift" style={{ height: 56 }} onClick={open}>
          {tr('Abri o link · continuar', 'I opened the link · continue')}
        </button>
      )}
      {apiMode && <p className="small muted">{tr('Abre o link nesse email para entrar. Podes fechar esta página.', 'Open the link in that email to sign in. You can close this page.')}</p>}
      <button type="button" className="link" style={{ alignSelf: 'flex-start', fontSize: desktop ? 15 : 14 }} onClick={() => setSent(false)}>
        {tr('Usar outro email', 'Use another email')}
      </button>
    </div>
  );

  const explore = (
    <Link to="/" className="link" style={{ alignSelf: 'center', color: 'var(--body)', fontSize: desktop ? 15 : 14, fontWeight: desktop ? 600 : 500 }}>
      {tr('Explorar sem conta', 'Explore without an account')}
    </Link>
  );

  /* ---------- Desktop ---------- */
  if (desktop) {
    return (
      <Shell chrome="none">
        <div className="row wrap" style={{ minHeight: '100vh', alignItems: 'stretch' }}>
          <div className="stack between" style={{ position: 'relative', overflow: 'hidden', flex: '1 1 520px', minHeight: '100vh', background: 'var(--ink)', color: '#fff', padding: '40px clamp(24px, 4vw, 64px)' }}>
            <Link to="/" aria-label={tr('PeekJob, início', 'PeekJob, home')} style={{ position: 'relative', zIndex: 1, alignSelf: 'flex-start' }}>
              <Logo height={72} dark />
            </Link>
            <div aria-hidden="true" style={{ position: 'absolute', inset: '150px 0 220px 0' }}>
              {rings(RINGS_D, true)}
            </div>
            <p style={{ position: 'relative', zIndex: 1, ...DISPLAY, maxWidth: 480, fontSize: 40, lineHeight: 1.08 }}>{tr('Como é trabalhar lá dentro, contado por quem sabe.', 'What it’s like to work there, from people who know.')}</p>
          </div>
          <div className="row" style={{ flex: '1 1 480px', minHeight: '100vh', justifyContent: 'center', padding: '48px clamp(16px, 4vw, 64px)' }}>
            <div className="stack" style={{ width: '100%', maxWidth: 420, gap: 32 }}>
              {sent ? sentBlock : form}
              {explore}
            </div>
          </div>
        </div>
      </Shell>
    );
  }

  /* ---------- Mobile ---------- */
  return (
    <Shell chrome="none">
      <div className="stack" style={{ minHeight: '100dvh', background: 'var(--ink)' }}>
        <div style={{ position: 'relative', height: 300, padding: '28px 24px 0', overflow: 'hidden' }}>
          <Link to="/" aria-label={tr('PeekJob, início', 'PeekJob, home')} style={{ display: 'inline-block' }}>
            <Logo height={64} dark />
          </Link>
          <div aria-hidden="true" style={{ position: 'absolute', left: '50%', width: 390, marginLeft: -195, top: 110, bottom: 0 }}>
            {rings(RINGS_M, false)}
          </div>
        </div>
        <div className="stack" style={{ flex: 1, position: 'relative', background: 'var(--ground)', borderRadius: '30px 30px 0 0', padding: '32px 20px 22px', gap: 24 }}>
          <div className="stack" style={{ flex: 1, gap: 4, width: '100%', maxWidth: 520, margin: '0 auto' }}>
            {sent ? (
              <>
                {sentBlock}
                {!apiMode && (
                  <button type="button" className="btn btn-dark btn-block" style={{ height: 56, marginTop: 'auto' }} onClick={open}>
                    {tr('Abri o link · continuar', 'I opened the link · continue')}
                  </button>
                )}
              </>
            ) : (
              <div className="stack" style={{ flex: 1 }}>
                {form}
              </div>
            )}
            {explore}
          </div>
        </div>
      </div>
    </Shell>
  );
}
