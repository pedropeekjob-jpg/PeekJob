import { getLang, tr } from '../i18n';

/**
 * Cliente HTTP da API. Ativo quando VITE_API_URL está definido;
 * sem ele a web corre em modo demonstração (dados de exemplo no browser).
 * VITE_API_URL=/ → a API está na mesma origem (produção: a API serve a web).
 */
const RAW_API_URL = (import.meta.env.VITE_API_URL as string | undefined)?.trim();
export const apiMode = !!RAW_API_URL;
export const API_URL = (RAW_API_URL ?? '').replace(/\/$/, '');

export class ApiError extends Error {
  constructor(
    public readonly status: number,
    public readonly body: Record<string, any> | null,
  ) {
    super((body?.message as string) ?? `Erro ${status}`);
  }
}

export async function api<T = unknown>(path: string, opts: { method?: string; body?: unknown; form?: FormData } = {}): Promise<T> {
  const res = await fetch(`${API_URL}${path}`, {
    method: opts.method ?? (opts.body || opts.form ? 'POST' : 'GET'),
    credentials: 'include',
    headers: opts.body ? { 'content-type': 'application/json' } : undefined,
    body: opts.form ?? (opts.body ? JSON.stringify(opts.body) : undefined),
  });
  if (res.status === 204) return undefined as T;
  const data = await res.json().catch(() => null);
  if (!res.ok) throw new ApiError(res.status, data);
  return data as T;
}

/** Mensagem legível para um erro da API */
export function errorText(e: unknown, fallback = tr('Algo correu mal. Tenta outra vez.', 'Something went wrong. Please try again.')): string {
  if (e instanceof ApiError) {
    if (e.status === 429) return tr('Demasiadas tentativas. Espera uns minutos.', 'Too many attempts. Please wait a few minutes.');
    if (e.status === 401) return tr('A sessão terminou. Entra outra vez.', 'Your session has ended. Please sign in again.');
    if (e.status === 503) return tr('Não foi possível enviar o email. Tenta outra vez daqui a pouco.', 'We couldn’t send the email. Please try again shortly.');
    // As mensagens da API estão em português; em inglês usa-se uma mensagem geral
    if (getLang() === 'en') return fallback;
    const m = e.body?.message;
    if (typeof m === 'string') return m;
    if (Array.isArray(m)) return m.join(' ');
  }
  if (e instanceof TypeError) return tr('Sem ligação ao servidor.', 'No connection to the server.');
  return fallback;
}
