import { useCallback, useState } from 'react';
import { Icon } from '../../components/Icon';
import { tr } from '../../i18n';
import { sectorLabel } from '../../i18n/labels';
import { filterGroups, visibleOptions, type FilterGroup, type GroupKey, type Sort } from './ranking';
import type { RankingFilters } from './useRanking';
import styles from './RankingControls.module.css';

const SORTS: [Sort, () => string][] = [
  ['mim', () => tr('Para mim', 'For me')],
  ['nota', () => tr('Nota geral', 'Overall score')],
];

/** Para mim · Nota geral */
export function SortToggle({ F, big = false }: { F: RankingFilters; big?: boolean }) {
  return (
    <div className={big ? `segmented ${styles.sortBig}` : 'segmented'} role="group" aria-label={tr('Ordenar', 'Sort')}>
      {SORTS.map(([k, label]) => (
        <button key={k} type="button" aria-pressed={F.sort === k} onClick={() => F.write({ ordem: k })}>
          {label()}
        </button>
      ))}
    </div>
  );
}

function FilterGroupField({ g, chosen, compact, onToggle }: { g: FilterGroup; chosen: string[]; compact: boolean; onToggle: (k: GroupKey, v: string) => void }) {
  const [open, setOpen] = useState(false);
  const { collapsible, shown, hidden } = visibleOptions(g.opts, chosen, open);
  return (
    <fieldset className={styles.group}>
      <legend className={compact ? styles.legendCompact : styles.legend}>{compact ? g.short : g.label}</legend>
      <div className="chips">
        {shown.map((o) => (
          <button key={o} type="button" className={`chip ${styles.chip}`} aria-pressed={chosen.includes(o)} onClick={() => onToggle(g.key, o)}>
            {g.optLabel ? g.optLabel(o) : o}
          </button>
        ))}
        {collapsible && (hidden > 0 || open) && (
          <button type="button" className={`link ${styles.moreOptions}`} aria-expanded={open} onClick={() => setOpen(!open)}>
            {open ? tr('Menos', 'Less') : `+${hidden}`}
          </button>
        )}
      </div>
    </fieldset>
  );
}

/** Tipo, dimensão e distrito (chips); `groups` permite testar com outras opções */
export function FilterGroups({ F, compact = false, groups = filterGroups() }: { F: RankingFilters; compact?: boolean; groups?: FilterGroup[] }) {
  return (
    <>
      {groups.map((g) => (
        <FilterGroupField key={g.key} g={g} chosen={F.f[g.key]} compact={compact} onToggle={F.toggle} />
      ))}
    </>
  );
}

/** Setor escolhido (vem de /setores); carregar tira o filtro */
export function SetorChip({ F }: { F: RankingFilters }) {
  const { f, write } = F;
  const remove = useCallback(() => write({ setor: null }), [write]);
  if (!f.setor) return null;
  return (
    <button
      type="button"
      className={`chip ${styles.chip}`}
      aria-pressed="true"
      onClick={remove}
      aria-label={tr(`Setor: ${f.setor}. Tirar filtro`, `Sector: ${sectorLabel(f.setor)}. Remove filter`)}
    >
      {tr('Setor:', 'Sector:')} {sectorLabel(f.setor)} <Icon name="close" size={14} />
    </button>
  );
}

/** Computador: o setor como um grupo do painel de filtros */
export function SetorField({ F }: { F: RankingFilters }) {
  if (!F.f.setor) return null;
  return (
    <fieldset className={styles.groupPlain}>
      <legend className={styles.legendCompact}>{tr('Setor', 'Sector')}</legend>
      <SetorChip F={F} />
    </fieldset>
  );
}

export function EmptyFilters({ F }: { F: RankingFilters }) {
  return (
    <div className={styles.empty}>
      <span className={`h2 ${styles.emptyTitle}`}>{tr('Nenhuma organização com estes filtros', 'No organisations match these filters')}</span>
      <button type="button" className={`btn btn-dark btn-sm ${styles.emptyClear}`} onClick={F.clear}>
        {tr('Limpar filtros', 'Clear filters')}
      </button>
    </div>
  );
}
