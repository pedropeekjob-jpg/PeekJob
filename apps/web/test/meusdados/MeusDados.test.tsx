import { screen, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import MeusDados from '../../src/pages/MeusDados';
import { renderScreen, seedStore } from '../utils/render';

const show = (viewport: 'mobile' | 'desktop') => renderScreen(<MeusDados />, { route: '/perfil/dados', path: '/perfil/dados', viewport });
const stored = () => JSON.parse(localStorage.getItem('peekjob-poc-v1') ?? '{}');
const review = { id: 'x1', orgId: 'padaria-ribeira', scores: { salario: 4 }, avg: 4, recommend: true, tags: [], text: 'Texto.', when: 'agora' };

describe.each(['mobile', 'desktop'] as const)('Os teus dados, demonstração (%s)', (viewport) => {
  const desktop = viewport === 'desktop';
  beforeEach(() => {
    localStorage.clear();
    seedStore({ user: { email: 'ana@gmail.com' }, myReviews: [review] });
  });
  afterEach(() => vi.restoreAllMocks());

  it('explica o que guardamos; no telemóvel tem barra com voltar ao perfil', async () => {
    const { user } = show(viewport);
    if (desktop) expect(screen.getByRole('heading', { level: 1, name: 'Os teus dados' })).toBeInTheDocument();
    else expect(screen.getByText('Os teus dados')).toHaveClass('ellipsis');
    expect(screen.getByText('O que guardamos sobre ti, e como o levas ou apagas.')).toBeInTheDocument();
    expect(screen.getAllByRole('listitem').map((li) => li.textContent?.slice(0, 20))).toEqual(['O teu email não é gu', 'As tuas avaliações, ', 'As verificações: só ', 'As tuas mensagens pr']);
    expect(screen.getByRole('region', { name: 'Descarregar os meus dados' })).toBeInTheDocument();
    expect(screen.getByRole('region', { name: 'Apagar a minha conta' })).toBeInTheDocument();
    if (desktop) expect(screen.queryByRole('button', { name: 'Voltar' })).not.toBeInTheDocument();
    else {
      await user.click(screen.getByRole('button', { name: 'Voltar' }));
      expect(screen.getByTestId('outra-rota')).toBeInTheDocument();
    }
  });

  it('descarregar cria um ficheiro JSON com a data', async () => {
    const createObjectURL = vi.fn(() => 'blob:x');
    Object.assign(URL, { createObjectURL, revokeObjectURL: vi.fn() });
    const click = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});
    const { user } = show(viewport);
    await user.click(screen.getByRole('button', { name: 'Descarregar' }));
    expect(createObjectURL).toHaveBeenCalledWith(expect.any(Blob));
    expect(click).toHaveBeenCalledTimes(1);
    const a = click.mock.contexts[0] as HTMLAnchorElement;
    expect(a.download).toMatch(/^peekjob-os-meus-dados-\d{4}-\d{2}-\d{2}\.json$/);
    expect(a.href).toBe('blob:x');
  });

  it('apagar pede confirmação; cancelar volta atrás', async () => {
    const { user } = show(viewport);
    const del = screen.getByRole('region', { name: 'Apagar a minha conta' });
    await user.click(within(del).getByRole('button', { name: 'Apagar a minha conta' }));
    expect(within(del).getByRole('checkbox', { name: 'Manter as minhas avaliações publicadas, sem ligação a mim' })).not.toBeChecked();
    await user.click(within(del).getByRole('button', { name: 'Cancelar' }));
    expect(within(del).queryByRole('checkbox')).not.toBeInTheDocument();
  });

  it('apagar definitivamente (sem manter): apaga também as avaliações', async () => {
    const { user } = show(viewport);
    await user.click(screen.getByRole('button', { name: 'Apagar a minha conta' }));
    await user.click(screen.getByRole('button', { name: 'Apagar definitivamente' }));
    expect(screen.getByRole('status')).toHaveTextContent('A tua conta foi apagada.Apagámos também as tuas avaliações, verificações e mensagens.');
    expect(screen.getByRole('link', { name: 'Voltar ao início' })).toHaveAttribute('href', '/');
    expect(stored()).toMatchObject({ user: null, myReviews: [] });
  });

  it('apagar mantendo as avaliações', async () => {
    const { user } = show(viewport);
    await user.click(screen.getByRole('button', { name: 'Apagar a minha conta' }));
    await user.click(screen.getByRole('checkbox'));
    await user.click(screen.getByRole('button', { name: 'Apagar definitivamente' }));
    expect(screen.getByRole('status')).toHaveTextContent('As tuas avaliações continuam publicadas, mas já não estão ligadas a ti.');
    expect(stored().myReviews).toHaveLength(1);
  });
});
