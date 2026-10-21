import { screen, within } from '@testing-library/react';
import { beforeEach, describe, expect, it } from 'vitest';
import Relatorio from '../../src/pages/Relatorio';
import { renderScreen } from '../utils/render';

const show = (viewport: 'mobile' | 'desktop', q = '') => renderScreen(<Relatorio />, { route: `/painel/relatorio${q}`, path: '/painel/relatorio', viewport });

describe.each(['mobile', 'desktop'] as const)('Relatório semanal e mensal (%s, demonstração)', (viewport) => {
  beforeEach(() => localStorage.clear());

  it('semanal por omissão: resultados, comparação, fortes, a melhorar e níveis', async () => {
    show(viewport);
    expect(await screen.findByRole('heading', { level: 1, name: /Relatório semanal · Padaria Ribeira/ })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Semanal' })).toHaveAttribute('aria-current', 'page');
    for (const h of ['Resultados', 'Comparação com a concorrência', 'Pontos fortes', 'O que melhorar, e como', 'Níveis de satisfação']) {
      expect(screen.getByRole('heading', { level: 2, name: h })).toBeInTheDocument();
    }
    expect(screen.getByText(/Comparado com 6 organizações do setor Restauração/)).toBeInTheDocument();
    const table = screen.getByRole('table');
    expect(within(table).getByRole('rowheader', { name: 'Salário justo' })).toBeInTheDocument();
    // o que melhorar traz o "como"
    const improve = screen.getByRole('heading', { name: 'O que melhorar, e como' }).closest('section')!;
    expect(within(improve).getAllByRole('listitem').length).toBeGreaterThan(0);
    expect(within(improve).getByText(/Paga sempre no mesmo dia/)).toBeInTheDocument();
    expect(screen.getByRole('list', { name: 'Avaliações por nível de satisfação' }).children).toHaveLength(5);
    expect(screen.getByRole('button', { name: /Imprimir ou guardar em PDF/ })).toBeInTheDocument();
  });

  it('mensal pelo endereço: mais avaliações e a relação com recomendar', async () => {
    show(viewport, '?periodo=mes');
    expect(await screen.findByRole('heading', { level: 1, name: /Relatório mensal/ })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Mensal' })).toHaveAttribute('aria-current', 'page');
    expect(screen.getByRole('heading', { level: 3, name: 'O que mais pesa em recomendar' })).toBeInTheDocument();
    expect(screen.getAllByText(/quem recomenda dá/).length).toBeGreaterThan(0);
  });
});
