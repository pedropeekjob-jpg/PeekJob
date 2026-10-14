import { screen, within } from '@testing-library/react';
import { beforeEach, describe, expect, it } from 'vitest';
import Moderacao from '../../src/pages/Moderacao';
import { renderScreen } from '../utils/render';

const show = (viewport: 'mobile' | 'desktop') => renderScreen(<Moderacao />, { route: '/moderacao', path: '/moderacao', viewport });
const REASON = 'Identifica uma pessoa pelo nome ou por detalhes.';

describe.each(['mobile', 'desktop'] as const)('Moderação, demonstração (%s)', (viewport) => {
  beforeEach(() => localStorage.clear());

  it('filas com contagem; denúncias com motivos e citação', async () => {
    show(viewport);
    const tabs = await screen.findByRole('tablist', { name: 'Filas' });
    expect(within(tabs).getByRole('tab', { name: /Denúncias 2/ })).toHaveAttribute('aria-selected', 'true');
    expect(within(tabs).getByRole('tab', { name: /Organizações novas 2/ })).toHaveAttribute('aria-selected', 'false');
    expect(screen.getByText(/Demonstração: dados de exemplo/)).toBeInTheDocument();
    const card = screen.getByRole('article', { name: 'Denúncias sobre uma avaliação de Padaria Ribeira' });
    expect(within(card).getByText(/Sr\. Joaquim/)).toBeInTheDocument();
    expect(within(card).getByText('2 denúncias')).toBeInTheDocument();
    expect(within(card).getByText('Identifica uma pessoa')).toBeInTheDocument();
    expect(within(card).getByText(/Diz o nome do encarregado\./)).toBeInTheDocument();
    expect(within(card).getByRole('link', { name: 'Padaria Ribeira' })).toHaveAttribute('href', '/org/padaria-ribeira');
  });

  it('decidir exige justificação (10+ caracteres); remover e manter tiram da fila', async () => {
    const { user } = show(viewport);
    const card = await screen.findByRole('article', { name: /Padaria Ribeira/ });
    const remove = within(card).getByRole('button', { name: 'Remover avaliação' });
    expect(remove).toBeDisabled();
    expect(within(card).getByText('Escreve ou escolhe uma justificação.')).toBeInTheDocument();
    await user.type(within(card).getByRole('textbox'), 'curto');
    expect(remove).toBeDisabled();
    await user.click(within(card).getByRole('button', { name: REASON }));
    expect(within(card).getByRole('button', { name: REASON })).toHaveAttribute('aria-pressed', 'true');
    expect(within(card).getByRole('textbox')).toHaveValue(REASON);
    await user.click(remove);
    expect(await screen.findByRole('status')).toHaveTextContent('Avaliação removida. Avisámos quem escreveu e quem denunciou.');
    expect(screen.getByRole('tab', { name: /Denúncias 1/ })).toBeInTheDocument();

    const other = screen.getAllByRole('article')[0];
    await user.type(within(other).getByRole('textbox'), 'Crítica ao trabalho, sem ataques.');
    await user.click(within(other).getByRole('button', { name: 'Manter' }));
    expect(await screen.findByText('Avaliação mantida. Avisámos quem denunciou.')).toBeInTheDocument();
    expect(screen.getByText('Sem denúncias por analisar.')).toBeInTheDocument();
  });

  it('organizações novas: aprovar, fundir num duplicado e rejeitar com motivo', async () => {
    const { user } = show(viewport);
    await user.click(await screen.findByRole('tab', { name: /Organizações novas/ }));
    const dup = screen.getByRole('article', { name: 'Padaria da Ribeira' });
    expect(within(dup).getByText('Pode ser a mesma que:')).toBeInTheDocument();
    expect(within(dup).getByText('pública')).toBeInTheDocument();
    expect(within(dup).getByText(/1 pessoa já avaliou/)).toBeInTheDocument();
    expect(within(dup).getByText(/Rua das Flores, Porto/)).toBeInTheDocument();
    await user.click(within(dup).getByRole('button', { name: 'Fundir nesta' }));
    expect(await screen.findByText('Fundida em Padaria Ribeira. O nome antigo continua a ser encontrado.')).toBeInTheDocument();

    const horta = screen.getByRole('article', { name: 'Horta Comunitária da Sé' });
    await user.click(within(horta).getByRole('button', { name: 'Rejeitar' }));
    const confirm = within(horta).getAllByRole('button', { name: 'Rejeitar' })[0];
    expect(confirm).toBeDisabled();
    await user.click(within(horta).getByRole('button', { name: 'Cancelar' }));
    expect(within(horta).queryByRole('textbox')).not.toBeInTheDocument();
    await user.click(within(horta).getByRole('button', { name: 'Rejeitar' }));
    await user.click(within(horta).getByRole('button', { name: 'É uma pessoa, não uma organização.' }));
    await user.click(within(horta).getAllByRole('button', { name: 'Rejeitar' })[0]);
    expect(await screen.findByText('Horta Comunitária da Sé foi rejeitada.')).toBeInTheDocument();
    expect(screen.getByText('Sem organizações novas por rever.')).toBeInTheDocument();
  });

  it('pedidos de revisão: o pedido, a decisão original e reverter/manter com justificação', async () => {
    const { user } = show(viewport);
    await user.click(await screen.findByRole('tab', { name: /Pedidos de revisão 1/ }));
    const card = screen.getByRole('article', { name: /Pedido de revisão sobre uma avaliação de/ });
    expect(within(card).getByText('Quem escreveu contesta a remoção')).toBeInTheDocument();
    expect(within(card).getByText(/Decisão original: Identifica uma pessoa/)).toBeInTheDocument();
    expect(within(card).getByText(/Não identifiquei ninguém/)).toBeInTheDocument();
    const reverse = within(card).getByRole('button', { name: 'Reverter a decisão' });
    expect(reverse).toBeDisabled();
    await user.type(within(card).getByRole('textbox'), 'Revisto: sem dados pessoais.');
    await user.click(reverse);
    expect(await screen.findByRole('status')).toHaveTextContent('Decisão revertida. Quem pediu a revisão foi avisado.');
    expect(screen.queryByRole('article', { name: /Pedido de revisão/ })).not.toBeInTheDocument();
  });

  it('aprovar torna pública', async () => {
    const { user } = show(viewport);
    await user.click(await screen.findByRole('tab', { name: /Organizações novas/ }));
    await user.click(within(screen.getByRole('article', { name: 'Horta Comunitária da Sé' })).getByRole('button', { name: 'Aprovar' }));
    expect(await screen.findByText('Horta Comunitária da Sé está agora pública.')).toBeInTheDocument();
  });
});
