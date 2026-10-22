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

/** Destino de "onde trabalhas?": a escolha da organização para avaliar, com a pesquisa já escrita */
export function reviewHref(q: string) {
  const t = q.trim();
  return t ? `/avaliar?${new URLSearchParams({ q: t })}` : '/avaliar';
}

/** Uma tecla que escreve (letra ou número, sem atalhos): nas duas zonas abre a pesquisa com ela */
export const isTypingKey = (e: { key: string; ctrlKey: boolean; metaKey: boolean; altKey: boolean }) =>
  e.key.length === 1 && /[\p{L}\p{N}]/u.test(e.key) && !e.ctrlKey && !e.metaKey && !e.altKey;

type Box = { left: number; top: number; right: number; bottom: number };
const hits = (a: Box, b: Box) => a.left < b.right && a.right > b.left && a.top < b.bottom && a.bottom > b.top;

/**
 * Onde pôr a etiqueta que segue o rato (22/10): junto ao cursor, dentro da zona e nunca por cima do logo.
 * Tenta os quatro cantos do cursor (primeiro em baixo à direita); se nenhum serve, afasta-a do logo na vertical.
 * Tudo em coordenadas da zona; devolve o canto superior esquerdo da etiqueta.
 */
export function cursorLabelSpot(
  cursor: { x: number; y: number },
  size: { w: number; h: number },
  zone: { w: number; h: number },
  avoid: Box | null,
  gap = 18,
) {
  const inZone = (b: Box) => b.left >= 0 && b.top >= 0 && b.right <= zone.w && b.bottom <= zone.h;
  const boxAt = (left: number, top: number): Box => ({ left, top, right: left + size.w, bottom: top + size.h });
  // o logo com uma margem à volta: a etiqueta não lhe pode tocar
  const keep = avoid && { left: avoid.left - gap, top: avoid.top - gap, right: avoid.right + gap, bottom: avoid.bottom + gap };
  const xs = [cursor.x + gap, cursor.x - gap - size.w];
  const ys = [cursor.y + gap, cursor.y - gap - size.h];
  for (const top of ys)
    for (const left of xs) {
      const b = boxAt(left, top);
      if (inZone(b) && !(keep && hits(b, keep))) return { x: left, y: top };
    }
  // nenhum canto serve: fica no canto de baixo à direita, encostada à zona, e sai da frente do logo (para cima ou para baixo)
  const clamp = (v: number, max: number) => Math.min(Math.max(v, 0), Math.max(max, 0));
  const x = clamp(xs[0], zone.w - size.w);
  let y = clamp(ys[0], zone.h - size.h);
  if (keep && hits(boxAt(x, y), keep)) {
    const above = keep.top - size.h;
    const below = keep.bottom;
    y = above >= 0 && (below + size.h > zone.h || cursor.y < (keep.top + keep.bottom) / 2) ? above : below;
  }
  return { x, y };
}
