import { screen, within } from '@testing-library/react';
import { useLocation } from 'react-router-dom';
import { beforeEach, describe, expect, it } from 'vitest';
import Ranking from '../../src/pages/Ranking';
import { renderScreen } from '../utils/render';

function Where() {
  const { search } = useLocation();
  return <output data-testid="search">{search}</output>;
}
const show = (viewport: 'mobile' | 'desktop', route = '/ranking') => renderScreen(<Ranking />, { route, path: '/ranking', viewport, outside: <Where /> });
const search = () => screen.getByTestId('search').textContent;
const count = () => screen.getByText(/organizaç(ão|ões) · mínimo 5 avaliações/).textContent;

/** Nomes das organizações pela ordem do ranking (ligações no telemóvel, botões no computador) */
function names(viewport: 'mobile' | 'desktop') {
  const list = viewport === 'mobile' ? screen.getAllByRole('link').filter((a) => a.getAttribute('href')?.startsWith('/org/')) : within(screen.getByRole('region', { name: 'Lista do ranking' })).getAllByRole('button', { pressed: undefined }).filter((b) => b.hasAttribute('aria-pressed'));
  return list.map((el) => el.querySelector('.ellipsis')?.textContent);
}

describe.each(['mobile', 'desktop'] as const)('Ranking (%s)', (viewport) => {
  beforeEach(() => localStorage.clear());
  const desktop = viewport === 'desktop';

  it('mostra só organizações com 5+ avaliações, ordenadas "para mim" por omissão', async () => {
    show(viewport);
    expect(await screen.findByRole('heading', { level: 1, name: 'Ranking' })).toBeInTheDocument();
    expect(count()).toBe('12 organizações · mínimo 5 avaliações');
    expect(screen.getByRole('button', { name: 'Para mim' })).toHaveAttribute('aria-pressed', 'true');
    expect(names(viewport).length).toBe(desktop ? 8 : 12);
  });

  it('ordenar pela nota geral fica no endereço e põe a melhor nota primeiro', async () => {
    const { user } = show(viewport);
    await user.click(await screen.findByRole('button', { name: 'Nota geral' }));
    expect(search()).toBe('?ordem=nota');
    expect(screen.getByRole('button', { name: 'Nota geral' })).toHaveAttribute('aria-pressed', 'true');
    expect(names(viewport)[0]).toBe('Rede Vizinha');
  });

  it('filtros vindos do endereço (ex.: ligação de /setores) e limpar', async () => {
    const { user } = show(viewport, '/ranking?setor=Comunidade&tipo=Voluntariado');
    expect(await screen.findByText('2 organizações · mínimo 5 avaliações')).toBeInTheDocument();
    expect(names(viewport).sort()).toEqual(['Banco de Tempo Bonfim', 'Rede Vizinha']);
    // tirar o setor pelo chip
    await user.click(screen.getAllByRole('button', { name: /^Setor: Comunidade\. Tirar filtro$/ })[0]);
    expect(search()).toBe('?tipo=Voluntariado');
    if (desktop) await user.click(screen.getByRole('button', { name: 'Limpar filtros' }));
    else {
      await user.click(screen.getByRole('button', { name: /^Filtros, 1 activos$/ }));
      await user.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Limpar' }));
    }
    expect(search()).toBe('');
    expect(count()).toBe('12 organizações · mínimo 5 avaliações');
  });

  it('sem resultados: mensagem e limpar filtros', async () => {
    const { user } = show(viewport, '/ranking?dist=Braga&ver=1');
    expect(await screen.findByText('Nenhuma organização com estes filtros')).toBeInTheDocument();
    expect(count()).toBe('0 organizações · mínimo 5 avaliações');
    await user.click(screen.getAllByRole('button', { name: 'Limpar filtros' }).at(-1)!);
    expect(search()).toBe('');
  });

  it('subidas e descidas no ranking têm texto para leitores de ecrã', async () => {
    show(viewport);
    await screen.findByRole('heading', { level: 1 });
    if (desktop) return; // no computador a tendência não aparece na lista
    expect(screen.getAllByLabelText(/^Subiu \d+$/).length).toBeGreaterThan(0);
    expect(screen.getAllByLabelText(/^Desceu \d+$/).length).toBeGreaterThan(0);
    expect(screen.getAllByLabelText('Novo no ranking').length).toBeGreaterThan(0);
    expect(screen.getAllByLabelText('Sem alteração').length).toBeGreaterThan(0);
  });
});

describe('Ranking no telemóvel: folha de filtros', () => {
  beforeEach(() => localStorage.clear());

  it('chips resumem os filtros; a folha muda tipo, distrito, respeito e verificadas', async () => {
    const { user } = show('mobile');
    await user.click(await screen.findByRole('button', { name: 'Tipo: todos. Abrir filtros' }));
    const sheet = screen.getByRole('dialog');
    await user.click(within(sheet).getByRole('button', { name: 'Voluntariado' }));
    expect(search()).toBe('?tipo=Voluntariado');
    await user.click(within(sheet).getByRole('button', { name: 'PME' }));
    expect(search()).toBe('?tipo=Voluntariado%2CPME');
    await user.click(within(sheet).getByRole('button', { name: 'Porto' }));
    await user.click(within(sheet).getByRole('button', { name: '10–49' }));
    await user.click(within(sheet).getByRole('switch', { name: /Respeito e inclusão 4 ou mais/ }));
    await user.click(within(sheet).getByRole('switch', { name: /Só avaliações verificadas/ }));
    expect(search()).toBe('?tipo=Voluntariado%2CPME&dim=10%E2%80%9349&dist=Porto&resp=1&ver=1');
    const showBtn = within(sheet).getByRole('button', { name: /^Ver \d+ organizaç/ });
    await user.click(showBtn);
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Tipo: Voluntariado, PME. Abrir filtros' })).toHaveTextContent('Voluntariado +1');
    expect(screen.getByRole('button', { name: 'Distrito: Porto. Abrir filtros' })).toHaveTextContent('Porto');
    expect(screen.getByRole('button', { name: 'Dimensão: 10–49. Abrir filtros' })).toHaveTextContent('10 a 49 pessoas');
    expect(screen.getByRole('button', { name: 'Respeito e inclusão 4 ou mais. Abrir filtros' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Só avaliações verificadas. Abrir filtros' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Filtros, 6 activos' })).toBeInTheDocument();
  });

  it('cada organização liga à sua página, com nota e compatibilidade', async () => {
    show('mobile');
    const link = await screen.findByRole('link', { name: /Padaria Ribeira/ });
    expect(link).toHaveAttribute('href', '/org/padaria-ribeira');
    expect(within(link).getByRole('img', { name: 'Nota 4,4 de 5, 23 avaliações' })).toBeInTheDocument();
    expect(link).toHaveTextContent(/\d+%para ti/);
  });
});

describe('Ranking no computador: lista e pré-visualização', () => {
  beforeEach(() => localStorage.clear());

  it('a primeira está escolhida; escolher outra mostra-a ao lado, com os critérios', async () => {
    const { user } = show('desktop');
    const preview = await screen.findByRole('complementary', { name: 'Pré-visualização' });
    const first = names('desktop')[0]!;
    expect(within(preview).getByRole('heading', { level: 2, name: first })).toBeInTheDocument();
    expect(within(preview).getByText(/^#1 · /)).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /Clínica Foz/ }));
    expect(screen.getByRole('button', { name: /Clínica Foz/ })).toHaveAttribute('aria-pressed', 'true');
    const p2 = screen.getByRole('complementary', { name: 'Pré-visualização' });
    expect(within(p2).getByRole('heading', { level: 2, name: 'Clínica Foz' })).toBeInTheDocument();
    // por omissão os 3 critérios que a pessoa valoriza; depois os 8
    const criteria = () => within(p2).getAllByRole('img').filter((el) => !el.getAttribute('aria-label')!.startsWith('Nota '));
    expect(criteria()).toHaveLength(3);
    await user.click(within(p2).getByRole('button', { name: 'Ver os 8 critérios' }));
    expect(criteria()).toHaveLength(8);
    expect(within(p2).getByRole('button', { name: 'Ver só os 3 que valorizas' })).toHaveAttribute('aria-expanded', 'true');
    expect(within(p2).getByRole('link', { name: /Ver página/ })).toHaveAttribute('href', '/org/clinica-foz');
  });

  it('mostra 8 e depois o resto', async () => {
    const { user } = show('desktop');
    await user.click(await screen.findByRole('button', { name: 'Ver mais 4' }));
    expect(names('desktop')).toHaveLength(12);
    expect(screen.queryByRole('button', { name: /^Ver mais/ })).not.toBeInTheDocument();
  });

  it('voluntariado não tem nota de salário: "não se aplica"', async () => {
    const { user } = show('desktop', '/ranking?tipo=Voluntariado');
    const preview = await screen.findByRole('complementary', { name: 'Pré-visualização' });
    await user.click(within(preview).getByRole('button', { name: 'Ver os 8 critérios' }));
    expect(within(preview).getByRole('img', { name: /^Salário justo não se aplica$/ })).toBeInTheDocument();
  });

  it('painel de filtros: abre, mostra a contagem e filtra por tipo, pessoas, distrito e interruptores', async () => {
    const { user } = show('desktop');
    const toggle = await screen.findByRole('button', { name: 'Filtros' });
    expect(toggle).toHaveAttribute('aria-expanded', 'false');
    await user.click(toggle);
    const panel = screen.getByRole('region', { name: 'Filtros' });
    await user.click(within(panel).getByRole('button', { name: 'Associação' }));
    await user.click(within(panel).getByRole('button', { name: 'Associação' }));
    await user.click(within(panel).getByRole('button', { name: 'Porto' }));
    await user.click(within(panel).getByRole('switch', { name: /Respeito e inclusão ≥ 4/ }));
    await user.click(within(panel).getByRole('switch', { name: /Só verificadas/ }));
    expect(search()).toBe('?dist=Porto&resp=1&ver=1');
    expect(screen.getByRole('button', { name: 'Filtros · 3' })).toHaveAttribute('aria-expanded', 'true');
  });

  it('com filtros no endereço o painel já vem aberto, com o setor', async () => {
    show('desktop', '/ranking?setor=Saúde');
    const panel = await screen.findByRole('region', { name: 'Filtros' });
    expect(within(panel).getByRole('group', { name: 'Setor' })).toBeInTheDocument();
    expect(count()).toBe('1 organização · mínimo 5 avaliações');
  });

  it('descreve a ordem "para mim" com as prioridades e liga à metodologia', async () => {
    const { user } = show('desktop');
    expect(await screen.findByText(/^Ordenado por .+ e .+ ·/)).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Nota geral' }));
    expect(screen.getByText(/^Ordenado pela nota pública ·/)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Mudar' })).toHaveAttribute('href', '/preferencias');
  });
});
