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
export function errorText(e: unknown, fallback = 'Algo correu mal. Tenta outra vez.'): string {
  if (e instanceof ApiError) {
    if (e.status === 429) return 'Demasiadas tentativas. Espera uns minutos.';
    if (e.status === 401) return 'A sessão terminou. Entra outra vez.';
    const m = e.body?.message;
    if (typeof m === 'string') return m;
    if (Array.isArray(m)) return m.join(' ');
  }
  if (e instanceof TypeError) return 'Sem ligação ao servidor.';
  return fallback;
}
