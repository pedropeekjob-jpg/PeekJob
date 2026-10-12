/** 4.4 → "4,4" */
export const fmt = (v: number) => v.toFixed(1).replace('.', ',');
/** nota 0–5 → graus do anel */
export const deg = (v: number) => Math.round((v / 5) * 360);
export const signed = (v: number) => (v > 0 ? '+' : v < 0 ? '−' : '') + fmt(Math.abs(v));
export const euros = (v: number) => v.toLocaleString('pt-PT') + ' €';
/** pt-PT plural simples */
export const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`;
