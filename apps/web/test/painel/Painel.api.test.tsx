import { screen, within } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { renderScreen } from '../utils/render';

// Modo API: entrar, pedir para gerir a página (email com código ou documento) e o painel com dados do servidor
const api = vi.fn();
vi.mock('../../src/api/http', async (orig) => {
  const actual = await orig<typeof import('../../src/api/http')>();
  return { ...actual, apiMode: true, api: (...a: unknown[]) => api(...a) };
});
vi.mock('../../src/api/orgs', async (orig) => {
  const actual = await orig<typeof import('../../src/api/orgs')>();
  const { ORG_BY_ID, ORGS } = await import('../../src/data/orgs');
  return {
    ...actual,
    useOrg: (id?: string | null) => (id ? ORG_BY_ID[id] : undefined),
    useOrgs: () => ORGS,
    useSearch: (q: string) => ({ items: q ? ORGS.filter((o) => o.name.toLowerCase().includes(q.toLowerCase())) : [], loading: false }),
  };
});
let session: { user: { email: string } | null; ready: boolean } = { user: null, ready: true };
const loadOrg = vi.fn();
vi.mock('../../src/lib/store', async (orig) => {
  const actual = await orig<typeof import('../../src/lib/store')>();
  return {
    ...actual,
    useStore: () => {
      const s = actual.useStore();
      return { ...s, user: session.user, remote: { ...s.remote, ready: session.ready }, loadOrg };
    },
  };
});
const { ApiError } = await import('../../src/api/http');
const { default: Painel } = await import('../../src/pages/Painel');

const iso = new Date().toISOString();
const DASH = {
  org: { id: 'padaria-ribeira', name: 'Padaria Ribeira', city: 'Porto', plan: 'free' },
  week: { newReviews: 2, answered: 0, unanswered: 1, scoreDelta: -0.2 },
  rank: { position: 2, total: 7, city: 'Porto' },
  tags: [{ label: 'Salário em atraso', n: 1, up: true }],
  pending: [{ id: 'r9', avg: 3, tags: ['Salário em atraso'], text: 'Pagam sempre tarde.', createdAt: iso }],
  pro: null,
};
let mine: { orgs: unknown[]; claims: unknown[] } = { orgs: [], claims: [] };
function routes(extra: Record<string, unknown> = {}) {
  api.mockImplementation(async (path: string) => {
    if (path in extra) {
      const v = extra[path];
      if (v instanceof Error) throw v;
      return v;
    }
    if (path === '/me/orgs') return mine;
    if (path === '/orgs/padaria-ribeira/dashboard') return DASH;
    return { items: [] };
  });
}
const show = (viewport: 'mobile' | 'desktop', route = '/painel') => renderScreen(<Painel />, { route, path: '/painel', viewport });

describe.each(['mobile', 'desktop'] as const)('Painel, modo API (%s)', (viewport) => {
  beforeEach(() => {
    localStorage.clear();
    api.mockReset();
    loadOrg.mockReset();
    mine = { orgs: [], claims: [] };
    routes();
    session = { user: { email: 'rosa@x.pt' }, ready: true };
  });

  it('sem sessão: entrar e voltar ao painel', () => {
    session = { user: null, ready: true };
    show(viewport, '/painel?org=padaria-ribeira');
    expect(screen.getByRole('link', { name: 'Entrar' })).toHaveAttribute('href', '/entrar?next=%2Fpainel%3Forg%3Dpadaria-ribeira');
  });

  it('sem páginas: pedidos feitos e pedir por email (código) para a organização sugerida', async () => {
    mine = { orgs: [], claims: [{ id: 'c1', orgId: 'cafe-vinha', orgName: 'Café Vinha', method: 'email', status: 'rejected', note: 'Não confirmámos o cargo.', createdAt: iso }] };
    const { user } = show(viewport, '/painel?org=padaria-ribeira');
    expect(await screen.findByRole('heading', { level: 1, name: 'Gerir a página da tua organização' })).toBeInTheDocument();
    expect(screen.getByText(/Recusado — Não confirmámos o cargo\./)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Padaria Ribeira/ })).toHaveAttribute('aria-pressed', 'true');
    const send = screen.getByRole('button', { name: 'Receber código' });
    expect(send).toBeDisabled();
    await user.type(screen.getByLabelText('O teu nome'), 'Rosa Lima');
    await user.type(screen.getByLabelText('Cargo'), 'Gerente');
    await user.type(screen.getByLabelText('Email de trabalho'), 'rosa@padariaribeira.pt');
    await user.click(send);
    expect(api).toHaveBeenCalledWith('/orgs/padaria-ribeira/claim/email', { body: { email: 'rosa@padariaribeira.pt', lang: 'pt' } });
    await user.type(await screen.findByLabelText('Código que recebeste por email'), '12a3456');
    await user.click(screen.getByRole('button', { name: 'Confirmar e enviar pedido' }));
    expect(api).toHaveBeenCalledWith('/orgs/padaria-ribeira/claim/email/confirm', { body: { code: '123456', name: 'Rosa Lima', role: 'Gerente' } });
    expect(await screen.findByText('Pedido enviado.')).toBeInTheDocument();
  });

  it('pedir com documento; erros do servidor aparecem', async () => {
    routes({ '/orgs/lavandaria-sol/claim/document': new ApiError(422, { message: 'Não encontrámos o NIF da organização neste documento.' }) });
    const { user } = show(viewport);
    await user.type(await screen.findByLabelText('Organização'), 'lavandaria');
    await user.click(screen.getByRole('button', { name: /Lavandaria Sol/ }));
    await user.type(screen.getByLabelText('O teu nome'), 'Rui');
    await user.type(screen.getByLabelText('Cargo'), 'Sócio');
    await user.click(screen.getByRole('button', { name: 'Documento com o NIF' }));
    await user.upload(screen.getByLabelText(/Certidão, declaração ou ata/), new File(['%PDF'], 'certidao.pdf', { type: 'application/pdf' }));
    await user.click(screen.getByRole('button', { name: 'Enviar pedido' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Não encontrámos o NIF da organização neste documento.');
    const [path, opts] = api.mock.calls.find((c) => c[0] === '/orgs/lavandaria-sol/claim/document')!;
    expect(path).toBe('/orgs/lavandaria-sol/claim/document');
    expect((opts.form as FormData).get('role')).toBe('Sócio');
  });

  it('quem gere: painel com dados do servidor; responder vai para o servidor; sem Pro mostra o que o Pro acrescenta', async () => {
    mine = { orgs: [{ id: 'padaria-ribeira', name: 'Padaria Ribeira', plan: 'free' }], claims: [] };
    const { user } = show(viewport);
    expect(await screen.findByRole('heading', { level: 1, name: 'Padaria Ribeira' })).toBeInTheDocument();
    expect(screen.getByText(/▼ 0,2 esta semana/)).toBeInTheDocument();
    expect(screen.getByRole('status')).toHaveTextContent('1 sem resposta');
    expect(screen.getByText(/Com o plano Pro/)).toBeInTheDocument();
    const article = screen.getByRole('article');
    expect(within(article).getByText('Pagam sempre tarde.')).toBeInTheDocument();
    await user.click(within(article).getByRole('button', { name: 'Responder' }));
    await user.type(within(article).getByRole('textbox'), 'Obrigado pela avaliação.');
    await user.click(within(article).getByRole('button', { name: 'Publicar resposta' }));
    expect(api).toHaveBeenCalledWith('/reviews/r9/reply', { method: 'PUT', body: { text: 'Obrigado pela avaliação.' } });
    expect(await within(article).findByText('A tua resposta · publicada')).toBeInTheDocument();
    expect(loadOrg).toHaveBeenCalledWith('padaria-ribeira', true);
    expect(screen.getByRole('status')).toHaveTextContent('Tudo respondido');
  });

  it('erro ao responder fica na caixa; Pro mostra a média do setor; várias páginas escolhem-se', async () => {
    mine = { orgs: [{ id: 'padaria-ribeira', name: 'Padaria Ribeira', plan: 'pro' }, { id: 'cafe-vinha', name: 'Café Vinha', plan: 'free' }], claims: [] };
    routes({
      '/orgs/padaria-ribeira/dashboard': { ...DASH, org: { ...DASH.org, plan: 'pro' }, pro: { criteria: { respeito: { now: 4.8, delta: 0.1 } }, peers: { sector: 'Restauração', count: 4, score: 3.9 } } },
      '/orgs/cafe-vinha/dashboard': { ...DASH, org: { id: 'cafe-vinha', name: 'Café Vinha', city: 'Vila Nova de Gaia', plan: 'free' } },
      '/reviews/r9/reply': new ApiError(422, { message: 'Descreve situações, sem nomes nem insultos.' }),
    });
    const { user } = show(viewport);
    expect(await screen.findByText(/Média do setor \(Restauração\)/)).toBeInTheDocument();
    const article = screen.getByRole('article');
    await user.click(within(article).getByRole('button', { name: 'Responder' }));
    await user.type(within(article).getByRole('textbox'), 'O Ricardo é um idiota.');
    await user.click(within(article).getByRole('button', { name: 'Publicar resposta' }));
    expect(await within(article).findByRole('alert')).toHaveTextContent('Descreve situações, sem nomes nem insultos.');
    await user.selectOptions(screen.getByLabelText('Página'), 'cafe-vinha');
    expect(await screen.findByRole('heading', { level: 1, name: 'Café Vinha' })).toBeInTheDocument();
  });

  it('erro ao carregar as páginas', async () => {
    routes({ '/me/orgs': new ApiError(500, { message: 'Falhou a base de dados.' }) });
    show(viewport);
    expect(await screen.findByRole('alert')).toHaveTextContent('Falhou a base de dados.');
  });
});
