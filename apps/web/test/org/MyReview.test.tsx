import { screen, within } from '@testing-library/react';
import { beforeEach, describe, expect, it } from 'vitest';
import OrgPage from '../../src/pages/OrgPage';
import { renderScreen } from '../utils/render';

/** RGPD: corrigir o texto ou apagar a minha avaliação sem apagar a conta (demonstração: a do Café da Vinha) */
const show = (viewport: 'mobile' | 'desktop') => renderScreen(<OrgPage tab="avaliacoes" />, { route: '/org/cafe-vinha', path: '/org/:id', viewport });
const mine = async () => screen.findByRole('article', { name: 'A tua avaliação' });

describe.each(['mobile', 'desktop'] as const)('A minha avaliação (%s)', (viewport) => {
  beforeEach(() => localStorage.clear());

  it('corrigir o texto: as notas ficam e aparece "editada"', async () => {
    const { user } = show(viewport);
    const card = await mine();
    await user.click(within(card).getByRole('button', { name: 'Corrigir o texto' }));
    const box = within(card).getByLabelText('O teu texto (as notas ficam iguais)');
    expect(box).toHaveValue('Boa equipa. Horários pouco previsíveis no verão.');
    // sem mudanças não há nada para guardar
    expect(within(card).getByRole('button', { name: 'Guardar' })).toBeDisabled();
    await user.clear(box);
    await user.type(box, 'Boa equipa. Os horários melhoraram este ano.');
    await user.click(within(card).getByRole('button', { name: 'Guardar' }));
    expect(within(card).getByText('Boa equipa. Os horários melhoraram este ano.')).toBeInTheDocument();
    expect(within(card).getByText(/· editada/)).toBeInTheDocument();
    expect(within(card).queryByRole('textbox')).not.toBeInTheDocument();
  });

  it('nomes e insultos bloqueiam, com a versão sugerida', async () => {
    const { user } = show(viewport);
    const card = await mine();
    await user.click(within(card).getByRole('button', { name: 'Corrigir o texto' }));
    const box = within(card).getByLabelText('O teu texto (as notas ficam iguais)');
    await user.clear(box);
    await user.type(box, 'O Rui é um idiota.');
    await user.click(within(card).getByRole('button', { name: 'Guardar' }));
    expect(within(card).getByRole('alert')).toHaveTextContent('Tira nomes de pessoas e insultos.');
    await user.click(within(card).getByRole('button', { name: 'Usar a versão sugerida' }));
    expect(box).not.toHaveValue(/Rui|idiota/);
    expect(within(card).queryByRole('alert')).not.toBeInTheDocument();
    // cancelar deixa o texto publicado como estava
    await user.click(within(card).getByRole('button', { name: 'Cancelar' }));
    expect(within(card).getByText('Boa equipa. Horários pouco previsíveis no verão.')).toBeInTheDocument();
  });

  it('apagar pede confirmação; cancelar mantém, confirmar apaga', async () => {
    const { user } = show(viewport);
    const card = await mine();
    await user.click(within(card).getByRole('button', { name: 'Apagar' }));
    expect(within(card).getByText('Apagar esta avaliação? Não dá para desfazer.')).toBeInTheDocument();
    await user.click(within(card).getByRole('button', { name: 'Cancelar' }));
    expect(within(card).queryByText(/Não dá para desfazer/)).not.toBeInTheDocument();
    await user.click(within(card).getByRole('button', { name: 'Apagar' }));
    await user.click(within(card).getByRole('button', { name: 'Apagar de vez' }));
    expect(screen.queryByRole('article', { name: 'A tua avaliação' })).not.toBeInTheDocument();
  });
});
