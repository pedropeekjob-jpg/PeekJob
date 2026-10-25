import { screen, within } from '@testing-library/react';
import { beforeEach, describe, expect, it } from 'vitest';
import Setores from '../../src/pages/Setores';
import { renderScreen } from '../utils/render';

const show = (viewport: 'mobile' | 'desktop') => renderScreen(<Setores />, { route: '/setores', path: '/setores', viewport });
const sectorLinks = () => screen.getAllByRole('link').filter((a) => a.getAttribute('href')?.includes('setor='));
const sectorNames = () => sectorLinks().map((a) => a.querySelector('.ellipsis')!.textContent);

describe.each(['mobile', 'desktop'] as const)('Setores (%s)', (viewport) => {
  beforeEach(() => localStorage.clear());

  it('tipos com nota média e número de organizações', async () => {
    show(viewport);
    expect(await screen.findByRole('heading', { level: 1, name: 'Encontra o teu tipo de lugar.' })).toBeInTheDocument();
    const group = screen.getByRole('group', { name: 'Tipo de organização' });
    const buttons = within(group).getAllByRole('button');
    expect(buttons.map((b) => b.querySelector('.num')!.textContent)).toEqual(['Empresa', 'Associação', 'Voluntariado', 'Nome individual']);
    expect(within(buttons[0]).getByText(/^\d+ organizaç/)).toBeInTheDocument();
    expect(within(buttons[0]).getByRole('img', { name: /^Nota média \d,\d de 5$/ })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Ver ranking · todos os tipos/ })).toHaveAttribute('href', '/ranking');
  });

  it('setores ordenados pela nota; liga ao ranking filtrado', async () => {
    show(viewport);
    await screen.findByRole('heading', { level: 1 });
    expect(screen.getByText(/^\d+ setores$/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Melhor nota' })).toHaveAttribute('aria-pressed', 'true');
    // média ponderada pelo n.º de avaliações: Ação social 4,6 > Comunidade (4,7×14 + 4,5×15)/29 ≈ 4,597
    expect(sectorNames()[0]).toBe('Ação social');
    const saude = sectorLinks().find((a) => a.textContent!.includes('Saúde'))!;
    expect(saude).toHaveAttribute('href', '/ranking?setor=Sa%C3%BAde');
    expect(within(saude).getByLabelText(/^Respeito e inclusão \d,\d de 5$/)).toBeInTheDocument();
  });

  it('ordenar por respeito e por número de organizações', async () => {
    const { user } = show(viewport);
    await screen.findByRole('heading', { level: 1 });
    await user.click(screen.getByRole('button', { name: 'Mais respeito' }));
    const byResp = sectorNames();
    await user.click(screen.getByRole('button', { name: /Mais org/ }));
    const byN = sectorNames();
    expect(byResp).not.toEqual(byN);
    // Comunidade tem 2 organizações: é a primeira por número
    expect(byN[0]).toBe('Comunidade');
  });

  it('escolher um tipo filtra os setores e as ligações; voltar a todos', async () => {
    const { user } = show(viewport);
    await user.click(await screen.findByRole('button', { name: /Voluntariado/ }));
    expect(screen.getByRole('button', { name: /Voluntariado/ })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByText('1 com Voluntariado')).toBeInTheDocument();
    expect(sectorLinks()[0]).toHaveAttribute('href', '/ranking?tipo=Voluntariado&setor=Comunidade');
    expect(screen.getByRole('link', { name: /Ver ranking · Voluntariado/ })).toHaveAttribute('href', '/ranking?tipo=Voluntariado');
    await user.click(screen.getByRole('button', { name: 'Mostrar todos os tipos' }));
    expect(screen.getByRole('button', { name: /Voluntariado/ })).toHaveAttribute('aria-pressed', 'false');
    // carregar outra vez no tipo escolhido também tira o filtro
    await user.click(screen.getByRole('button', { name: /Empresa/ }));
    await user.click(screen.getByRole('button', { name: /Empresa/ }));
    expect(screen.getByText(/^\d+ setores$/)).toBeInTheDocument();
  });
});
