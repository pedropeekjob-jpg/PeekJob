import { useCallback, useMemo, useState } from 'react';
import { useOrgs } from '../../api/orgs';
import type { OrgType } from '../../data/orgs';
import { sectorRows, typeCards, type SectorSort } from './sectors';

/** Tipos e setores (só organizações com avaliações), com o tipo escolhido e a ordem */
export function useSectors() {
  const all = useOrgs();
  const orgs = useMemo(() => all.filter((o) => o.reviewsCount > 0), [all]);
  const [type, setType] = useState<OrgType | null>(null);
  const [sort, setSort] = useState<SectorSort>('nota');

  const types = useMemo(() => typeCards(orgs), [orgs]);
  const sectors = useMemo(() => sectorRows(orgs, type, sort), [orgs, type, sort]);
  /** carregar no tipo escolhido tira o filtro */
  const toggleType = useCallback((t: OrgType) => setType((cur) => (cur === t ? null : t)), []);
  const clearType = useCallback(() => setType(null), []);

  return { types, sectors, type, sort, setSort, toggleType, clearType };
}
