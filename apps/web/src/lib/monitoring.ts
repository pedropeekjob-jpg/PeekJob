import { API_URL, apiMode } from '../api/http';

export interface ClientErrorBody {
  message: string;
  type: string;
  stack?: string;
  path: string;
  release?: string;
}

const NOISE = [/ResizeObserver loop/i, /^Script error\.?$/i, /Non-Error promise rejection captured/i];
const FOREIGN = /(chrome|moz|safari(-web)?)-extension:\/\//;

/**
 * Prepara o envio de erros: só o caminho (sem query nem #), sem repetir o mesmo erro,
 * no máximo `max` por página e sem ruído (extensões, ResizeObserver, scripts de outros sites).
 * A API ainda retira dados pessoais antes de guardar ou enviar.
 */
export function createErrorSender(post: (body: ClientErrorBody) => void, opts: { release?: string; max?: number } = {}) {
  const seen = new Set<string>();
  const max = opts.max ?? 5;
  return (err: unknown, href: string) => {
    const e = err instanceof Error ? err : null;
    const message = (e?.message ?? String(err ?? '')).slice(0, 500);
    if (!message || NOISE.some((r) => r.test(message)) || (e?.stack && FOREIGN.test(e.stack))) return;
    const key = `${e?.name}:${message}`;
    if (seen.has(key) || seen.size >= max) return;
    seen.add(key);
    let path = '/';
    try {
      path = new URL(href).pathname;
    } catch {
      /* caminho desconhecido */
    }
    post({ message, type: (e?.name ?? 'Error').slice(0, 100), stack: e?.stack?.slice(0, 4000), path, release: opts.release });
  };
}

const release = (import.meta.env.VITE_APP_VERSION as string | undefined)?.slice(0, 7);
export const reportError = createErrorSender(
  (body) => {
    if (!apiMode) return; // na demonstração não há para onde enviar
    void fetch(`${API_URL}/client-errors`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body), keepalive: true }).catch(() => undefined);
  },
  { release },
);

/** Erros não apanhados e promessas rejeitadas */
export function installErrorReporting() {
  window.addEventListener('error', (ev) => reportError(ev.error ?? ev.message, location.href));
  window.addEventListener('unhandledrejection', (ev) => reportError(ev.reason, location.href));
}
