import { screen, within } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { renderScreen } from '../utils/render';

// Modo API: filas vindas do servidor, acesso só para moderadores, erros do servidor
const api = vi.fn();
vi.mock('../../src/api/http', async (orig) => {
  const actual = await orig<typeof import('../../src/api/http')>();
  return { ...actual, apiMode: true, api: (...a: unknown[]) => api(...a) };
});
let session: { user: { email: string; role?: string } | null; ready: boolean } = { user: null, ready: true };
vi.mock('../../src/lib/store', async (orig) => {
  const actual = await orig<typeof import('../../src/lib/store')>();
  return {
    ...actual,
    useStore: () => {
      const s = actual.useStore();
      return { ...s, user: session.user, remote: { ...s.remote, ready: session.ready } };
    },
  };
});
const { ApiError } = await import('../../src/api/http');
const { default: Moderacao } = await import('../../src/pages/Moderacao');

const REPORT = {
  kind: 'review', contentId: 'r9', orgId: 'o1', orgName: 'Oficina Nove', text: '', tags: [], count: 1, firstReportedAt: new Date().toISOString(),
  reports: [{ id: 'x', reason: 'ilegal', details: '', createdAt: new Date().toISOString() }],
};
const INTERVIEW_REPORT = {
  kind: 'interview', contentId: 'i7', role: 'Balcão', orgId: 'o1', orgName: 'Oficina Nove', text: 'A Dona Rosa foi rude.', tags: [], count: 1, firstReportedAt: new Date().toISOString(),
  reports: [{ id: 'y', reason: 'nome', details: '', createdAt: new Date().toISOString() }],
};
const APPEAL = {
  id: 'a1', side: 'reporter', originalDecision: 'rejected', originalNote: 'Não viola as regras.', text: 'Tem o nome da gerente.', createdAt: new Date().toISOString(),
  orgName: 'Oficina Nove', content: { kind: 'review', id: 'r9', text: 'A Dona Rosa não paga.', tags: [], avg: 2, status: 'published' },
};
const CLAIM = {
  id: 'c1', orgId: 'o1', orgName: 'Oficina Nove', city: 'Porto', nif: '501442600', method: 'document', emailDomain: null, domainKnown: false,
  name: 'Rui Nove', role: 'Sócio', members: 0, createdAt: new Date().toISOString(),
};
const ORG = { id: 'p1', name: 'Loja Nova', type: 'PME', city: 'Faro', nif: '500697256', address: null, createdAt: new Date().toISOString(), reviewers: 0, duplicates: [] };

function routes(overrides: Record<string, unknown> = {}) {
  api.mockImplementation(async (path: string) => {
    if (path in overrides) {
      const v = overrides[path];
      if (v instanceof Error) throw v;
      return v;
    }
    if (path === '/moderation/reports') return { items: [REPORT] };
    if (path === '/moderation/orgs') return { items: [ORG] };
    if (path === '/moderation/appeals') return { items: [APPEAL] };
    if (path === '/moderation/claims') return { items: [CLAIM] };
    if (path === '/moderation/managed') return { items: [{ id: 'm1', name: 'Loja Velha', city: 'Faro', plan: 'free', members: 2 }] };
    return { items: [] };
  });
}
const show = (viewport: 'mobile' | 'desktop') => renderScreen(<Moderacao />, { route: '/moderacao', path: '/moderacao', viewport });

describe.each(['mobile', 'desktop'] as const)('Moderação, modo API (%s)', (viewport) => {
  beforeEach(() => {
    localStorage.clear();
    api.mockReset();
    routes();
    session = { user: { email: 'm@x.pt', role: 'moderator' }, ready: true };
  });

  it('à espera da sessão: esqueleto; sem sessão: entrar; sem papel: sem acesso', async () => {
    session = { user: null, ready: false };
    const { unmount } = show(viewport);
    expect(screen.queryByRole('tablist')).not.toBeInTheDocument();
    unmount();
    session = { user: null, ready: true };
    const second = show(viewport);
    expect(screen.getByText('Entra para continuar.')).toBeInTheDocument();
    expect(screen.getAllByRole('link', { name: 'Entrar' }).some((a) => a.getAttribute('href') === '/entrar')).toBe(true);
    second.unmount();
    session = { user: { email: 'a@x.pt', role: 'user' }, ready: true };
    show(viewport);
    expect(screen.getByText('Esta área é só para moderadores.')).toBeInTheDocument();
    expect(api).not.toHaveBeenCalledWith('/moderation/reports');
  });

  it('carrega as filas do servidor e envia as decisões', async () => {
    const { user } = show(viewport);
    const card = await screen.findByRole('article', { name: /Oficina Nove/ });
    expect(screen.queryByText(/Demonstração/)).not.toBeInTheDocument();
    expect(within(card).getByText('(sem texto)', { exact: false })).toBeInTheDocument();
    expect(within(card).getByText('Possível ilegalidade')).toBeInTheDocument();
    await user.type(within(card).getByRole('textbox'), 'Não viola as regras.');
    await user.click(within(card).getByRole('button', { name: 'Manter' }));
    expect(api).toHaveBeenCalledWith('/moderation/reviews/r9/decision', { body: { action: 'keep', note: 'Não viola as regras.' } });

    await user.click(screen.getByRole('tab', { name: /Organizações novas/ }));
    const org = screen.getByRole('article', { name: 'Loja Nova' });
    expect(within(org).getByText(/NIF 500697256/)).toBeInTheDocument();
    expect(within(org).getByText(/Ainda sem avaliações/)).toBeInTheDocument();
    await user.click(within(org).getByRole('button', { name: 'Aprovar' }));
    expect(api).toHaveBeenCalledWith('/orgs/p1/approve', { method: 'POST' });

    await user.click(screen.getByRole('tab', { name: /Pedidos de revisão 1/ }));
    const appeal = screen.getByRole('article', { name: 'Pedido de revisão sobre uma avaliação de Oficina Nove' });
    expect(within(appeal).getByText('Quem denunciou contesta a decisão de manter')).toBeInTheDocument();
    await user.type(within(appeal).getByRole('textbox'), 'Tem mesmo um nome: remover.');
    await user.click(within(appeal).getByRole('button', { name: 'Reverter a decisão' }));
    expect(api).toHaveBeenCalledWith('/moderation/appeals/a1/decision', { body: { action: 'reverse', note: 'Tem mesmo um nome: remover.' } });
  });

  it('entrevistas denunciadas: com a função, e a decisão vai para a entrevista', async () => {
    routes({ '/moderation/reports': { items: [INTERVIEW_REPORT] } });
    const { user } = show(viewport);
    const card = await screen.findByRole('article', { name: 'Denúncias sobre uma entrevista de Oficina Nove' });
    expect(within(card).getByText('Entrevista · Balcão')).toBeInTheDocument();
    await user.type(within(card).getByRole('textbox'), 'Identifica uma pessoa pelo nome.');
    await user.click(within(card).getByRole('button', { name: 'Remover entrevista' }));
    expect(api).toHaveBeenCalledWith('/moderation/interviews/i7/decision', { body: { action: 'remove', note: 'Identifica uma pessoa pelo nome.' } });
    expect(await screen.findByText('Entrevista removida. Avisámos quem escreveu e quem denunciou.')).toBeInTheDocument();
  });

  it('páginas: recusar um pedido e ligar o Pro vão para o servidor', async () => {
    const { user } = show(viewport);
    await user.click(await screen.findByRole('tab', { name: /Páginas de organizações 1/ }));
    const card = screen.getByRole('article', { name: 'Pedido para gerir Oficina Nove' });
    expect(within(card).getByText(/Documento com o NIF da organização/)).toBeInTheDocument();
    await user.type(within(card).getByRole('textbox'), 'Não confirmámos o cargo.');
    await user.click(within(card).getByRole('button', { name: 'Recusar' }));
    expect(api).toHaveBeenCalledWith('/moderation/claims/c1/decision', { body: { action: 'reject', note: 'Não confirmámos o cargo.' } });
    await user.click(screen.getByRole('button', { name: 'Plano Pro para Loja Velha' }));
    expect(api).toHaveBeenCalledWith('/moderation/orgs/m1/plan', { method: 'PUT', body: { plan: 'pro' } });
    expect(await screen.findByText('Plano Pro ligado.')).toBeInTheDocument();
  });

  it('erro ao carregar e erro numa decisão', async () => {
    routes({ '/moderation/reports': new ApiError(500, { message: 'Falhou a base de dados.' }) });
    const { unmount } = show(viewport);
    expect(await screen.findByRole('alert')).toHaveTextContent('Falhou a base de dados.');
    unmount();

    routes({ '/orgs/p1/reject': new ApiError(409, { message: 'Já foi decidida por outra pessoa.' }) });
    const { user } = show(viewport);
    await user.click(await screen.findByRole('tab', { name: /Organizações novas/ }));
    const org = screen.getByRole('article', { name: 'Loja Nova' });
    await user.click(within(org).getByRole('button', { name: 'Rejeitar' }));
    await user.type(within(org).getByRole('textbox'), 'Duplicada.');
    await user.click(within(org).getAllByRole('button', { name: 'Rejeitar' })[0]);
    expect(await within(org).findByRole('alert')).toHaveTextContent('Já foi decidida por outra pessoa.');
    expect(screen.getByRole('article', { name: 'Loja Nova' })).toBeInTheDocument();
  });
});
