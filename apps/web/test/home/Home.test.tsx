import { screen, within } from '@testing-library/react';
import { useLocation } from 'react-router-dom';
import { beforeEach, describe, expect, it } from 'vitest';
import Home from '../../src/pages/Home';
import { renderScreen } from '../utils/render';

function Where() {
  const { pathname, search } = useLocation();
  return <output data-testid="where">{pathname + search}</output>;
}
const show = (viewport: 'mobile' | 'desktop', route = '/') => renderScreen(<Home />, { route, path: '/', viewport, outside: <Where /> });
const where = () => screen.getByTestId('where').textContent;
const peekDoor = () => screen.getByRole('button', { name: /^Espreitar/ });
const jobDoor = () => screen.getByRole('button', { name: /^O teu trabalho/ });

describe.each(['mobile', 'desktop'] as const)('Página inicial (%s)', (viewport) => {
  beforeEach(() => localStorage.clear());
  const desktop = viewport === 'desktop';

  it('começa com as duas zonas, sem formulários: cada uma é um botão', () => {
    show(viewport);
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('PeekJob');
    expect(peekDoor()).toHaveAttribute('aria-expanded', 'false');
    expect(jobDoor()).toHaveAttribute('aria-expanded', 'false');
    expect(screen.queryByRole('searchbox')).not.toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'Avaliar onde trabalho' })).not.toBeInTheDocument();
  });

  it('espreitar: a zona de cima ocupa o ecrã e mostra a pesquisa; pesquisar leva aos resultados', async () => {
    const { user } = show(viewport);
    await user.click(peekDoor());
    expect(where()).toBe('/?lado=espreitar');
    const panel = screen.getByRole('region', { name: 'Como é trabalhar lá dentro?' });
    const box = within(panel).getByRole('searchbox', { name: 'Pesquisar organização' });
    // no computador o campo fica pronto a escrever; no telemóvel não abre o teclado sozinho
    if (desktop) expect(box).toHaveFocus();
    else expect(box).not.toHaveFocus();
    expect(within(panel).getByRole('link', { name: 'Ver todas as organizações' })).toHaveAttribute('href', '/explorar');
    await user.type(box, 'padaria ribeira{Enter}');
    expect(where()).toBe('/pesquisa?q=padaria+ribeira');
  });

  it('pesquisa vazia vai para a pesquisa sem termo', async () => {
    const { user } = show(viewport, '/?lado=espreitar');
    await user.click(screen.getByRole('button', { name: 'Procurar' }));
    expect(where()).toBe('/pesquisa');
  });

  it('o teu trabalho: a zona de baixo ocupa o ecrã com o convite para avaliar', async () => {
    const { user } = show(viewport);
    await user.click(jobDoor());
    expect(where()).toBe('/?lado=avaliar');
    const panel = screen.getByRole('region', { name: 'Conta como é. Sem dar a cara.' });
    const cta = within(panel).getByRole('link', { name: 'Avaliar onde trabalho' });
    expect(cta).toHaveAttribute('href', '/avaliar');
    if (desktop) expect(cta).toHaveFocus();
  });

  it('a zona aberta ocupa a página: a outra retrai-se e não tem nada clicável', async () => {
    const { user } = show(viewport, '/?lado=espreitar');
    expect(screen.queryByRole('button', { name: /^O teu trabalho/ })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /^Espreitar/ })).not.toBeInTheDocument();
    expect(screen.getByRole('main')).toHaveAttribute('data-zone', 'peek');
    await user.click(screen.getByRole('button', { name: 'Voltar ao início' }));
    expect(screen.getByRole('main')).toHaveAttribute('data-zone', 'none');
    expect(jobDoor()).toBeInTheDocument();
  });

  it('voltar (botão ou Escape) regressa às duas zonas', async () => {
    const { user } = show(viewport);
    await user.click(jobDoor());
    await user.click(screen.getByRole('button', { name: 'Voltar ao início' }));
    expect(where()).toBe('/');
    expect(jobDoor()).toHaveFocus();
    await user.click(peekDoor());
    await user.keyboard('{Escape}');
    expect(where()).toBe('/');
    expect(peekDoor()).toHaveAttribute('aria-expanded', 'false');
  });

  it('ligação direta para uma zona abre-a logo', () => {
    show(viewport, '/?lado=avaliar');
    expect(screen.getByRole('link', { name: 'Avaliar onde trabalho' })).toBeInTheDocument();
    show(viewport, '/?lado=outra-coisa');
    expect(screen.getAllByRole('button', { name: /^Espreitar/ }).length).toBeGreaterThan(0);
  });
});

describe('Página inicial (computador): começar a escrever', () => {
  beforeEach(() => localStorage.clear());
  it('uma letra nas duas zonas abre a pesquisa com essa letra', async () => {
    const { user } = show('desktop');
    await user.keyboard('p');
    expect(where()).toBe('/?lado=espreitar');
    expect(screen.getByRole('searchbox')).toHaveValue('p');
    await user.keyboard('a');
    expect(screen.getByRole('searchbox')).toHaveValue('pa');
  });

  it('atalhos com Ctrl/Cmd não abrem nada', async () => {
    const { user } = show('desktop');
    await user.keyboard('{Control>}c{/Control}');
    expect(where()).toBe('/');
  });
});
