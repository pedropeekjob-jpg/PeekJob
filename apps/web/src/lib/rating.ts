import { tr } from '../i18n';
import { deg, fmt } from './format';

/** Regras de apresentação de notas (anéis e bolinhas) — funções puras */

export type DotFill = 'full' | 'half' | 'empty' | 'none';

/** Preenchimento da bolinha k (0–4) para uma nota de 0 a 5; null = sem dados */
export function dotFill(value: number | null, k: number): DotFill {
  if (value == null) return 'none';
  if (value >= k + 0.75) return 'full';
  if (value >= k + 0.25) return 'half';
  return 'empty';
}

/** Ângulo preenchido de um anel: nota de 0 a 5 ou percentagem */
export const ringDeg = (value: number, pct: boolean) => (pct ? Math.round((value / 100) * 360) : deg(value));

/** Texto dentro do anel */
export function ringText(value: number, { label, muted, pct }: { label?: string; muted: boolean; pct: boolean }) {
  if (label != null) return label;
  if (muted) return '—';
  return pct ? `${Math.round(value)}%` : fmt(value);
}

/** Nome acessível do anel */
export function ringAria(value: number, { muted, pct }: { muted: boolean; pct: boolean }) {
  if (muted) return tr('Ainda sem nota', 'No score yet');
  return pct ? `${Math.round(value)}%` : tr(`Nota ${fmt(value)} de 5`, `Score ${fmt(value)} out of 5`);
}
