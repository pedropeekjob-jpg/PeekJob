import { useCallback, useMemo } from 'react';
import { useSearchParams } from 'react-router';
import { useOrgs } from '../../api/orgs';
import { useStore } from '../../lib/store';
import { activeCount, NO_FILTERS, rank, readFilters, toggleIn, writeFilters, type Filters, type GroupKey, type Sort } from './ranking';

/** Filtros guardados no endereço: sobrevivem a ir à página da organização e voltar, e permitem ligações de /setores */
export function useRankingFilters() {
  const [sp, setSp] = useSearchParams();
  const key = sp.toString();
  // só volta a ler quando o endereço muda (o objeto URLSearchParams é novo a cada render)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const { filters, sort } = useMemo(() => readFilters(sp), [key]);

  const write = useCallback(
    (patch: Partial<Filters> & { ordem?: Sort }) => {
      const { ordem, ...rest } = patch;
      setSp(writeFilters({ ...filters, ...rest }, ordem ?? sort), { replace: true });
    },
    [filters, sort, setSp],
  );
  const toggle = useCallback((g: GroupKey, v: string) => write({ [g]: toggleIn(filters[g], v) }), [filters, write]);
  const clear = useCallback(() => write(NO_FILTERS), [write]);

  return { f: filters, sort, write, toggle, clear, active: activeCount(filters) };
}

export type RankingFilters = ReturnType<typeof useRankingFilters>;

/** Organizações do ranking, filtradas e ordenadas; recalcula só quando mudam os dados, as prioridades ou os filtros */
export function useRanked(F: RankingFilters) {
  const orgs = useOrgs();
  const { prefs } = useStore();
  const ranked = useMemo(() => rank(orgs, F.f, F.sort, prefs), [orgs, prefs, F.f, F.sort]);
  return { ranked, prefs };
}
