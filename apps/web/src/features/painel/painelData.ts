import type { ApiDashboard, Plan } from '../../api/accounts';
import { when } from '../../api/mappers';
import { WEEK_TAGS } from '../../data/content';
import type { CriterionKey } from '../../data/criteria';
import type { Org, Review } from '../../data/orgs';
import { cityRank, PAINEL_ORG, pendingReviews, WEEK_DELTA } from './painel';

/** O que o painel mostra, venha da demonstração ou do servidor (funções puras) */
export interface PainelData {
  org: Org;
  plan: Plan;
  weekDelta: number;
  newReviews: number;
  /** respondidas esta semana */
  answered: number;
  unanswered: number;
  /** posição na cidade (0 se ainda não aparece) */
  rank: number;
  tags: { label: string; n: number; up: boolean }[];
  pending: Review[];
  /** só no Pro */
  criteriaDelta: Partial<Record<CriterionKey, number>> | null;
  peers: { sector: string; count: number; score: number } | null;
}

/** Demonstração: a Padaria Ribeira com o plano Pro (para se ver tudo); as respostas ficam no browser */
export function demoPainel(orgs: Org[], replies: Record<string, string>): PainelData {
  const org = PAINEL_ORG;
  const pending = pendingReviews(org);
  const answered = pending.filter((r) => replies[r.id]).length;
  const sameSector = orgs.filter((o) => o.sector === org.sector && o.id !== org.id && o.reviewsCount > 0);
  return {
    org,
    plan: 'pro',
    weekDelta: org.weekDelta,
    newReviews: pending.length,
    answered,
    unanswered: pending.length - answered,
    rank: cityRank(orgs, org),
    tags: WEEK_TAGS,
    pending,
    criteriaDelta: WEEK_DELTA,
    peers: sameSector.length
      ? { sector: org.sector, count: sameSector.length, score: Math.round((sameSector.reduce((a, o) => a + o.score, 0) / sameSector.length) * 10) / 10 }
      : null,
  };
}

/** Do servidor: as avaliações por responder passam a avaliações; conta também as respondidas agora */
export function fromDashboard(d: ApiDashboard, org: Org, replies: Record<string, string>): PainelData {
  const pending: Review[] = d.pending.map((p) => ({ id: p.id, role: 'Equipa', when: when(p.createdAt), score: p.avg, title: '', body: p.text, useful: 0, verified: false, tags: p.tags }));
  const now = pending.filter((r) => replies[r.id]).length;
  return {
    org,
    plan: d.org.plan,
    weekDelta: d.week.scoreDelta,
    newReviews: d.week.newReviews,
    answered: d.week.answered + now,
    unanswered: Math.max(0, d.week.unanswered - now),
    rank: d.rank?.position ?? 0,
    tags: d.tags,
    pending,
    criteriaDelta: d.pro ? (Object.fromEntries(Object.entries(d.pro.criteria).map(([k, v]) => [k, v.delta])) as Partial<Record<CriterionKey, number>>) : null,
    peers: d.pro?.peers ?? null,
  };
}
