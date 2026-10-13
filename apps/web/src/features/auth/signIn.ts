/** Decoração do ecrã de entrar (dados puros: testados sem React) */

/** Anéis decorativos: [x, y, tamanho, espessura, cor, opacidade] */
export type DecorRing = [number, number, number, number, string, number];

export const RINGS_MOBILE: DecorRing[] = [
  [30, 40, 70, 10, '#00A9AF', 1],
  [120, 10, 110, 14, '#FFFFFF', 1],
  [250, 60, 64, 9, '#00A9AF', 1],
  [300, -10, 40, 6, '#A7A9AC', 1],
  [190, 120, 44, 7, '#652D90', 1],
  [70, 130, 30, 5, '#A7A9AC', 1],
  [330, 110, 24, 5, '#FFFFFF', 1],
];
export const RINGS_DESKTOP: DecorRing[] = [
  [10, 4, 140, 16, '#00A9AF', 1],
  [52, 0, 210, 22, '#FFFFFF', 0.85],
  [78, 30, 80, 10, '#00A9AF', 1],
  [36, 52, 64, 9, '#652D90', 1],
  [8, 70, 48, 7, '#A7A9AC', 0.7],
  [66, 72, 110, 12, '#00A9AF', 0.9],
];

/** Variáveis CSS de um anel: posição em px (telemóvel) ou % (computador) e atraso da animação */
export function ringVars([x, y, size, border, color, opacity]: DecorRing, i: number, unit: 'px' | '%') {
  return { '--x': `${x}${unit}`, '--y': `${y}${unit}`, '--s': `${size}px`, '--b': `${border}px`, '--c': color, '--o': String(opacity), '--delay': `${(i * 0.8).toFixed(1)}s` };
}
