/** Regras da página inicial em dois passos (funções puras: testadas sem React) */

/** peek = espreitar organizações (em cima); job = o teu trabalho, avaliar (em baixo) */
export type Zone = 'peek' | 'job';

/** A zona aberta vive no endereço (?lado=): o "voltar" do browser fecha-a e a ligação pode partilhar-se */
export const ZONE_PARAM = 'lado';
const PARAM: Record<Zone, string> = { peek: 'espreitar', job: 'avaliar' };

export const zoneParam = (z: Zone) => PARAM[z];
export function zoneFromParam(v: string | null): Zone | null {
  if (v === PARAM.peek) return 'peek';
  if (v === PARAM.job) return 'job';
  return null;
}

/** Destino da pesquisa (sem termo vai para a pesquisa vazia) */
export function searchHref(q: string) {
  const t = q.trim();
  return t ? `/pesquisa?${new URLSearchParams({ q: t })}` : '/pesquisa';
}

/** Uma tecla que escreve (letra ou número, sem atalhos): nas duas zonas abre a pesquisa com ela */
export const isTypingKey = (e: { key: string; ctrlKey: boolean; metaKey: boolean; altKey: boolean }) =>
  e.key.length === 1 && /[\p{L}\p{N}]/u.test(e.key) && !e.ctrlKey && !e.metaKey && !e.altKey;
