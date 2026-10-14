import type { Org } from '../data/orgs';

/** A função `api` (injetada, para se poder testar sem rede) */
export type Call = <T>(path: string, opts?: { method?: string; body?: unknown }) => Promise<T>;

export interface Engagement {
  saved: string[];
  useful: Record<string, boolean>;
}

const asMap = (ids: string[]) => Object.fromEntries(ids.map((id) => [id, true])) as Record<string, boolean>;

/** Com sessão, ao abrir a app: a conta manda (o que foi tirado noutro aparelho não volta do browser) */
export async function loadEngagement(call: Call): Promise<Engagement> {
  const [saved, helpful] = await Promise.all([call<{ items: string[] }>('/me/saved'), call<{ items: string[] }>('/me/helpful')]);
  return { saved: saved.items, useful: asMap(helpful.items) };
}

/**
 * Ao entrar: o que foi guardado ou marcado como útil sem sessão junta-se à conta.
 * Os "úteis" recusados (ex.: a própria avaliação) ficam de fora. `pushed`: os que passaram a contar no servidor.
 */
export async function syncOnLogin(call: Call, local: Engagement): Promise<Engagement & { pushed: string[] }> {
  const saved = local.saved.length ? (await call<{ items: string[] }>('/me/saved/merge', { body: { ids: local.saved } })).items : (await call<{ items: string[] }>('/me/saved')).items;
  const pushed: string[] = [];
  for (const id of Object.keys(local.useful).filter((k) => local.useful[k])) {
    try {
      await call(`/reviews/${id}/helpful`, { method: 'PUT' });
      pushed.push(id);
    } catch {
      /* recusado: não conta */
    }
  }
  const helpful = (await call<{ items: string[] }>('/me/helpful')).items;
  return { saved, useful: asMap(helpful), pushed };
}

/** Quantas pessoas acharam útil: com conta a contagem do servidor já inclui o meu; sem conta soma-se aqui */
export const helpfulShown = (base: number, on: boolean, synced: boolean) => (synced ? base : base + (on ? 1 : 0));

/** Ajusta a contagem de uma avaliação nas organizações já carregadas (as outras ficam iguais) */
export function bumpHelpful(details: Record<string, Org>, reviewId: string, delta: number): Record<string, Org> {
  const next: Record<string, Org> = {};
  for (const [id, org] of Object.entries(details)) {
    next[id] = org.reviews.some((r) => r.id === reviewId)
      ? { ...org, reviews: org.reviews.map((r) => (r.id === reviewId ? { ...r, useful: Math.max(0, r.useful + delta) } : r)) }
      : org;
  }
  return next;
}
