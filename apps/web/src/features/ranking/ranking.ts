import { CRITERIA, CRITERION, type CriterionKey } from '../../data/criteria';
import { DISTRICTS, normalizeOrgType } from '@peekjob/shared';
import { ORG_TYPES, type Org, type SizeBand } from '../../data/orgs';
import { tr } from '../../i18n';
import { orgTypeLabel } from '../../i18n/labels';
import { plural } from '../../lib/format';
import { match } from '../../lib/match';

/** Regras e textos do ranking (funções puras: testadas sem React) */

/** Regra do ranking: só entram organizações com pelo menos 5 avaliações */
export const MIN_REVIEWS = 5;
/** Aproximação no POC: "só verificadas" = pelo menos 80% das avaliações verificadas */
export const VERIFIED_MIN = 80;
export const SIZES: SizeBand[] = ['1–9', '10–49', '50–249', '250+'];
/** No computador mostramos 8 de cada vez */
export const DESKTOP_LIMIT = 8;
/** Opções visíveis por grupo antes de "+n" */
export const VISIBLE_OPTIONS = 3;

export type Sort = 'mim' | 'nota';
export type GroupKey = 'tipo' | 'dim' | 'dist';

export interface Filters {
  tipo: string[];
  dim: string[];
  dist: string[];
  resp: boolean;
  ver: boolean;
  setor: string | null;
}

export interface FilterGroup {
  key: GroupKey;
  label: string;
  short: string;
  opts: string[];
  optLabel?: (v: string) => string;
}

/** Os 18 distritos e as 2 regiões autónomas (o filtro serve para todo o país, não só para os dados de exemplo) */
export const filterGroups = (districts: readonly string[] = DISTRICTS): FilterGroup[] => [
  { key: 'tipo', label: tr('Tipo de organização', 'Type of organisation'), short: tr('Tipo', 'Type'), opts: ORG_TYPES, optLabel: orgTypeLabel },
  { key: 'dim', label: tr('Dimensão (pessoas)', 'Size (people)'), short: tr('Pessoas', 'People'), opts: SIZES },
  { key: 'dist', label: tr('Distrito', 'District'), short: tr('Distrito', 'District'), opts: [...districts] },
];

const list = (v: string | null) => (v ? v.split(',').filter(Boolean) : []);

/** Filtros e ordem a partir do endereço; links antigos com tipo=PME passam a Empresa (?tipo=…&dim=…&dist=…&resp=1&ver=1&setor=…&ordem=nota) */
export function readFilters(sp: URLSearchParams): { filters: Filters; sort: Sort } {
  return {
    filters: { tipo: [...new Set(list(sp.get('tipo')).map((t) => normalizeOrgType(t)))], dim: list(sp.get('dim')), dist: list(sp.get('dist')), resp: sp.get('resp') === '1', ver: sp.get('ver') === '1', setor: sp.get('setor') },
    sort: sp.get('ordem') === 'nota' ? 'nota' : 'mim',
  };
}

/** O inverso de readFilters: só escreve o que não é o valor por omissão */
export function writeFilters(f: Filters, sort: Sort) {
  const p = new URLSearchParams();
  if (f.tipo.length) p.set('tipo', f.tipo.join(','));
  if (f.dim.length) p.set('dim', f.dim.join(','));
  if (f.dist.length) p.set('dist', f.dist.join(','));
  if (f.resp) p.set('resp', '1');
  if (f.ver) p.set('ver', '1');
  if (f.setor) p.set('setor', f.setor);
  if (sort === 'nota') p.set('ordem', 'nota');
  return p;
}

/** "12 organizações · mínimo 5 avaliações" */
export const countLine = (n: number) =>
  `${plural(n, tr('organização', 'organisation'), tr('organizações', 'organisations'))} · ${tr(`mínimo ${MIN_REVIEWS} avaliações`, `minimum ${MIN_REVIEWS} reviews`)}`;

export const NO_FILTERS: Filters = { tipo: [], dim: [], dist: [], resp: false, ver: false, setor: null };

/** Junta ou tira um valor de uma lista */
export const toggleIn = (values: string[], v: string) => (values.includes(v) ? values.filter((x) => x !== v) : [...values, v]);

/** Quantos filtros estão ativos (cada valor escolhido conta um) */
export const activeCount = (f: Filters) => f.tipo.length + f.dim.length + f.dist.length + Number(f.resp) + Number(f.ver) + Number(!!f.setor);

export function applyFilters(orgs: Org[], f: Filters) {
  return orgs.filter(
    (o) =>
      o.reviewsCount >= MIN_REVIEWS &&
      (!f.tipo.length || f.tipo.includes(o.type)) &&
      (!f.dim.length || f.dim.includes(o.size)) &&
      (!f.dist.length || f.dist.includes(o.district)) &&
      (!f.resp || (o.scores.respeito ?? 0) >= 4) &&
      (!f.ver || o.verifiedPct >= VERIFIED_MIN) &&
      (!f.setor || o.sector === f.setor),
  );
}

export type RankedRow = { org: Org; match: number };

/** "Para mim": compatibilidade e depois nota; "Nota geral": nota e depois n.º de avaliações */
export function rank(orgs: Org[], f: Filters, sort: Sort, prefs: CriterionKey[]): RankedRow[] {
  const rows = applyFilters(orgs, f).map((org) => ({ org, match: match(org, prefs) }));
  if (sort === 'mim') rows.sort((a, b) => b.match - a.match || b.org.score - a.org.score);
  else rows.sort((a, b) => b.org.score - a.org.score || b.org.reviewsCount - a.org.reviewsCount);
  return rows;
}

export type Trend = 'up' | 'down' | 'flat' | 'new';

/** Subida/descida na semana: texto curto, texto para leitores de ecrã e tipo (para a cor) */
export function trendInfo(t: number | 'novo'): { text: string; aria: string; kind: Trend } {
  if (t === 'novo') return { text: tr('novo', 'new'), aria: tr('Novo no ranking', 'New in the ranking'), kind: 'new' };
  if (t > 0) return { text: `▲${t}`, aria: tr(`Subiu ${t}`, `Up ${t}`), kind: 'up' };
  if (t < 0) return { text: `▼${Math.abs(t)}`, aria: tr(`Desceu ${Math.abs(t)}`, `Down ${Math.abs(t)}`), kind: 'down' };
  return { text: '—', aria: tr('Sem alteração', 'No change'), kind: 'flat' };
}

export function sizeLabel(s: string) {
  if (s === '1–9') return tr('Até 9 pessoas', 'Up to 9 people');
  if (s === '10–49') return tr('10 a 49 pessoas', '10 to 49 people');
  if (s === '50–249') return tr('50 a 249 pessoas', '50 to 249 people');
  return tr('250 ou mais pessoas', '250 or more people');
}

/** "Todos", um valor, ou "primeiro +n" */
export function summarize(values: string[], all: string, one: (v: string) => string = (v) => v) {
  if (values.length === 0) return all;
  if (values.length === 1) return one(values[0]);
  return `${one(values[0])} +${values.length - 1}`;
}

/** Chips de resumo no telemóvel (cada um abre a folha de filtros) */
export function filterChips(f: Filters): { text: string; aria: string }[] {
  const chips = [
    {
      text: summarize(f.tipo, tr('Todos os tipos', 'All types'), orgTypeLabel),
      aria: tr(`Tipo: ${f.tipo.length ? f.tipo.join(', ') : 'todos'}`, `Type: ${f.tipo.length ? f.tipo.map(orgTypeLabel).join(', ') : 'all'}`),
    },
    { text: summarize(f.dist, tr('Todos os distritos', 'All districts')), aria: tr(`Distrito: ${f.dist.length ? f.dist.join(', ') : 'todos'}`, `District: ${f.dist.length ? f.dist.join(', ') : 'all'}`) },
    { text: summarize(f.dim, tr('Qualquer dimensão', 'Any size'), sizeLabel), aria: tr(`Dimensão: ${f.dim.length ? f.dim.join(', ') : 'qualquer'}`, `Size: ${f.dim.length ? f.dim.join(', ') : 'any'}`) },
  ];
  if (f.resp) chips.push({ text: tr('Respeito ≥ 4', 'Respect ≥ 4'), aria: tr('Respeito e inclusão 4 ou mais', 'Respect and inclusion 4 or more') });
  if (f.ver) chips.push({ text: tr('Verificadas', 'Verified'), aria: tr('Só avaliações verificadas', 'Verified reviews only') });
  return chips;
}

/** Opções visíveis de um grupo: as primeiras e as escolhidas, a não ser que esteja aberto (ex.: os 20 distritos) */
export function visibleOptions(opts: string[], chosen: string[], open: boolean) {
  const collapsible = opts.length > VISIBLE_OPTIONS + 1;
  const shown = !collapsible || open ? opts : opts.filter((o, i) => i < VISIBLE_OPTIONS || chosen.includes(o));
  return { collapsible, shown, hidden: opts.length - shown.length };
}

/** "Ambiente, Salário e Equilíbrio" */
export function prefsText(prefs: CriterionKey[]) {
  const names = prefs.map((k) => CRITERION[k].short);
  if (names.length > 1) return `${names.slice(0, -1).join(', ')} ${tr('e', 'and')} ${names[names.length - 1]}`;
  return names[0] ?? '';
}

/** Critérios na pré-visualização: as prioridades, ou todos com as prioridades primeiro */
export const previewOrder = (prefs: CriterionKey[], all: boolean): CriterionKey[] => (all ? [...prefs, ...CRITERIA.map((c) => c.key).filter((k) => !prefs.includes(k))] : prefs);

/** Computador: a escolhida (ou a primeira) e as linhas visíveis (8, ou até à escolhida, ou todas) */
export function desktopWindow(rows: RankedRow[], pick: string | null, more: boolean) {
  const found = rows.findIndex((r) => r.org.id === pick);
  const index = found === -1 ? 0 : found;
  return { index, selected: rows[index] as RankedRow | undefined, shown: more ? rows : rows.slice(0, Math.max(DESKTOP_LIMIT, index + 1)) };
}
