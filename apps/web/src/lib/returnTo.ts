/**
 * Para onde voltar depois de entrar (ex.: a meio de avaliar, "Entra para publicar").
 * O link de acesso chega por email e abre noutro separador sem o destino no endereço:
 * por isso o destino fica guardado neste browser durante a validade do link.
 */
const KEY = 'pj-next';
/** A validade do link de acesso (15 min) com margem */
export const NEXT_TTL_MS = 30 * 60 * 1000;

/** Só caminhos deste site ("/…"); nunca "//outro.site" nem "/\outro.site" (o browser trata-os como outro domínio) */
export function safeNext(to: string | null | undefined): string | null {
  return to && to.startsWith('/') && !to.startsWith('//') && !to.startsWith('/\\') ? to : null;
}

export function rememberNext(to: string | null | undefined) {
  const safe = safeNext(to);
  try {
    if (safe) localStorage.setItem(KEY, JSON.stringify({ to: safe, at: Date.now() }));
    else localStorage.removeItem(KEY);
  } catch {
    /* sem armazenamento (modo privado): entra na mesma, só não volta ao sítio */
  }
}

/** Lê e esquece o destino guardado (se ainda for válido) */
export function takeNext(): string | null {
  try {
    const raw = localStorage.getItem(KEY);
    localStorage.removeItem(KEY);
    if (!raw) return null;
    const { to, at } = JSON.parse(raw) as { to?: string; at?: number };
    return typeof at === 'number' && Date.now() - at <= NEXT_TTL_MS ? safeNext(to) : null;
  } catch {
    return null;
  }
}
