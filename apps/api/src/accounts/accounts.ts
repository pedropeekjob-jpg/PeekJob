/** Regras das contas das organizações (funções puras) */

/** Serviços de email gratuitos: não provam que se fala em nome da organização */
const PERSONAL_DOMAINS = new Set([
  'gmail.com', 'googlemail.com', 'hotmail.com', 'hotmail.pt', 'outlook.com', 'outlook.pt', 'live.com', 'live.com.pt', 'msn.com',
  'yahoo.com', 'yahoo.com.br', 'icloud.com', 'me.com', 'mac.com', 'sapo.pt', 'iol.pt', 'clix.pt', 'netcabo.pt', 'mail.telepac.pt',
  'proton.me', 'protonmail.com', 'gmx.com', 'gmx.net', 'aol.com', 'zoho.com', 'yandex.com',
]);

export const emailDomain = (email: string) => email.trim().toLowerCase().split('@')[1] ?? '';
export const isPersonalDomain = (domain: string) => PERSONAL_DOMAINS.has(domain.toLowerCase());

export interface TagCount {
  label: string;
  n: number;
  up: boolean;
}

/** Etiquetas mais citadas no período, e se subiram em relação ao período anterior (as 6 primeiras) */
export function tagTrend(now: string[][], before: string[][], limit = 6): TagCount[] {
  const count = (rows: string[][]) => {
    const m = new Map<string, number>();
    for (const tags of rows) for (const t of tags) m.set(t, (m.get(t) ?? 0) + 1);
    return m;
  };
  const a = count(now);
  const b = count(before);
  return [...a.entries()]
    .sort((x, y) => y[1] - x[1] || x[0].localeCompare(y[0], 'pt'))
    .slice(0, limit)
    .map(([label, n]) => ({ label, n, up: n >= (b.get(label) ?? 0) }));
}

export const round1 = (v: number) => Math.round(v * 10) / 10;

export interface ScoredRow {
  scores: Record<string, number | undefined>;
  createdAt: Date;
}

/** Média de um critério (null sem notas) */
function criterionAvg(rows: ScoredRow[], k: string) {
  const v = rows.map((r) => r.scores[k]).filter((x): x is number => typeof x === 'number');
  return v.length ? v.reduce((a, b) => a + b, 0) / v.length : null;
}

/** Por critério: a média atual e quanto mudou face ao que havia antes de `since` (0 se não havia nada antes) */
export function criteriaTrend(rows: ScoredRow[], keys: readonly string[], since: Date) {
  const before = rows.filter((r) => r.createdAt < since);
  const out: Record<string, { now: number; delta: number }> = {};
  for (const k of keys) {
    const now = criterionAvg(rows, k);
    if (now == null) continue;
    const old = criterionAvg(before, k);
    out[k] = { now: round1(now), delta: old == null ? 0 : round1(now - old) };
  }
  return out;
}
