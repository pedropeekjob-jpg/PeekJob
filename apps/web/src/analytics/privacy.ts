/**
 * Regras de privacidade da medição.
 * A PeekJob é uma plataforma de avaliações anónimas: o Google nunca recebe ids, nomes de organizações
 * no fluxo de avaliar, textos, emails, NIF ou tokens. Só modelos de rota, contagens e categorias.
 */

export { routeTemplate } from '@peekjob/shared';

const FORBIDDEN_KEYS = new Set(['email', 'token', 'nif', 'text', 'org_id', 'org_name', 'name', 'code', 'user_id', 'review_id', 'location_id']);
const EMAIL = /@/;
const LONG_NUMBER = /\d{6,}/;
const TOKEN_LIKE = /[A-Za-z0-9_-]{32,}/;

export type Params = Record<string, string | number | boolean | undefined>;

/** Remove campos proibidos e valores com aspeto de dado pessoal */
export function scrubParams(params: Params): Record<string, string | number | boolean> {
  const out: Record<string, string | number | boolean> = {};
  for (const [k, v] of Object.entries(params)) {
    if (v === undefined || FORBIDDEN_KEYS.has(k)) continue;
    if (typeof v === 'string' && (EMAIL.test(v) || LONG_NUMBER.test(v) || TOKEN_LIKE.test(v))) continue;
    out[k] = v;
  }
  return out;
}

/** Termo de pesquisa pública, normalizado; nada se parecer um email ou um número (NIF, telefone) */
export function cleanSearchTerm(q: string): string | undefined {
  const t = q.trim().toLowerCase().replace(/\s+/g, ' ');
  if (t.length < 2 || EMAIL.test(t) || LONG_NUMBER.test(t)) return undefined;
  return t.slice(0, 50);
}

/** Tamanho do texto por escalões (nunca o texto) */
export function textLengthBucket(n: number): string {
  if (n <= 0) return '0';
  if (n < 100) return '1-99';
  if (n < 300) return '100-299';
  return '300+';
}
