import { buildReport, type Report, type ReportPeriod, type ReportReview } from '@peekjob/shared';
import type { CriterionKey } from '../../data/criteria';
import { tr } from '../../i18n';
import { fmt } from '../../lib/format';
import { PAINEL_ORG } from './painel';

/** Relatório semanal ou mensal (21/10): textos e dados da demonstração (funções puras) */

export type ApiReport = Report & { org: { id: string; name: string; city: string; sector: string | null } };

/** No endereço: ?periodo=semana ou ?periodo=mes */
export const periodParam = (p: ReportPeriod) => (p === 'month' ? 'mes' : 'semana');
export const periodOf = (v: string | null): ReportPeriod => (v === 'mes' ? 'month' : 'week');

export const periodName = (p: ReportPeriod) => (p === 'week' ? tr('Esta semana', 'This week') : tr('Este mês', 'This month'));
/** "face à semana anterior" / "face ao mês anterior" */
const vsPrev = (p: ReportPeriod) => (p === 'week' ? tr('face à semana anterior', 'vs the week before') : tr('face ao mês anterior', 'vs the month before'));

/** O que fazer para melhorar cada critério: passos concretos, pela ordem em que costumam dar resultado */
const HOW: Record<CriterionKey, [pt: string, en: string]> = {
  salario: [
    'Paga sempre no mesmo dia, com recibo detalhado. Se houver atrasos, avisa antes e diz quando chega. Revê os salários face ao setor.',
    'Always pay on the same day, with a detailed payslip. If there is a delay, say so beforehand and when it will arrive. Review pay against the sector.',
  ],
  equilibrio: [
    'Publica os horários com pelo menos duas semanas de antecedência e evita mudanças à última hora. Paga ou compensa as horas extra.',
    'Publish rotas at least two weeks ahead and avoid last-minute changes. Pay or give time back for overtime.',
  ],
  respeito: [
    'Define e divulga como se faz uma queixa (também anónima) e responde a todas. Forma as chefias em igualdade e assédio.',
    'Set up and share a way to complain (including anonymously) and answer every one. Train managers on equality and harassment.',
  ],
  ambiente: [
    'Junta a equipa uma vez por mês para falar do que corre bem e mal. Integra quem chega com alguém de referência.',
    'Get the team together once a month to talk about what works and what doesn’t. Pair newcomers with a buddy.',
  ],
  lideranca: [
    'Faz conversas curtas e regulares a dois com cada pessoa. Explica as decisões e o porquê, e trata todos pelas mesmas regras.',
    'Hold short, regular one-to-ones with each person. Explain decisions and why, and apply the same rules to everyone.',
  ],
  estabilidade: [
    'Contratos por escrito desde o primeiro dia e, sempre que possível, sem termo. Diz com antecedência o que vai mudar.',
    'Written contracts from day one and, where possible, permanent. Tell people early about what is going to change.',
  ],
  progressao: [
    'Mostra que funções existem e o que é preciso para lá chegar. Dá formação paga dentro do horário.',
    'Show which roles exist and what it takes to get there. Offer paid training within working hours.',
  ],
  proposito: [
    'Partilha com a equipa o impacto do trabalho (clientes, números, histórias). Ouve ideias e mostra o que se fez com elas.',
    'Share the impact of the work with the team (customers, numbers, stories). Listen to ideas and show what was done with them.',
  ],
};
export const howToImprove = (k: CriterionKey) => tr(...HOW[k]);

/** "A nota foi 3,8 (+0,4 face à semana anterior)" ou porque não se mostra */
export function periodLine(r: Report) {
  const { periodScore, delta, inPeriod } = r.results;
  if (periodScore == null) {
    return inPeriod
      ? tr(
          `${inPeriod === 1 ? '1 avaliação nova' : `${inPeriod} avaliações novas`}: são poucas para mostrar a nota do período sem identificar ninguém. Mostramos o acumulado.`,
          `${inPeriod === 1 ? '1 new review' : `${inPeriod} new reviews`}: too few to show the period’s score without identifying anyone. Showing the overall figures.`,
        )
      : tr('Sem avaliações novas neste período. Mostramos o acumulado.', 'No new reviews in this period. Showing the overall figures.');
  }
  const d = delta == null ? '' : delta === 0 ? tr(` (igual, ${vsPrev(r.period)})`, ` (unchanged, ${vsPrev(r.period)})`) : ` (${signed(delta)} ${vsPrev(r.period)})`;
  return tr(`Nota de ${fmt(periodScore)} em ${inPeriod} avaliações novas${d}.`, `Score of ${fmt(periodScore)} across ${inPeriod} new reviews${d}.`);
}

export const signed = (n: number) => (n > 0 ? `+${fmt(n)}` : n < 0 ? `−${fmt(-n)}` : '0');

export function peersLine(r: Report) {
  if (!r.peers) return tr('Ainda não há organizações comparáveis com avaliações.', 'There are no comparable organisations with reviews yet.');
  const n = r.peers.orgs;
  const basis = r.peers.basis === 'sector' ? tr(`do setor ${r.peers.label}`, `in the ${r.peers.label} sector`) : tr(`de ${r.peers.label}`, `in ${r.peers.label}`);
  return tr(`Comparado com ${n === 1 ? '1 organização' : `${n} organizações`} ${basis}.`, `Compared with ${n === 1 ? '1 organisation' : `${n} organisations`} ${basis}.`);
}

/** Demonstração: 24 avaliações da Padaria Ribeira espalhadas por dois meses (sempre as mesmas) */
export function demoReport(period: ReportPeriod, now = new Date()): ApiReport {
  const org = PAINEL_ORG;
  const keys = Object.keys(org.scores) as CriterionKey[];
  const rows: ReportReview[] = Array.from({ length: 24 }, (_, i) => {
    // uma em cada quatro pessoas está bem menos satisfeita (sobretudo com salário e liderança); sempre igual
    const unhappy = i % 4 === 1;
    const scores = Object.fromEntries(
      keys.map((k, j) => {
        const base = org.scores[k];
        if (base == null) return [k, null];
        const wobble = (((i * 7 + j * 3) % 5) - 2) * 0.5;
        const drop = unhappy ? (k === 'salario' || k === 'lideranca' ? 2.5 : 1.2) : 0;
        return [k, Math.max(1, Math.min(5, Math.round(base + wobble - drop + (i < 6 ? 0.3 : 0))))];
      }),
    ) as ReportReview['scores'];
    const v = Object.values(scores).filter((x): x is number => typeof x === 'number');
    const avg = Math.round((v.reduce((a, b) => a + b, 0) / v.length) * 10) / 10;
    return { scores, avg, recommend: i % 6 === 5 ? null : avg >= 3.8, createdAt: new Date(now.getTime() - (i * 2.4 + 0.5) * 86_400_000) };
  });
  const peers = {
    basis: 'sector' as const,
    label: org.sector,
    orgs: 6,
    score: 3.7,
    criteria: { salario: 3.4, equilibrio: 3.5, respeito: 4.1, ambiente: 4.0, lideranca: 3.6, estabilidade: 3.6, progressao: 3.2, proposito: 3.8 },
  };
  return { org: { id: org.id, name: org.name, city: org.city, sector: org.sector }, ...buildReport(period, now, rows, peers) };
}
