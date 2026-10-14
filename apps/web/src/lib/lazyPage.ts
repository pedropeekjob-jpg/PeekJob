import { lazy, type ComponentType } from 'react';

const RELOAD_KEY = 'pj-chunk-reload';

/**
 * Depois de uma publicação nova, as partes antigas da app deixam de existir no servidor.
 * Se uma falhar a carregar, recarrega a página uma vez (vem a versão nova); se voltar a falhar, o erro segue
 * para o ErrorBoundary ("Tentar outra vez").
 */
export function loadOrReload<T>(load: () => Promise<T>, storage: Pick<Storage, 'getItem' | 'setItem' | 'removeItem'> = sessionStorage, reload = () => location.reload()): Promise<T> {
  return load().then(
    (m) => {
      storage.removeItem(RELOAD_KEY);
      return m;
    },
    (err: unknown) => {
      if (storage.getItem(RELOAD_KEY)) throw err;
      storage.setItem(RELOAD_KEY, '1');
      reload();
      return new Promise<T>(() => {}); // a página vai recarregar
    },
  );
}

/** Página carregada só quando é aberta; `preload()` descarrega-a antes (ex.: quando a pessoa mostra intenção) */
export function lazyPage<P>(load: () => Promise<{ default: ComponentType<P> }>) {
  let pending: Promise<{ default: ComponentType<P> }> | null = null;
  const preload = () => (pending ??= loadOrReload(load));
  return Object.assign(lazy(preload), { preload });
}
