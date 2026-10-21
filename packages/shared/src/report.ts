import { CRITERION_KEYS, type CriterionKey } from './criteria';

/**
 * Relatório semanal ou mensal para as organizações com subscrição (21/10): resultados do período, comparação com
 * organizações parecidas, pontos fortes, o que melhorar, e a relação entre os níveis de satisfação.
 * Função pura: a API calcula com os dados reais e a demonstração com os de exemplo. Nunca diz quem escreveu.
 */

export type ReportPeriod = 'week' | 'month';
export const REPORT_PERIODS: ReportPeriod[] = ['week', 'month'];

/** Com menos avaliações do que isto no período, só se mostram os totais acumulados (anonimato) */
export const REPORT_MIN_PERIOD = 3;
/** Mínimo de avaliações com "recomendava?" para ligar critérios e recomendação */
export const REPORT_MIN_RELATION = 5;

export interface ReportReview {
  scores: Partial<Record<CriterionKey, number | null>>;
  avg: number;
  recommend: boolean | null;
  createdAt: Date;
}

/** Médias das organizações comparáveis (mesmo setor, ou mesma cidade quando não há setor) */
export interface ReportPeers {
  basis: 'sector' | 'city';
  label: string;
  orgs: number;
  score: number | null;
  criteria: Partial<Record<CriterionKey, number | null>>;
}

export interface CriterionLine {
  key: CriterionKey;
  /** média de todas as avaliações */
  value: number;
  /** média no período (null com poucas avaliações no período) */
  period: number | null;
  /** variação face ao período anterior (null sem dados suficientes) */
  delta: number | null;
  /** média das comparáveis e a diferença */
  peers: number | null;
  vsPeers: number | null;
}

export interface Report {
  period: ReportPeriod;
  from: string;
  to: string;
  results: {
    total: number;
    inPeriod: number;
    inPrevious: number;
    score: number | null;
    /** nota do período e do anterior (null com menos de REPORT_MIN_PERIOD avaliações) */
    periodScore: number | null;
    previousScore: number | null;
    delta: number | null;
    recommendPct: number | null;
  };
  criteria: CriterionLine[];
  peers: ReportPeers | null;
  /** até 3, do melhor para o menos bom */
  strengths: CriterionKey[];
  /** até 3, do mais urgente para o menos */
  improve: CriterionKey[];
  /** quantas avaliações em cada nível (1 a 5, pela média arredondada) */
  levels: number[];
  /** critérios mais ligados a recomendar (diferença entre quem recomenda e quem não), do mais forte para o mais fraco */
  drivers: { key: CriterionKey; recommenders: number; others: number; gap: number }[];
}

const DAY = 86_400_000;
const round1 = (v: number) => Math.round(v * 10) / 10;
const mean = (v: number[]) => (v.length ? v.reduce((a, b) => a + b, 0) / v.length : null);
const scoresOf = (rows: ReportReview[], k: CriterionKey) => rows.map((r) => r.scores[k]).filter((x): x is number => typeof x === 'number');
const avgOf = (rows: ReportReview[], k: CriterionKey) => {
  const m = mean(scoresOf(rows, k));
  return m == null ? null : round1(m);
};

/** Início do período (7 ou 30 dias antes de `now`) */
export const periodStart = (period: ReportPeriod, now: Date) => new Date(now.getTime() - (period === 'week' ? 7 : 30) * DAY);

export function buildReport(period: ReportPeriod, now: Date, reviews: ReportReview[], peers: ReportPeers | null): Report {
  const from = periodStart(period, now);
  const prevFrom = periodStart(period, from);
  const cur = reviews.filter((r) => r.createdAt >= from && r.createdAt <= now);
  const prev = reviews.filter((r) => r.createdAt >= prevFrom && r.createdAt < from);
  const enough = (rows: ReportReview[]) => rows.length >= REPORT_MIN_PERIOD;
  const avgScore = (rows: ReportReview[]) => {
    const m = mean(rows.map((r) => r.avg));
    return m == null ? null : round1(m);
  };

  const periodScore = enough(cur) ? avgScore(cur) : null;
  const previousScore = enough(prev) ? avgScore(prev) : null;
  const answered = reviews.filter((r) => r.recommend != null);

  const criteria: CriterionLine[] = CRITERION_KEYS.flatMap((key) => {
    const value = avgOf(reviews, key);
    if (value == null) return [];
    const p = enough(cur) ? avgOf(cur, key) : null;
    const q = enough(prev) ? avgOf(prev, key) : null;
    const peer = peers?.criteria[key] ?? null;
    return [{ key, value, period: p, delta: p != null && q != null ? round1(p - q) : null, peers: peer, vsPeers: peer != null ? round1(value - peer) : null }];
  });

  // pontos fortes: acima das comparáveis (ou, sem elas, as notas mais altas), a partir de 3,5
  const byStrength = [...criteria].sort((a, b) => (b.vsPeers ?? 0) - (a.vsPeers ?? 0) || b.value - a.value);
  const strengths = byStrength.filter((c) => c.value >= 3.5 && (c.vsPeers == null || c.vsPeers >= 0)).slice(0, 3).map((c) => c.key);
  // o que melhorar: as notas mais baixas, primeiro as abaixo das comparáveis e as que estão a descer
  const urgency = (c: CriterionLine) => c.value - Math.min(0, c.vsPeers ?? 0) * 0.5 + Math.min(0, c.delta ?? 0) * 0.5;
  const improve = [...criteria]
    .filter((c) => !strengths.includes(c.key) && (c.value < 4 || (c.vsPeers ?? 0) < 0))
    .sort((a, b) => urgency(a) - urgency(b))
    .slice(0, 3)
    .map((c) => c.key);

  const levels = [0, 0, 0, 0, 0];
  for (const r of reviews) levels[Math.min(5, Math.max(1, Math.round(r.avg))) - 1]++;

  const yes = answered.filter((r) => r.recommend);
  const no = answered.filter((r) => r.recommend === false);
  const drivers =
    answered.length >= REPORT_MIN_RELATION && yes.length && no.length
      ? CRITERION_KEYS.flatMap((key) => {
          const a = mean(scoresOf(yes, key));
          const b = mean(scoresOf(no, key));
          return a == null || b == null ? [] : [{ key, recommenders: round1(a), others: round1(b), gap: round1(a - b) }];
        })
          .filter((d) => d.gap > 0)
          .sort((x, y) => y.gap - x.gap)
          .slice(0, 3)
      : [];

  return {
    period,
    from: from.toISOString(),
    to: now.toISOString(),
    results: {
      total: reviews.length,
      inPeriod: cur.length,
      inPrevious: prev.length,
      score: avgScore(reviews),
      periodScore,
      previousScore,
      delta: periodScore != null && previousScore != null ? round1(periodScore - previousScore) : null,
      recommendPct: answered.length ? Math.round((yes.length / answered.length) * 100) : null,
    },
    criteria,
    peers,
    strengths,
    improve,
    levels,
    drivers,
  };
}
