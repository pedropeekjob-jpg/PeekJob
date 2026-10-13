import { renderHook, screen, act } from '@testing-library/react';
import type { ReactNode } from 'react';
import { describe, expect, it } from 'vitest';
import { ORGS } from '../../src/data/orgs';
import {
  activeCount,
  applyFilters,
  countLine,
  desktopWindow,
  filterChips,
  NO_FILTERS,
  prefsText,
  previewOrder,
  rank,
  readFilters,
  sizeLabel,
  summarize,
  toggleIn,
  trendInfo,
  visibleOptions,
  writeFilters,
  type Filters,
} from '../../src/features/ranking/ranking';
import { FilterGroups } from '../../src/features/ranking/RankingControls';
import { useRankingFilters } from '../../src/features/ranking/useRanking';
import { Providers, renderScreen } from '../utils/render';

const F = (patch: Partial<Filters> = {}): Filters => ({ ...NO_FILTERS, ...patch });

describe('filtros no endereço', () => {
  it('lê e escreve só o que não é o valor por omissão (ida e volta)', () => {
    const sp = new URLSearchParams('tipo=PME,Associação&dim=1–9&dist=Porto&resp=1&ver=1&setor=Saúde&ordem=nota');
    const { filters, sort } = readFilters(sp);
    expect(filters).toEqual({ tipo: ['PME', 'Associação'], dim: ['1–9'], dist: ['Porto'], resp: true, ver: true, setor: 'Saúde' });
    expect(sort).toBe('nota');
    expect(readFilters(writeFilters(filters, sort))).toEqual({ filters, sort });
    expect(writeFilters(NO_FILTERS, 'mim').toString()).toBe('');
    expect(readFilters(new URLSearchParams('tipo=,PME,&ordem=outra'))).toEqual({ filters: F({ tipo: ['PME'] }), sort: 'mim' });
  });

  it('juntar/tirar valores e contar filtros ativos', () => {
    expect(toggleIn(['a'], 'b')).toEqual(['a', 'b']);
    expect(toggleIn(['a', 'b'], 'a')).toEqual(['b']);
    expect(activeCount(NO_FILTERS)).toBe(0);
    expect(activeCount(F({ tipo: ['PME', 'Associação'], resp: true, ver: true, setor: 'Saúde' }))).toBe(5);
  });

  it('o hook escreve no endereço com replace e guarda a ordem ao mudar filtros', () => {
    const wrapper = ({ children }: { children: ReactNode }) => <Providers route="/ranking?ordem=nota">{children}</Providers>;
    const { result } = renderHook(() => useRankingFilters(), { wrapper });
    expect(result.current.sort).toBe('nota');
    act(() => result.current.toggle('dist', 'Porto'));
    expect(result.current.f.dist).toEqual(['Porto']);
    expect(result.current.sort).toBe('nota');
    act(() => result.current.write({ ordem: 'mim' }));
    expect(result.current.sort).toBe('mim');
    expect(result.current.active).toBe(1);
    act(() => result.current.clear());
    expect(result.current.active).toBe(0);
  });
});

describe('ordenar e filtrar', () => {
  it('fora do ranking com menos de 5 avaliações; filtros de respeito, verificadas e setor', () => {
    const few = { ...ORGS[0], id: 'poucas', reviewsCount: 4 };
    expect(applyFilters([few, ...ORGS], NO_FILTERS)).toHaveLength(ORGS.length);
    expect(applyFilters(ORGS, F({ resp: true })).every((o) => (o.scores.respeito ?? 0) >= 4)).toBe(true);
    expect(applyFilters(ORGS, F({ ver: true })).every((o) => o.verifiedPct >= 80)).toBe(true);
    expect(applyFilters(ORGS, F({ setor: 'Saúde' })).map((o) => o.id)).toEqual(['clinica-foz']);
  });

  it('"nota geral" desempata pelo n.º de avaliações; "para mim" pela nota', () => {
    const a = { ...ORGS[1], id: 'a', score: 4, reviewsCount: 10 };
    const b = { ...ORGS[1], id: 'b', score: 4, reviewsCount: 30 };
    expect(rank([a, b], NO_FILTERS, 'nota', []).map((r) => r.org.id)).toEqual(['b', 'a']);
    const c = { ...ORGS[1], id: 'c', score: 3 };
    const d = { ...ORGS[1], id: 'd', score: 4.5 };
    // mesmas notas por critério → mesma compatibilidade → ganha a nota geral
    expect(rank([c, d], NO_FILTERS, 'mim', ['ambiente']).map((r) => r.org.id)).toEqual(['d', 'c']);
  });
});

describe('textos', () => {
  it('tendência: subida, descida, igual e nova', () => {
    expect(trendInfo(2)).toEqual({ text: '▲2', aria: 'Subiu 2', kind: 'up' });
    expect(trendInfo(-3)).toEqual({ text: '▼3', aria: 'Desceu 3', kind: 'down' });
    expect(trendInfo(0)).toEqual({ text: '—', aria: 'Sem alteração', kind: 'flat' });
    expect(trendInfo('novo')).toEqual({ text: 'novo', aria: 'Novo no ranking', kind: 'new' });
  });

  it('dimensões, resumos, prioridades e contagem', () => {
    expect([sizeLabel('1–9'), sizeLabel('10–49'), sizeLabel('50–249')]).toEqual(['Até 9 pessoas', '10 a 49 pessoas', '50 a 249 pessoas']);
    expect(summarize([], 'Todos')).toBe('Todos');
    expect(summarize(['a', 'b', 'c'], 'Todos', (v) => v.toUpperCase())).toBe('A +2');
    expect(prefsText([])).toBe('');
    expect(prefsText(['salario'])).toBe('Salário');
    expect(prefsText(['ambiente', 'salario', 'equilibrio'])).toMatch(/^.+, .+ e .+$/);
    expect(countLine(1)).toBe('1 organização · mínimo 5 avaliações');
  });

  it('chips do telemóvel incluem respeito e verificadas quando ativos', () => {
    expect(filterChips(NO_FILTERS).map((c) => c.text)).toEqual(['Todos os tipos', 'Todos os distritos', 'Qualquer dimensão']);
    const chips = filterChips(F({ tipo: ['Nome individual'], dim: ['1–9', '10–49'], resp: true, ver: true }));
    expect(chips.map((c) => c.text)).toEqual(['Nome individual', 'Todos os distritos', 'Até 9 pessoas +1', 'Respeito ≥ 4', 'Verificadas']);
    expect(chips[2].aria).toBe('Dimensão: 1–9, 10–49');
  });

  it('critérios da pré-visualização: prioridades, ou todos com as prioridades primeiro', () => {
    expect(previewOrder(['salario'], false)).toEqual(['salario']);
    const all = previewOrder(['salario'], true);
    expect(all[0]).toBe('salario');
    expect(all).toHaveLength(8);
  });
});

describe('janela do computador', () => {
  const rows = ORGS.map((org) => ({ org, match: 50 }));
  it('8 por omissão; a escolhida fica visível mesmo depois da 8.ª; "ver mais" mostra tudo', () => {
    expect(desktopWindow(rows, null, false)).toMatchObject({ index: 0 });
    expect(desktopWindow(rows, null, false).shown).toHaveLength(8);
    expect(desktopWindow(rows, rows[10].org.id, false).shown).toHaveLength(11);
    expect(desktopWindow(rows, 'nao-existe', true)).toMatchObject({ index: 0, shown: rows });
    expect(desktopWindow([], null, false).selected).toBeUndefined();
  });
});

describe('grupos de filtros com muitas opções', () => {
  it('3 visíveis + escolhidas; "+n" abre o resto e "Menos" fecha', async () => {
    expect(visibleOptions(['a', 'b', 'c', 'd'], [], false, false)).toEqual({ collapsible: false, shown: ['a', 'b', 'c', 'd'], hidden: 0 });
    expect(visibleOptions(['a', 'b', 'c', 'd', 'e', 'f'], ['f'], false, false)).toEqual({ collapsible: true, shown: ['a', 'b', 'c', 'f'], hidden: 2 });
    expect(visibleOptions(['a', 'b', 'c', 'd', 'e'], [], false, true).collapsible).toBe(false);

    const districts = ['Aveiro', 'Beja', 'Braga', 'Bragança', 'Castelo Branco', 'Coimbra'];
    const groups = [{ key: 'dist' as const, label: 'Distrito', short: 'Distrito', opts: districts }];
    const Under = () => <FilterGroups F={useRankingFilters()} groups={groups} />;
    const { user } = renderScreen(<Under />, { route: '/ranking' });
    expect(screen.getAllByRole('button', { pressed: false })).toHaveLength(3);
    await user.click(screen.getByRole('button', { name: '+3' }));
    expect(screen.getAllByRole('button', { pressed: false })).toHaveLength(6);
    await user.click(screen.getByRole('button', { name: 'Coimbra' }));
    await user.click(screen.getByRole('button', { name: 'Menos' }));
    expect(screen.getByRole('button', { name: 'Coimbra' })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByRole('button', { name: '+2' })).toHaveAttribute('aria-expanded', 'false');
  });
});
