import { screen, within } from '@testing-library/react';
import { beforeEach, describe, expect, it } from 'vitest';
import Denunciar from '../../src/pages/Denunciar';
import { renderScreen } from '../utils/render';

const PATH = '/org/:id/denunciar/:reviewId';
const show = (viewport: 'mobile' | 'desktop', item = 'r1', org = 'padaria-ribeira') => renderScreen(<Denunciar />, { route: `/org/${org}/denunciar/${item}`, path: PATH, viewport });

describe.each(['mobile', 'desktop'] as const)('Denunciar, demonstração (%s)', (viewport) => {
  const desktop = viewport === 'desktop';
  beforeEach(() => localStorage.clear());

  it('mostra o que se denuncia (avaliação ou entrevista)', async () => {
    const { unmount } = show(viewport);
    expect(await screen.findByRole('heading', { level: 1, name: 'O que está errado?' })).toBeInTheDocument();
    expect(screen.getByText('“Equipa que se ajuda e chefia que ouve.”')).toBeInTheDocument();
    unmount();
    show(viewport, 'i1');
    expect(await screen.findByText(/^Entrevista · Balcão · /)).toBeInTheDocument();
  });

  it('sem motivo não envia e diz porquê; com motivo e detalhe envia e mostra a referência', async () => {
    const { user } = show(viewport);
    const sendBtn = await screen.findByRole('button', { name: 'Enviar denúncia' });
    expect(sendBtn).toHaveAttribute('aria-disabled', 'true');
    await user.click(sendBtn);
    expect(screen.getByRole('alert')).toHaveTextContent('Escolhe um motivo para enviar.');
    expect(screen.getByRole('radiogroup', { name: 'Motivo' })).toHaveAttribute('aria-describedby', 'reason-err');

    await user.click(screen.getByRole('radio', { name: /Identifica uma pessoa/ }));
    expect(screen.getByRole('radio', { name: /Identifica uma pessoa/ })).toHaveAttribute('aria-checked', 'true');
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    if (!desktop) await user.click(screen.getByRole('button', { name: /Adicionar detalhe/ }));
    const box = screen.getByRole('textbox');
    await user.type(box, 'Diz o nome.');
    expect(screen.getByText('11/500')).toBeInTheDocument();
    await user.click(sendBtn);
    const status = screen.getByRole('status');
    expect(status).toHaveTextContent('Recebemos a tua denúncia.');
    expect(status).toHaveTextContent('Motivo: Identifica uma pessoa.');
    expect(status).toHaveTextContent('Vês a decisão nas tuas mensagens.');
    expect(within(status).getByText(/^Referência PJ-D-\d{4}$/)).toBeInTheDocument();
    expect(within(status).getByRole('link', { name: 'Voltar à organização' })).toHaveAttribute('href', '/org/padaria-ribeira');
  });

  it('apoio para situações ilegais', async () => {
    show(viewport);
    const ilegal = (await screen.findByRole('heading', { name: 'Viveste algo ilegal no trabalho?' })).closest('section')!;
    expect(within(ilegal).getByRole('link', { name: 'Ver onde pedir apoio' })).toHaveAttribute('href', '/apoio');
    expect(within(ilegal).getByText('Em perigo imediato, liga 112.')).toBeInTheDocument();
  });

  it('item que não existe (ou organização que não existe)', async () => {
    const { unmount } = show(viewport, 'nao-existe');
    expect(await screen.findByRole('heading', { level: 1, name: 'Não encontrámos o que querias denunciar.' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Voltar a Padaria Ribeira' })).toHaveAttribute('href', '/org/padaria-ribeira');
    unmount();
    show(viewport, 'r1', 'nao-existe');
    expect(await screen.findByRole('link', { name: 'Ver o ranking' })).toHaveAttribute('href', '/ranking');
  });
});

describe('Denunciar no computador', () => {
  beforeEach(() => localStorage.clear());
  it('como moderamos: 3 passos; cancelar volta à organização', async () => {
    const { user } = show('desktop');
    await user.click(await screen.findByRole('button', { name: 'Ver os 3 passos' }));
    expect(screen.getByRole('button', { name: 'Esconder os passos' })).toHaveAttribute('aria-expanded', 'true');
    expect(screen.getAllByRole('listitem')).toHaveLength(3);
    expect(screen.getByRole('link', { name: /Padaria Ribeira/ })).toHaveAttribute('href', '/org/padaria-ribeira');
    await user.click(screen.getByRole('button', { name: 'Cancelar' }));
    expect(screen.getByTestId('outra-rota')).toBeInTheDocument();
  });
});

describe('Denunciar no telemóvel', () => {
  beforeEach(() => localStorage.clear());
  it('folha com fechar (por cima e no fundo escuro)', async () => {
    show('mobile');
    const closers = await screen.findAllByRole('link', { name: 'Fechar' });
    expect(closers).toHaveLength(2);
    for (const c of closers) expect(c).toHaveAttribute('href', '/org/padaria-ribeira');
    expect(screen.getByRole('dialog', { name: 'O que está errado?' })).toBeInTheDocument();
  });
});
