import { screen, within } from '@testing-library/react';
import { useLocation } from 'react-router-dom';
import { beforeEach, describe, expect, it } from 'vitest';
import { CRITERION } from '../../src/data/criteria';
import Pesquisa from '../../src/pages/Pesquisa';
import { renderScreen, seedStore } from '../utils/render';

function Where() {
  const { search } = useLocation();
  return <output data-testid="search">{search}</output>;
}
const show = (viewport: 'mobile' | 'desktop', route = '/pesquisa') => renderScreen(<Pesquisa />, { route, path: '/pesquisa', viewport, outside: <Where /> });
const search = () => screen.getByTestId('search').textContent;
const SLOW = { timeout: 2500 };

/** Nomes pela ordem dos resultados */
const names = () =>
  screen
    .getAllByRole('link')
    .filter((a) => a.getAttribute('href')?.startsWith('/org/'))
    .map((a) => a.querySelector('.ellipsis')?.textContent);

describe.each(['mobile', 'desktop'] as const)('Pesquisa (%s)', (viewport) => {
  beforeEach(() => localStorage.clear());
  const desktop = viewport === 'desktop';
  const count = (n: number) => (desktop ? `${n} resultados, por compatibilidade` : `${n} resultados, ordenados para ti`);

  it('sem termo: mostra logo todas, ordenadas pela compatibilidade (no computador as 6 primeiras e "ver mais")', async () => {
    seedStore({ prefs: [] });
    const { user } = show(viewport);
    expect(screen.getByText(count(12))).toBeInTheDocument();
    expect(screen.queryByText(/^A espreitar/)).not.toBeInTheDocument();
    expect(names().slice(0, 3)).toEqual(['Rede Vizinha', 'Associação Mãos Dadas', 'Banco de Tempo Bonfim']);
    // sem prioridades, a compatibilidade é a nota em percentagem
    const first = screen.getAllByRole('link').find((a) => a.textContent?.includes('Rede Vizinha'))!;
    expect(first).toHaveAttribute('href', '/org/rede-vizinha');
    expect(first).toHaveAttribute('data-ev', 'select_org');
    expect(first).toHaveAttribute('data-ev-org-type', 'Voluntariado');
    expect(first.textContent).toMatch(desktop ? /94% para ti/ : /94%para ti/);
    expect(within(first).getByRole('img', { name: 'Nota 4,7 de 5, 14 avaliações' })).toBeInTheDocument();
    if (desktop) {
      expect(names()).toHaveLength(6);
      await user.click(screen.getByRole('button', { name: 'Ver mais 6' }));
      expect(names()).toHaveLength(12);
      expect(screen.queryByRole('button', { name: /^Ver mais/ })).not.toBeInTheDocument();
    } else expect(names()).toHaveLength(12);
  });

  it('termo no endereço: mostra "a procurar" e depois os resultados', async () => {
    show(viewport, '/pesquisa?q=gaia');
    expect(screen.getByRole('searchbox', { name: 'Pesquisar organização' })).toHaveValue('gaia');
    expect(screen.getByText('A espreitar 12 organizações…').closest('[role=status]')).toHaveTextContent('Ordenadas pelo que valorizas');
    expect(await screen.findByText(desktop ? '1 resultado, por compatibilidade' : '1 resultado, ordenado para ti', undefined, SLOW)).toBeInTheDocument();
    expect(names()).toEqual(['Café Vinha']);
  });

  it('escrever muda o endereço; limpar esvazia o campo e devolve o foco', async () => {
    const { user } = show(viewport);
    const box = screen.getByRole('searchbox', { name: 'Pesquisar organização' });
    await user.type(box, 'maia');
    expect(search()).toBe('?q=maia');
    expect(await screen.findByText(desktop ? '1 resultado, por compatibilidade' : '1 resultado, ordenado para ti', undefined, SLOW)).toBeInTheDocument();
    expect(names()).toEqual(['Norte Logística']);
    await user.click(screen.getByRole('button', { name: 'Limpar pesquisa' }));
    expect(box).toHaveValue('');
    expect(box).toHaveFocus();
    expect(search()).toBe('');
    expect(screen.queryByRole('button', { name: 'Limpar pesquisa' })).not.toBeInTheDocument();
  });

  it('filtrar por tipo (sem esperar)', async () => {
    const { user } = show(viewport);
    const group = screen.getByRole('group', { name: 'Tipo de organização' });
    expect(within(group).getAllByRole('button').map((b) => b.textContent)).toEqual(['Todas', 'PME', 'Associação', 'Voluntariado', 'Nome individual']);
    expect(within(group).getByRole('button', { name: 'Todas' })).toHaveAttribute('aria-pressed', 'true');
    await user.click(within(group).getByRole('button', { name: 'Voluntariado' }));
    expect(within(group).getByRole('button', { name: 'Voluntariado' })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByText(count(2))).toBeInTheDocument();
    expect(names().sort()).toEqual(['Banco de Tempo Bonfim', 'Rede Vizinha']);
  });

  it('sem resultados: mensagem e caminho para adicionar', async () => {
    const { user } = show(viewport, '/pesquisa?q=zzz');
    expect(await screen.findByText('Nada encontrado para “zzz”', undefined, SLOW)).toBeInTheDocument();
    expect(screen.getByText(count(0))).toBeInTheDocument();
    const add = screen.getAllByRole('link', { name: 'Adicionar e avaliar' });
    expect(add[0]).toHaveAttribute('href', '/avaliar');
    if (desktop) {
      expect(screen.getByText('Experimenta outro nome ou tipo de organização.')).toBeInTheDocument();
      expect(add).toHaveLength(2);
      await user.click(screen.getByRole('button', { name: 'Limpar filtros' }));
      expect(screen.getByRole('searchbox')).toHaveValue('');
      expect(search()).toBe('');
      expect(await screen.findByText(count(12), undefined, SLOW)).toBeInTheDocument();
    } else {
      expect(screen.getByText('Confirma o nome ou adiciona-a ao avaliar.')).toBeInTheDocument();
      expect(screen.getByText('Não encontras a tua?')).toBeInTheDocument();
    }
  });

  it('sem resultados só pelo filtro de tipo', async () => {
    const { user } = show(viewport, '/pesquisa?q=gaia');
    await screen.findByText(desktop ? '1 resultado, por compatibilidade' : '1 resultado, ordenado para ti', undefined, SLOW);
    await user.click(screen.getByRole('button', { name: 'Associação' }));
    expect(screen.getByText('Nada encontrado para “gaia”')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Todas' }));
    await user.clear(screen.getByRole('searchbox'));
    await user.click(screen.getByRole('button', { name: 'Associação' }));
    expect(await screen.findByText(count(2), undefined, SLOW)).toBeInTheDocument();
  });
});

describe('Pesquisa: só no telemóvel', () => {
  beforeEach(() => localStorage.clear());
  it('voltar sem histórico vai para o início', async () => {
    const { user } = show('mobile');
    await user.click(screen.getByRole('button', { name: 'Voltar' }));
    expect(screen.getByTestId('outra-rota')).toBeInTheDocument();
  });
});

describe('Pesquisa: só no computador', () => {
  beforeEach(() => localStorage.clear());
  it('lateral: as prioridades por ordem, ou "pela nota" sem prioridades', () => {
    seedStore({ prefs: ['salario', 'lideranca'] });
    const { unmount } = show('desktop');
    expect(screen.getByRole('heading', { level: 1, name: 'Procurar uma organização' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 2, name: 'Ordenado pelo que valorizas' })).toBeInTheDocument();
    const aside = screen.getByRole('complementary');
    expect(aside.textContent).toContain(`1${CRITERION.salario.label}2${CRITERION.lideranca.label}`);
    expect(screen.getByRole('link', { name: 'Mudar o que valorizo →' })).toHaveAttribute('href', '/preferencias');
    expect(screen.getByRole('heading', { level: 2, name: 'Não encontras?' })).toBeInTheDocument();
    unmount();
    seedStore({ prefs: [] });
    show('desktop');
    expect(screen.getByRole('heading', { level: 2, name: 'Ordenado pela nota' })).toBeInTheDocument();
  });
});
