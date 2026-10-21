import { screen, within } from '@testing-library/react';
import { useLocation } from 'react-router';
import { beforeEach, describe, expect, it } from 'vitest';
import Inicio from '../../src/pages/Inicio';
import { renderScreen, seedStore } from '../utils/render';

function Where() {
  const { pathname, search } = useLocation();
  return <div data-testid="where">{pathname + search}</div>;
}
const show = (viewport: 'mobile' | 'desktop') => renderScreen(<Inicio />, { route: '/explorar', path: '/explorar', viewport, outside: <Where /> });
const forYou = (id: string) => screen.getByRole('heading', { name: 'Para ti' }).closest('section')!.querySelectorAll(`a[href^="/org/"]`) as NodeListOf<HTMLAnchorElement>;

describe.each(['mobile', 'desktop'] as const)('Início (%s)', (viewport) => {
  const desktop = viewport === 'desktop';
  beforeEach(() => localStorage.clear());

  it('na primeira visita abre logo (sem questionário): as mais bem avaliadas e um convite para ordenar por prioridades', async () => {
    seedStore({ onboarded: false });
    const { user } = show(viewport);
    expect(await screen.findByRole('heading', { level: 1 })).toBeInTheDocument();
    expect(screen.getByTestId('where')).toHaveTextContent('/explorar');
    const section = screen.getByRole('heading', { name: 'Mais bem avaliadas' }).closest('section')!;
    const links = section.querySelectorAll('a[href^="/org/"]');
    expect(links[0]).toHaveTextContent('Rede Vizinha');
    // sem prioridades escolhidas não há "% para ti" (a nota já está no anel)
    expect(section).not.toHaveTextContent(/\d+%/);
    expect(screen.queryByRole('heading', { name: 'Para ti' })).not.toBeInTheDocument();
    await user.click(within(section as HTMLElement).getByRole('link', { name: /Ordenar pelo que importa para ti/ }));
    expect(screen.getByTestId('where')).toHaveTextContent('/preferencias');
  });

  it('para ti: organizações com a compatibilidade, pela ordem das prioridades', async () => {
    seedStore({ onboarded: true });
    show(viewport);
    expect(await screen.findByRole('heading', { level: 1 })).toBeInTheDocument();
    const links = forYou('d');
    expect(links).toHaveLength(desktop ? 4 : 3);
    // mais organizações a um toque, nos dois tamanhos
    expect(screen.getByRole('link', { name: 'Ver mais organizações →' })).toHaveAttribute('href', '/pesquisa');
    expect(links[0]).toHaveTextContent(/\d+%/);
    const pct = [...links].map((a) => Number(/(\d+)%/.exec(a.textContent!)![1]));
    expect([...pct].sort((a, b) => b - a)).toEqual(pct);
    if (!desktop) expect(screen.getByText(/^Pela tua ordem: /)).toBeInTheDocument();
  });

  it('sem prioridades ordena pela nota', async () => {
    seedStore({ onboarded: true, prefs: [] });
    show(viewport);
    await screen.findByRole('heading', { level: 1 });
    // a mesma linha nos dois tamanhos; no computador as opções abrem com "Mudar"
    expect(screen.getByText('Sem prioridades: ordenado pela nota')).toBeInTheDocument();
    // pela nota: Rede Vizinha (4,7) primeiro, sem "% para ti"
    expect(forYou('x')[0]).toHaveTextContent('Rede Vizinha');
    expect(forYou('x')[0]).not.toHaveTextContent('%');
  });

  it('pulso da semana: subidas e descidas e temas', async () => {
    seedStore({ onboarded: true });
    show(viewport);
    const pulse = await screen.findByRole('region', { name: 'Pulso da semana' });
    expect(within(pulse).getAllByText(/^▲ \d,\d$/).length).toBeGreaterThan(0);
    expect(within(pulse).getAllByText(/^▼ \d,\d$/).length).toBeGreaterThan(0);
    expect(within(pulse).getAllByRole('link').some((a) => a.getAttribute('href')?.startsWith('/org/'))).toBe(true);
  });
});

describe('Início no telemóvel', () => {
  beforeEach(() => localStorage.clear());
  it('as duas ações principais e o perfil', async () => {
    seedStore({ onboarded: true });
    show('mobile');
    expect(await screen.findByRole('link', { name: /Procurar uma organização/ })).toHaveAttribute('href', '/pesquisa');
    expect(screen.getByRole('link', { name: /Avaliar onde trabalho.*3 passos/ })).toHaveAttribute('href', '/avaliar');
    for (const a of screen.getAllByRole('link', { name: 'Perfil' })) expect(a).toHaveAttribute('href', '/perfil');
  });
});

describe('Início no computador', () => {
  beforeEach(() => localStorage.clear());

  it('pesquisar leva à pesquisa com o texto', async () => {
    seedStore({ onboarded: true });
    const { user } = show('desktop');
    await user.type(await screen.findByRole('combobox', { name: 'Pesquisar organização' }), ' padaria ');
    await user.click(screen.getByRole('button', { name: 'Procurar' }));
    expect(screen.getByTestId('where')).toHaveTextContent('/pesquisa?q=padaria');
  });

  it('pesquisar vazio leva à pesquisa', async () => {
    seedStore({ onboarded: true });
    const { user } = show('desktop');
    await user.click(await screen.findByRole('button', { name: 'Procurar' }));
    expect(screen.getByTestId('where')).toHaveTextContent(/^\/pesquisa$/);
  });

  it('escolher prioridades (até 3) reordena; a 4.ª fica bloqueada', async () => {
    seedStore({ onboarded: true, prefs: [] });
    const { user } = show('desktop');
    // fechadas por omissão: o ecrã mostra só a linha com o que valorizas
    await screen.findByText('Sem prioridades: ordenado pela nota');
    expect(screen.queryByRole('group', { name: 'O que valorizas, até 3' })).not.toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Mudar' }));
    const group = screen.getByRole('group', { name: 'O que valorizas, até 3' });
    await user.click(within(group).getByRole('button', { name: /^Salário justo/ }));
    expect(within(group).getByRole('button', { name: /^Salário justo/ })).toHaveAttribute('aria-pressed', 'true');
    expect(within(group).getByText('1 de 3')).toBeInTheDocument();
    await user.click(within(group).getByRole('button', { name: /^Ambiente/ }));
    await user.click(within(group).getByRole('button', { name: /^Equilíbrio/ }));
    expect(within(group).getByText('3 de 3 · clica de novo para tirar')).toBeInTheDocument();
    const fourth = within(group).getByRole('button', { name: /^Liderança/ });
    expect(fourth).toHaveAttribute('aria-disabled', 'true');
    expect(fourth).toHaveAttribute('title', 'Já escolheste 3. Tira uma para trocar.');
    expect(within(group).getByRole('button', { name: /^Salário justo.*prioridade 1/ })).toBeInTheDocument();
    await user.click(within(group).getByRole('button', { name: /^Salário justo/ }));
    expect(within(group).getByText('2 de 3')).toBeInTheDocument();
  });

  it('a nota não está à venda: promessas e ligação à metodologia', async () => {
    seedStore({ onboarded: true });
    show('desktop');
    expect(await screen.findByRole('heading', { name: 'A nota não está à venda.' })).toBeInTheDocument();
    expect(screen.getByText('Ninguém paga para subir')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Ver como calculamos/ })).toHaveAttribute('href', '/metodologia');
  });
});

describe('Início (telemóvel): a fita do pulso', () => {
  beforeEach(() => localStorage.clear());
  it('desliza na horizontal e chega-se lá com o teclado', async () => {
    seedStore({ onboarded: true });
    show('mobile');
    const strip = await screen.findByRole('group', { name: 'Subidas, descidas e temas da semana' });
    expect(strip).toHaveAttribute('tabindex', '0');
  });
});
