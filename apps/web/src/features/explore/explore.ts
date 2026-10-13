import { CRITERION, type CriterionKey } from '../../data/criteria';
import type { Org } from '../../data/orgs';
import { tr } from '../../i18n';
import { tagLabel } from '../../i18n/labels';
import { fmt } from '../../lib/format';

/** Regras e textos do início (funções puras: testadas sem React) */

export type Ranked = { org: Org; match: number };

/** Sem prioridades escolhidas, ordena pela nota (a % passa a ser a nota em percentagem) */
export function forYou(ranked: Ranked[], hasPrefs: boolean): Ranked[] {
  if (hasPrefs) return ranked;
  return ranked.map(({ org }) => ({ org, match: Math.round((org.score / 5) * 100) })).sort((a, b) => b.match - a.match);
}

const trendNum = (o: Org) => (typeof o.trend === 'number' ? o.trend : 0);

/** Quem mais mexeu na nota esta semana: subidas primeiro (maior primeiro, depois quem mais subiu no ranking), depois descidas */
export function movers(orgs: Org[]) {
  const moved = orgs.filter((o) => o.reviewsCount > 0 && o.weekDelta !== 0);
  return {
    ups: moved.filter((o) => o.weekDelta > 0).sort((a, b) => b.weekDelta - a.weekDelta || trendNum(b) - trendNum(a)),
    downs: moved.filter((o) => o.weekDelta < 0).sort((a, b) => a.weekDelta - b.weekDelta),
  };
}

export const deltaText = (o: Org) => `${o.weekDelta > 0 ? '▲' : '▼'} ${fmt(Math.abs(o.weekDelta))}`;

/** Duas subidas por cada descida, enquanto houver das duas */
export function mixMovers(ups: Org[], downs: Org[]): Org[] {
  const out: Org[] = [];
  for (let i = 0, u = 0, d = 0; i < ups.length + downs.length; i++) {
    if ((i % 3 === 2 && d < downs.length) || u >= ups.length) out.push(downs[d++]);
    else out.push(ups[u++]);
  }
  return out;
}

export interface Tick {
  key: string;
  label: string;
  d: string;
  up: boolean;
  to?: string;
}

/** Fita do pulso (computador): organizações que mexeram e temas da semana */
export function pulseTicks(ups: Org[], downs: Org[], tags: { label: string; n: number; up: boolean }[]): Tick[] {
  return [
    ...mixMovers(ups, downs).map((o) => ({ key: o.id, label: o.name, d: deltaText(o), up: o.weekDelta > 0, to: `/org/${o.id}` })),
    ...tags.map((t) => ({ key: 'tag-' + t.label, label: tr(`«${t.label}» em avaliações`, `«${tagLabel(t.label)}» in reviews`), d: `${t.up ? '▲' : '▼'} ${t.n}`, up: t.up })),
  ];
}

/** Até 3 prioridades */
export const MAX_PREFS = 3;

export function prefsStatus(n: number) {
  if (n === 0) return tr('Sem escolhas: ordenado pela nota', 'Nothing picked: sorted by score');
  if (n === MAX_PREFS) return tr('3 de 3 · clica de novo para tirar', '3 of 3 · click again to remove');
  return tr(`${n} de 3`, `${n} of 3`);
}

export function prefsLine(prefs: CriterionKey[]) {
  if (!prefs.length) return tr('Sem prioridades: ordenado pela nota', 'No priorities: sorted by score');
  const names = prefs.map((k) => CRITERION[k].short).join(', ');
  return tr(`Pela tua ordem: ${names}`, `In your order: ${names}`);
}

/** Anéis decorativos do topo (computador): organização, valor mostrado, tamanho e posição */
export const STARS: { id: string; label?: () => string; value: (o: Org) => number; size: number; x: string; y: string; delay: string; purple?: boolean }[] = [
  { id: 'padaria-ribeira', value: (o) => o.score, size: 168, x: '24%', y: '10%', delay: '0s' },
  { id: 'padaria-ribeira', label: () => tr('Respeito e inclusão', 'Respect and inclusion'), value: (o) => o.scores.respeito ?? 0, size: 104, x: '64%', y: '2%', delay: '-1.4s', purple: true },
  { id: 'maos-dadas', value: (o) => o.score, size: 116, x: '56%', y: '46%', delay: '-3s' },
  { id: 'rede-vizinha', value: (o) => o.score, size: 90, x: '6%', y: '58%', delay: '-4.2s' },
  { id: 'estudio-lume', value: (o) => o.score, size: 70, x: '32%', y: '70%', delay: '-2.1s' },
];

export const promises = () => [
  { purple: false, t: tr('Ninguém paga para subir', 'No one pays to rank higher'), d: tr('nem para esconder avaliações.', 'or to hide reviews.') },
  { purple: false, t: tr('Verificação anónima', 'Anonymous verification'), d: tr('confirmamos sem guardar o teu nome.', 'we confirm without keeping your name.') },
  { purple: true, t: tr('Sem insultos', 'No insults'), d: tr('críticas duras sim, ataques a pessoas não.', 'tough criticism yes, personal attacks no.') },
];
