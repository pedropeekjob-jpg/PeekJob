import { CRITERIA, DEFAULT_PREFS, type CriterionKey } from '../../data/criteria';
import { ORG_BY_ID, type Org, type Review } from '../../data/orgs';
import { tr } from '../../i18n';
import { fmt } from '../../lib/format';

/** Dados e regras do painel da organização (funções puras: testadas sem React) */

/** Painel de demonstração: a organização com sessão é a Padaria Ribeira */
export const PAINEL_ORG = ORG_BY_ID['padaria-ribeira'];

/** Exemplo: variação de cada critério face à semana passada (só no POC) */
export const WEEK_DELTA: Record<CriterionKey, number> = {
  respeito: 0.1,
  salario: 0.1,
  equilibrio: 0,
  ambiente: 0,
  lideranca: -0.1,
  estabilidade: 0,
  progressao: 0.2,
  proposito: -0.1,
};

/** Exemplo: sugestões de resposta pré-preenchidas (a organização edita antes de publicar) */
export const SUGGESTED: Record<string, string> = {
  r1: 'Obrigado pelas palavras. Vamos rever os prémios de fim de ano com a equipa.',
  r2: 'Obrigado! Estamos a criar um plano de formação em pastelaria para quem quiser crescer dentro da casa.',
  r3: 'Obrigado por partilhares. Horários para quem cuida são para manter.',
};

/** Avaliações à espera de resposta (no POC, as 3 mais recentes) */
export const pendingReviews = (org: Org): Review[] => org.reviews.slice(0, 3);

/** Os 3 critérios mais escolhidos como prioridade primeiro; os outros atrás de "Ver todos os 8" */
export const CRITERIA_ORDER: CriterionKey[] = [...DEFAULT_PREFS, ...CRITERIA.map((c) => c.key).filter((k) => !DEFAULT_PREFS.includes(k))];

/** 1 → 1st, 2 → 2nd, 11 → 11th */
export function ordinalEn(n: number) {
  const teen = n % 100 >= 11 && n % 100 <= 13;
  const suffix = teen ? 'th' : ({ 1: 'st', 2: 'nd', 3: 'rd' } as Record<number, string>)[n % 10] ?? 'th';
  return `${n}${suffix}`;
}

/** Posição entre as organizações avaliadas da mesma cidade (0 se não aparece) */
export function cityRank(orgs: Org[], org: Org) {
  const same = orgs.filter((o) => o.city === org.city && o.reviewsCount > 0).sort((a, b) => b.score - a.score);
  return same.findIndex((o) => o.id === org.id) + 1;
}

export type Direction = 'up' | 'down' | 'flat';
export const direction = (n: number): Direction => (n > 0 ? 'up' : n < 0 ? 'down' : 'flat');

/** "▲ 0,1 esta semana" */
export function weekChange(delta: number) {
  const mark = { up: '▲', down: '▼', flat: '=' }[direction(delta)];
  return `${mark} ${fmt(Math.abs(delta))} ${tr('esta semana', 'this week')}`;
}

/** Números do pulso da semana: novas, posição na cidade (com a subida/descida) e respondidas */
export function pulseStats(org: Org, rank: number, pending: number, answered: number) {
  const move = typeof org.trend === 'number' && org.trend !== 0 ? ` (${org.trend > 0 ? '▲' : '▼'} ${Math.abs(org.trend)})` : '';
  return [
    { value: String(pending), label: tr('avaliações novas', 'new reviews') },
    { value: tr(`${rank}.º`, ordinalEn(rank)), label: `${tr('em', 'in')} ${org.city}${move}` },
    { value: `${answered}/${pending}`, label: tr('respondidas', 'answered') },
  ];
}

/** Selo de respeito e inclusão: ganha-se com 4,5 ou mais */
export const SEAL_MIN = 4.5;

export function harassmentNote(n: number) {
  return n === 0 ? tr('Sem relatos de assédio.', 'No harassment reports.') : tr(`${n} relatos de assédio — lê-os com atenção.`, `${n} harassment reports — read them carefully.`);
}
