import { useCallback, useEffect, useRef, useState, type FormEvent } from 'react';
import { useLocation, useNavigate, useSearchParams } from 'react-router';
import { apiMode } from '../../api/http';
import { tr } from '../../i18n';
import { useStore } from '../../lib/store';
import { rememberNext, safeNext, takeNext } from '../../lib/returnTo';
import { isEmailLike } from '../../lib/validation';

export type LinkState = 'idle' | 'checking' | 'error';

/**
 * Modo API: a pessoa chega a /entrar?token=… pelo link do email.
 * Valida o token uma só vez e segue para onde estava (ex.: as notas, se entrou a meio de avaliar),
 * ou então para as preferências (primeira vez) ou para explorar.
 */
export function useMagicLink(token: string | null) {
  const nav = useNavigate();
  const { verifyLink, onboarded } = useStore();
  const [state, setState] = useState<LinkState>(token && apiMode ? 'checking' : 'idle');
  const tried = useRef(false);

  useEffect(() => {
    if (!apiMode || !token || tried.current) return;
    tried.current = true;
    void verifyLink(token).then((r) => {
      if (r.ok) nav(takeNext() ?? (onboarded ? '/explorar' : '/preferencias'), { replace: true });
      else setState('error');
    });
  }, [token, verifyLink, nav, onboarded]);

  const reset = useCallback(() => setState('idle'), []);
  return { state, reset };
}

/** Pedir o link de acesso por email (na demonstração, "abri o link" entra logo) */
export function useSignIn() {
  const nav = useNavigate();
  const [params] = useSearchParams();
  const { state, key } = useLocation();
  const next = safeNext(params.get('next'));
  // aberto a partir do fluxo de avaliar neste separador: depois de entrar recua até lá (sem repetir ecrãs)
  const backToFlow = !!(state as { backToFlow?: boolean } | null)?.backToFlow && key !== 'default';
  const { user, login, requestLink } = useStore();
  const [email, setEmail] = useState(user?.email ?? '');
  const [sent, setSent] = useState(false);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const send = async (e: FormEvent) => {
    e.preventDefault();
    if (!isEmailLike(email)) {
      setError(tr('Escreve um email válido, por exemplo nome@gmail.com.', 'Enter a valid email, for example name@gmail.com.'));
      return;
    }
    setError('');
    if (apiMode) {
      setBusy(true);
      rememberNext(next);
      const r = await requestLink(email.trim());
      setBusy(false);
      if (!r.ok) {
        setError(r.message);
        return;
      }
    }
    setSent(true);
  };

  const openDemoLink = useCallback(() => {
    login(email.trim());
    if (next && backToFlow) nav(-1);
    else if (next) nav(next, { replace: true });
    else nav('/preferencias');
  }, [login, email, nav, next, backToFlow]);

  const changeEmail = useCallback(() => setSent(false), []);

  return { email, shownEmail: email.trim(), setEmail, sent, error, busy, send, openDemoLink, changeEmail };
}

export type SignIn = ReturnType<typeof useSignIn>;
