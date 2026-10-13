import { screen, within } from '@testing-library/react';
import { beforeEach, describe, expect, it } from 'vitest';
import ParaOrganizacoes from '../../src/pages/ParaOrganizacoes';
import { renderScreen } from '../utils/render';

const show = (viewport: 'mobile' | 'desktop') => renderScreen(<ParaOrganizacoes />, { route: '/para-organizacoes', path: '/para-organizacoes', viewport });

describe.each(['mobile', 'desktop'] as const)('Para organizações (%s)', (viewport) => {
  beforeEach(() => localStorage.clear());

  it('abertura: título, públicos e caminhos para reivindicar e para a metodologia', () => {
    show(viewport);
    const hero = screen.getByRole('region', { name: 'A tua equipa já fala de ti. Responde.' });
    expect(within(hero).getByText('Para organizações')).toBeInTheDocument();
    expect(within(hero).getByText('Para PME, associações, voluntariado e nome individual.')).toBeInTheDocument();
    expect(within(hero).getByRole('link', { name: 'Reivindicar a minha página' })).toHaveAttribute('href', '/painel');
    expect(within(hero).getByRole('link', { name: 'Como calculamos' })).toHaveAttribute('href', '/metodologia');
    // o anel de exemplo é decorativo (Padaria Ribeira: 4,4 e a subir 0,1)
    expect(hero.querySelector('[aria-hidden="true"]')?.textContent).toBe('4,4▲ 0,1 esta semana');
  });

  it('como funciona: três passos numerados', () => {
    show(viewport);
    const steps = within(screen.getByRole('region', { name: 'Como funciona' })).getAllByRole('listitem');
    expect(steps.map((li) => li.textContent)).toEqual([
      '1Reivindica a tua páginaEmail do domínio, documento da associação ou NIF.',
      '2Responde em públicoA resposta fica por baixo de cada avaliação.',
      '3Vê o pulso da semanaO que subiu, o que desceu e as tags.',
    ]);
  });

  it('perguntas frequentes: abrir uma mostra a resposta', async () => {
    const { user } = show(viewport);
    const faq = screen.getByRole('region', { name: 'Perguntas frequentes' });
    expect(within(faq).getAllByRole('button')).toHaveLength(5);
    expect(within(faq).getByRole('link', { name: 'Como calculamos' })).toHaveAttribute('href', '/metodologia');
    const q = within(faq).getByRole('button', { name: 'Pagar o Pro melhora a nossa posição?' });
    expect(q).toHaveAttribute('aria-expanded', 'false');
    await user.click(q);
    expect(q).toHaveAttribute('aria-expanded', 'true');
    expect(within(faq).getByText(/^Nunca\. O ranking depende só das avaliações/)).toBeInTheDocument();
  });

  it('planos: grátis e Pro, com o que inclui cada um', () => {
    show(viewport);
    const plans = screen.getByRole('region', { name: 'Planos' });
    expect(within(plans).getByText('Nunca vendemos posição no ranking nem apagamos avaliações.')).toBeInTheDocument();
    const free = within(plans).getByRole('article', { name: 'Grátis' });
    expect(within(free).getByText('0 €')).toBeInTheDocument();
    expect(within(free).getByText('para sempre')).toBeInTheDocument();
    expect(within(free).getAllByRole('listitem').map((li) => li.textContent)).toEqual(['Reivindicar a página', 'Responder a avaliações', 'Resumo mensal por email']);
    expect(within(free).getByRole('link', { name: 'Começar grátis' })).toHaveAttribute('href', '/painel');
    const pro = within(plans).getByRole('article', { name: 'Pro' });
    expect(within(pro).getByText('por mês')).toBeInTheDocument();
    expect(within(pro).getAllByRole('listitem')).toHaveLength(3);
    expect(within(pro).getByRole('link', { name: 'Experimentar Pro' })).toHaveAttribute('href', '/painel');
  });
});
