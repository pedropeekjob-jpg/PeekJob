import { Fragment, useSyncExternalStore, type ReactNode } from 'react';

/**
 * Idiomas: português (por omissão) e inglês (UK).
 *
 * Uso: tr('Texto em português', 'Text in English') — em qualquer componente ou função.
 * Os textos ficam lado a lado no código: fácil de rever e impossível esquecer uma tradução.
 * Mudar de idioma volta a montar a interface (o estado da app vive no store e mantém-se).
 *
 * Conteúdo escrito por pessoas (avaliações, nomes) fica no idioma em que foi escrito.
 */
export type Lang = 'pt' | 'en';
export const LANGS: Lang[] = ['pt', 'en'];
const KEY = 'peekjob-lang';

function fromUrl(): Lang | null {
  // ?lang=en no caminho ou, na demo (HashRouter), dentro do #
  const q = new URLSearchParams(location.search).get('lang') ?? new URLSearchParams(location.hash.split('?')[1] ?? '').get('lang');
  return q === 'en' || q === 'pt' ? q : null;
}

function initial(): Lang {
  const url = fromUrl();
  if (url) {
    save(url);
    return url;
  }
  try {
    const v = localStorage.getItem(KEY);
    if (v === 'en' || v === 'pt') return v;
  } catch {
    /* sem storage */
  }
  return 'pt';
}

function save(l: Lang) {
  try {
    localStorage.setItem(KEY, l);
  } catch {
    /* sem storage */
  }
}

let current: Lang = typeof window === 'undefined' ? 'pt' : initial();
const listeners = new Set<() => void>();

function applyDocument() {
  if (typeof document !== 'undefined') document.documentElement.lang = current === 'en' ? 'en-GB' : 'pt-PT';
}
applyDocument();

export const getLang = () => current;
/** Locale para Intl (datas, números) */
export const locale = () => (current === 'en' ? 'en-GB' : 'pt-PT');

export function setLang(l: Lang) {
  if (l === current) return;
  current = l;
  save(l);
  applyDocument();
  // Mantém o ?lang no endereço coerente (partilhar um link mantém o idioma)
  const url = new URL(location.href);
  if (url.searchParams.has('lang')) {
    if (l === 'pt') url.searchParams.delete('lang');
    else url.searchParams.set('lang', l);
    history.replaceState(history.state, '', url);
  }
  listeners.forEach((f) => f());
}

export function subscribeLang(fn: () => void) {
  listeners.add(fn);
  return () => void listeners.delete(fn);
}

/** Texto no idioma atual. Também serve para JSX: tr(<>Olá <b>tu</b></>, <>Hi <b>you</b></>) */
export function tr<T>(pt: T, en: T): T {
  return current === 'en' ? en : pt;
}

export function useLang(): Lang {
  return useSyncExternalStore(subscribeLang, getLang, getLang);
}

/** Volta a montar a interface quando o idioma muda */
export function LangRoot({ children }: { children: ReactNode }) {
  const lang = useLang();
  return <Fragment key={lang}>{children}</Fragment>;
}

/** Seletor PT · EN */
export function LangSwitch({ className, style }: { className?: string; style?: React.CSSProperties }) {
  const lang = useLang();
  return (
    <div role="group" aria-label={tr('Idioma', 'Language')} className={'lang-switch' + (className ? ` ${className}` : '')} style={style}>
      {LANGS.map((l) => (
        <button
          key={l}
          type="button"
          lang={l === 'en' ? 'en' : 'pt'}
          aria-pressed={lang === l}
          aria-label={l === 'en' ? 'English' : 'Português'}
          data-ev="nav_click"
          data-ev-area="lang"
          data-ev-item={l}
          onClick={() => setLang(l)}
        >
          {l.toUpperCase()}
        </button>
      ))}
    </div>
  );
}
