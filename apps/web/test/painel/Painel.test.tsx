import { screen, within } from '@testing-library/react';
import { beforeEach, describe, expect, it } from 'vitest';
import Painel from '../../src/pages/Painel';
import { renderScreen } from '../utils/render';

const show = (viewport: 'mobile' | 'desktop') => renderScreen(<Painel />, { route: '/painel', path: '/painel', viewport });

describe.each(['mobile', 'desktop'] as const)('Painel da organização (%s)', (viewport) => {
  beforeEach(() => localStorage.clear());

  it('resumo: nome, nota, variação da semana e ligação à página pública', async () => {
    show(viewport);
    expect(await screen.findByRole('heading', { level: 1, name: 'Padaria Ribeira' })).toBeInTheDocument();
    expect(screen.getByRole('img', { name: 'Nota 4,4 de 5' })).toBeInTheDocument();
    expect(screen.getByText(/▲ 0,1 esta semana/)).toBeInTheDocument();
    expect(screen.getByText(/· 23 avaliações/)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Ver página pública/ })).toHaveAttribute('href', '/org/padaria-ribeira');
    expect(screen.getByText(/Não vês quem avaliou/)).toBeInTheDocument();
  });

  it('pulso da semana: novas, posição na cidade, respondidas e etiquetas', async () => {
    const { user } = show(viewport);
    const toggle = await screen.findByRole('button', { name: /Ver o pulso da semana/ });
    expect(toggle).toHaveAttribute('aria-expanded', 'false');
    await user.click(toggle);
    const pulse = screen.getByRole('region', { name: 'Pulso da semana' });
    expect(within(pulse).getByText('avaliações novas').previousSibling).toHaveTextContent('3');
    expect(within(pulse).getByText(/^em Porto/).previousSibling!.textContent).toMatch(/^\d+\.º$/);
    expect(within(pulse).getByText('respondidas').previousSibling).toHaveTextContent('0/3');
    const tags = within(pulse).getByRole('list', { name: 'Etiquetas mais usadas esta semana' });
    expect(within(tags).getAllByRole('listitem').length).toBeGreaterThan(0);
    expect(within(tags).getAllByLabelText(/menções, a (subir|descer)$/).length).toBeGreaterThan(0);
    await user.click(screen.getByRole('button', { name: /Esconder o pulso da semana/ }));
    expect(screen.queryByRole('region', { name: 'Pulso da semana' })).not.toBeInTheDocument();
  });

  it('responder: sugestão pré-preenchida, cancelar, publicar e editar', async () => {
    const { user } = show(viewport);
    expect(await screen.findByRole('status')).toHaveTextContent('3 sem resposta');
    const first = screen.getAllByRole('article')[0];
    await user.click(within(first).getByRole('button', { name: 'Responder' }));
    const box = within(first).getByLabelText('Resposta pública, visível para todos');
    expect(box).toHaveValue('Obrigado pelas palavras. Vamos rever os prémios de fim de ano com a equipa.');
    await user.click(within(first).getByRole('button', { name: 'Cancelar' }));
    expect(within(first).queryByRole('textbox')).not.toBeInTheDocument();

    await user.click(within(first).getByRole('button', { name: 'Responder' }));
    const text = within(first).getByRole('textbox');
    await user.clear(text);
    expect(within(first).getByRole('button', { name: 'Publicar resposta' })).toBeDisabled();
    await user.type(text, '  Obrigado!  ');
    await user.click(within(first).getByRole('button', { name: 'Publicar resposta' }));
    expect(within(first).getByText('A tua resposta · publicada')).toBeInTheDocument();
    expect(within(first).getByText('Obrigado!')).toBeInTheDocument();
    expect(screen.getByRole('status')).toHaveTextContent('2 sem resposta');

    await user.click(within(first).getByRole('button', { name: 'Editar resposta' }));
    expect((within(first).getByRole('textbox') as HTMLTextAreaElement).value.trim()).toBe('Obrigado!');
  });

  it('tudo respondido', async () => {
    const { user } = show(viewport);
    for (const article of await screen.findAllByRole('article')) {
      await user.click(within(article).getByRole('button', { name: 'Responder' }));
      const text = within(article).getByRole('textbox');
      if (!(text as HTMLTextAreaElement).value) await user.type(text, 'Obrigado.');
      await user.click(within(article).getByRole('button', { name: 'Publicar resposta' }));
    }
    expect(screen.getByRole('status')).toHaveTextContent('Tudo respondido ✓');
  });

  it('critérios: 3 principais com a variação da semana; depois os 8', async () => {
    const { user } = show(viewport);
    const section = (await screen.findByRole('heading', { name: 'Critérios' })).closest('section')!;
    expect(within(section).getAllByRole('group')).toHaveLength(3);
    expect(within(section).getAllByRole('group')[0]).toHaveAccessibleName(/esta semana$/);
    await user.click(within(section).getByRole('button', { name: 'Ver todos os 8' }));
    expect(within(section).getAllByRole('group')).toHaveLength(8);
    expect(within(section).getByRole('button', { name: 'Ver só os 3 principais' })).toHaveAttribute('aria-expanded', 'true');
  });

  it('respeito e inclusão: nota, selo e etiquetas', async () => {
    show(viewport);
    const section = (await screen.findByRole('heading', { name: 'Respeito e inclusão' })).closest('section')!;
    expect(within(section).getByRole('img', { name: 'Respeito e inclusão 4,8 de 5' })).toBeInTheDocument();
    expect(within(section).getByText(/Tens o selo/)).toBeInTheDocument();
    expect(within(section).getAllByRole('listitem').length).toBeGreaterThan(0);
    expect(within(section).getByText(/relatos de assédio|Sem relatos de assédio/)).toBeInTheDocument();
  });
});
