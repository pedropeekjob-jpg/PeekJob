import { describe, expect, it } from 'vitest';
import type { ApiDashboard } from '../../src/api/accounts';
import { ORGS } from '../../src/data/orgs';
import { demoPainel, fromDashboard } from '../../src/features/painel/painelData';
import { PAINEL_ORG, WEEK_DELTA } from '../../src/features/painel/painel';

const iso = new Date().toISOString();
const dash = (patch: Partial<ApiDashboard> = {}): ApiDashboard => ({
  org: { id: PAINEL_ORG.id, name: PAINEL_ORG.name, city: 'Porto', plan: 'free' },
  week: { newReviews: 2, answered: 1, unanswered: 3, scoreDelta: -0.2 },
  rank: { position: 4, total: 9, city: 'Porto' },
  tags: [{ label: 'Horários cumpridos', n: 2, up: true }],
  pending: [{ id: 'r9', avg: 3.5, tags: ['Salário em atraso'], text: 'Pagam tarde.', createdAt: iso }],
  pro: null,
  ...patch,
});

describe('dados do painel', () => {
  it('demonstração: Padaria Ribeira, Pro, 3 por responder (menos as respondidas no browser)', () => {
    const d = demoPainel(ORGS, {});
    expect(d.org.id).toBe('padaria-ribeira');
    expect(d.plan).toBe('pro');
    expect(d.pending).toHaveLength(3);
    expect(d.unanswered).toBe(3);
    expect(d.criteriaDelta).toBe(WEEK_DELTA);
    expect(d.weekDelta).toBe(PAINEL_ORG.weekDelta);
    expect(demoPainel(ORGS, { r1: 'Obrigado.' })).toMatchObject({ answered: 1, unanswered: 2 });
  });

  it('do servidor: avaliações por responder como avaliações, contagens com as respondidas agora', () => {
    const d = fromDashboard(dash(), PAINEL_ORG, {});
    expect(d.pending).toEqual([expect.objectContaining({ id: 'r9', score: 3.5, body: 'Pagam tarde.', tags: ['Salário em atraso'], when: 'hoje' })]);
    expect(d).toMatchObject({ plan: 'free', newReviews: 2, answered: 1, unanswered: 3, rank: 4, weekDelta: -0.2, criteriaDelta: null, peers: null });
    expect(d.tags).toEqual([{ label: 'Horários cumpridos', n: 2, up: true }]);
    expect(fromDashboard(dash(), PAINEL_ORG, { r9: 'Obrigado.' })).toMatchObject({ answered: 2, unanswered: 2 });
    expect(fromDashboard(dash({ rank: null }), PAINEL_ORG, {}).rank).toBe(0);
  });

  it('Pro: variação por critério e média do setor', () => {
    const d = fromDashboard(dash({ org: { ...dash().org, plan: 'pro' }, pro: { criteria: { respeito: { now: 4, delta: 0.3 } }, peers: { sector: 'Restauração', count: 5, score: 3.8 } } }), PAINEL_ORG, {});
    expect(d.criteriaDelta).toEqual({ respeito: 0.3 });
    expect(d.peers).toEqual({ sector: 'Restauração', count: 5, score: 3.8 });
  });
});
