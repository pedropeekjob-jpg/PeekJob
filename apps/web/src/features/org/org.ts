import { CRITERIA, type CriterionKey } from '../../data/criteria';
import type { Interview, Org, OrgLocation, OrgType, Review } from '../../data/orgs';
import { tr } from '../../i18n';
import { orgTypeLabel } from '../../i18n/labels';
import { euros, fmt, plural } from '../../lib/format';
import type { MyReview } from '../../lib/store';

/** Regras e textos da página da organização (funções puras: testadas sem React) */

export type OrgTab = 'avaliacoes' | 'entrevistas' | 'salarios';

/** Regra de anonimato: só mostramos uma função com pelo menos 3 salários */
export const MIN_SALARIES = 3;

export const salaryTotal = (org: Org) => org.salaries.reduce((a, s) => a + s.count, 0);
export const orgMetaLine = (org: Org) => `${orgTypeLabel(org.type)} · ${org.city}`;
export const locationsSuffix = (n: number) => (n > 1 ? tr(` · ${n} locais`, ` · ${n} locations`) : '');

export function scoreAria(org: Org) {
  return org.reviewsCount > 0
    ? tr(`Nota ${fmt(org.score)} de 5, com ${org.reviewsCount} avaliações`, `Score ${fmt(org.score)} out of 5, from ${plural(org.reviewsCount, 'review', 'reviews')}`)
    : tr('Ainda sem nota', 'No score yet');
}

/** Texto do botão principal nas secções de entrevistas e salários */
export function shareCta(tab: OrgTab, type: OrgType) {
  if (tab === 'entrevistas') return tr('Partilhar a minha entrevista', 'Share my interview');
  return type === 'Voluntariado' ? tr('Avaliar esta organização', 'Review this organisation') : tr('Partilhar o meu salário', 'Share my salary');
}

export const osmLink = (l: Pick<OrgLocation, 'lat' | 'lng'>) => `https://www.openstreetmap.org/?mlat=${l.lat}&mlon=${l.lng}#map=17/${l.lat}/${l.lng}`;

export function harassmentLine(org: Pick<Org, 'harassmentReports' | 'reviewsCount'>) {
  return tr(
    `${plural(org.harassmentReports, 'relato', 'relatos')} de assédio em ${plural(org.reviewsCount, 'avaliação', 'avaliações')}.`,
    `${plural(org.harassmentReports, 'harassment report', 'harassment reports')} in ${plural(org.reviewsCount, 'review', 'reviews')}.`,
  );
}

/** Prioridades da pessoa primeiro (com o número); os restantes critérios à parte */
export function splitCriteria(prefs: CriterionKey[]) {
  const rest = CRITERIA.map((c) => c.key).filter((k) => !prefs.includes(k));
  const prio = (k: CriterionKey) => prefs.indexOf(k) + 1 || undefined;
  return { prefs, rest, prio };
}

/** Bolinha n (0–4) de uma nota de 0 a 5: cheia, meia ou vazia */
export function dotFill(value: number | null | undefined, k: number): 'full' | 'half' | 'empty' {
  const x = value ?? 0;
  if (x >= k + 0.75) return 'full';
  if (x >= k + 0.25) return 'half';
  return 'empty';
}

/** As minhas avaliações à parte (com etiqueta), as outras com "ver todas" */
export function reviewLists(org: Org, myReviews: MyReview[], all: boolean) {
  const mine = myReviews.filter((r) => r.orgId === org.id);
  const mineIds = new Set(mine.map((r) => r.id));
  const others = org.reviews.filter((r: Review) => !mineIds.has(r.id));
  return { mine, others, shown: all ? others : others.slice(0, 2) };
}

/* ---------- Entrevistas ---------- */

export function interviewNumbers(org: Org) {
  const n = org.interviews.length;
  if (org.interviewStats) return { ...org.interviewStats, n };
  const pct = (f: (i: Interview) => boolean) => (n ? Math.round((org.interviews.filter(f).length / n) * 100) : 0);
  return { positivePct: pct((i) => i.positive), offerPct: pct((i) => i.offer), answeredPct: undefined, difficulty: undefined, usualSteps: org.interviews[0]?.steps, n };
}

/** Anéis do resumo das entrevistas: dificuldade (se houver), boa experiência, e resposta ou oferta */
export function interviewRings(org: Org) {
  const s = interviewNumbers(org);
  const rings: { v: number; pct: boolean; label: string; text: string }[] = [];
  if (s.difficulty != null) rings.push({ v: s.difficulty, pct: false, label: tr('Dificuldade', 'Difficulty'), text: fmt(s.difficulty) });
  rings.push({ v: s.positivePct, pct: true, label: tr('Gostaram do processo', 'Liked the process'), text: `${s.positivePct}%` });
  if (s.answeredPct != null) rings.push({ v: s.answeredPct, pct: true, label: tr('Tiveram resposta', 'Got a reply'), text: `${s.answeredPct}%` });
  else rings.push({ v: s.offerPct, pct: true, label: tr('Receberam oferta', 'Got an offer'), text: `${s.offerPct}%` });
  return rings;
}

/* ---------- Salários ---------- */

/** Funções visíveis (≥ MIN_SALARIES) e escala comum, em %, arredondada às centenas */
export function salaryScale(org: Pick<Org, 'salaries'>) {
  const shown = org.salaries.filter((s) => s.count >= MIN_SALARIES);
  const hidden = org.salaries.filter((s) => s.count < MIN_SALARIES);
  const lo = shown.length ? Math.floor((Math.min(...shown.map((s) => s.min)) - 50) / 100) * 100 : 0;
  const hi = shown.length ? Math.ceil((Math.max(...shown.map((s) => s.max)) + 50) / 100) * 100 : 1;
  const pos = (v: number) => ((v - lo) / (hi - lo)) * 100;
  return { shown, hidden, pos };
}

/** "Cozinha tem 2 — falta 1" para as funções ainda escondidas */
export function hiddenExtra(org: Pick<Org, 'salaries'>) {
  return salaryScale(org)
    .hidden.map((h) => {
      const left = MIN_SALARIES - h.count;
      return tr(`${h.role} tem ${h.count} — falta${left === 1 ? '' : 'm'} ${left}`, `${h.role} has ${h.count} — needs ${left} more`);
    })
    .join('; ');
}

export function hiddenNote(org: Pick<Org, 'salaries'>) {
  const extra = hiddenExtra(org);
  const base = tr(
    `Só mostramos uma função com pelo menos ${MIN_SALARIES} salários: numa equipa pequena, menos do que isso podia identificar alguém.`,
    `We only show a role with at least ${MIN_SALARIES} salaries: in a small team, fewer could identify someone.`,
  );
  return extra ? `${base} ${extra}.` : base;
}

export function salaryAria(s: { role: string; min: number; max: number; median: number; count: number }) {
  return tr(
    `${s.role}: de ${euros(s.min)} a ${euros(s.max)}, valor do meio ${euros(s.median)}, ${s.count} salários`,
    `${s.role}: from ${euros(s.min)} to ${euros(s.max)}, median ${euros(s.median)}, ${s.count} ${s.count === 1 ? 'salary' : 'salaries'}`,
  );
}

/** Quantas pessoas dizem que o salário chega a horas */
export const paidOnTimeCount = (org: Org) => (org.paidOnTimePct != null ? Math.round((org.paidOnTimePct / 100) * salaryTotal(org)) : 0);
