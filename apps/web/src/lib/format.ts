import { getLang, locale, tr } from '../i18n';

/** 4.4 → "4,4" (pt) ou "4.4" (en) */
export const fmt = (v: number) => (getLang() === 'en' ? v.toFixed(1) : v.toFixed(1).replace('.', ','));
/** nota 0–5 → graus do anel */
export const deg = (v: number) => Math.round((v / 5) * 360);
export const signed = (v: number) => (v > 0 ? '+' : v < 0 ? '−' : '') + fmt(Math.abs(v));
export const euros = (v: number) => (getLang() === 'en' ? `€${v.toLocaleString('en-GB')}` : `${v.toLocaleString('pt-PT')} €`);
/** Plural simples: plural(3, 'avaliação', 'avaliações') — passar as palavras já no idioma certo (tr) */
export const plural = (n: number, one: string, many: string) => `${n.toLocaleString(locale())} ${n === 1 ? one : many}`;
/** Data relativa ("há 3 dias" / "3 days ago") */
export const ago = (days: number) => {
  if (days <= 0) return tr('hoje', 'today');
  if (days === 1) return tr('ontem', 'yesterday');
  if (days < 30) return tr(`há ${days} dias`, `${days} days ago`);
  if (days < 365) {
    const m = Math.round(days / 30);
    return tr(m === 1 ? 'há 1 mês' : `há ${m} meses`, m === 1 ? '1 month ago' : `${m} months ago`);
  }
  const y = Math.round(days / 365);
  return tr(y === 1 ? 'há 1 ano' : `há ${y} anos`, y === 1 ? '1 year ago' : `${y} years ago`);
};
