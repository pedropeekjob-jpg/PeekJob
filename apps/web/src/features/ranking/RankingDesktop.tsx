import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Dots, Ring } from '../../components/Data';
import { Icon } from '../../components/Icon';
import { Switch } from '../../components/UI';
import { CRITERIA, CRITERION, type CriterionKey } from '../../data/criteria';
import type { Org } from '../../data/orgs';
import { tr } from '../../i18n';
import { orgTypeLabel } from '../../i18n/labels';
import { fmt, plural } from '../../lib/format';
import { useToggle } from '../../lib/useToggle';
import { countLine, desktopWindow, prefsText, previewOrder, type RankedRow } from './ranking';
import { EmptyFilters, FilterGroups, SetorField, SortToggle } from './RankingControls';
import type { RankingFilters } from './useRanking';
import styles from './RankingDesktop.module.css';

/** Computador: lista à esquerda e pré-visualização da escolhida à direita */
export function RankingDesktop({ ranked, F, prefs }: { ranked: RankedRow[]; F: RankingFilters; prefs: CriterionKey[] }) {
  // com filtros vindos do endereço o painel começa aberto
  const [showFilters, toggleFilters] = useToggle(F.active > 0);
  const [pick, setPick] = useState<string | null>(null);
  const [more, setMore] = useState(false);
  const [allCriteria, setAllCriteria] = useState(false);
  const { index, selected, shown } = desktopWindow(ranked, pick, more);
  const choose = (id: string) => {
    setPick(id);
    setAllCriteria(false);
  };

  return (
    <div className={`container ${styles.container}`}>
      <div className={`row wrap between ${styles.head}`}>
        <div className={styles.titleBlock}>
          <h1 className={`h1 ${styles.title}`}>Ranking</h1>
          <p className={`body ${styles.sub}`}>
            {F.sort === 'mim' ? tr(`Ordenado por ${prefsText(prefs)}`, `Sorted by ${prefsText(prefs)}`) : tr('Ordenado pela nota pública', 'Sorted by public score')} ·{' '}
            <Link to="/preferencias" className={styles.subLink}>
              {tr('Mudar', 'Change')}
            </Link>{' '}
            ·{' '}
            <Link to="/metodologia" className={styles.subLink}>
              {tr('Como calculamos', 'How we score')}
            </Link>
          </p>
        </div>
        <div className={`row wrap ${styles.tools}`}>
          <SortToggle F={F} big />
          <button type="button" aria-expanded={showFilters} aria-controls="filtros" onClick={toggleFilters} className={`row ${styles.filtersButton}`} data-active={F.active > 0 || undefined}>
            <Icon name="filter" size={18} />
            {F.active ? tr(`Filtros · ${F.active}`, `Filters · ${F.active}`) : tr('Filtros', 'Filters')}
          </button>
        </div>
      </div>

      {showFilters && (
        <section id="filtros" aria-label={tr('Filtros', 'Filters')} className={`fade-up row wrap ${styles.filters}`}>
          <FilterGroups F={F} compact />
          <div className={styles.switches}>
            <Switch purple checked={F.f.resp} onChange={(v) => F.write({ resp: v })} label={<span className={styles.purple}>{tr('Respeito e inclusão ≥ 4', 'Respect and inclusion ≥ 4')}</span>} />
            <Switch checked={F.f.ver} onChange={(v) => F.write({ ver: v })} label={tr('Só verificadas', 'Verified only')} />
          </div>
          <SetorField F={F} />
          <button type="button" className={`link ${styles.clear}`} onClick={F.clear}>
            {tr('Limpar filtros', 'Clear filters')}
          </button>
        </section>
      )}

      <div className={`row wrap ${styles.columns}`}>
        <section aria-label={tr('Lista do ranking', 'Ranking list')} className={styles.list}>
          <span aria-live="polite" className={`small muted ${styles.count}`}>
            {countLine(ranked.length)}
          </span>
          {ranked.length === 0 && <EmptyFilters F={F} />}
          {shown.map(({ org, match }, i) => (
            <button key={org.id} type="button" aria-pressed={i === index} onClick={() => choose(org.id)} className={`row ${styles.row}`}>
              <span className={`num ${styles.position}`} data-top={i < 3 || undefined}>
                {i + 1}
              </span>
              <Ring value={org.score} size={48} fontSize={15} />
              <span className={`grow ${styles.rowText}`}>
                <span className={`ellipsis ${styles.rowName}`}>{org.name}</span>
                <span className="small muted">
                  {orgTypeLabel(org.type)} · {org.district}
                </span>
              </span>
              <span className={`pill pill-match ${styles.rowMatch}`}>{tr(`${match}% para ti`, `${match}% for you`)}</span>
            </button>
          ))}
          {shown.length < ranked.length && (
            <button type="button" className={`btn btn-ghost ${styles.more}`} onClick={() => setMore(true)}>
              {tr(`Ver mais ${ranked.length - shown.length}`, `Show ${ranked.length - shown.length} more`)}
            </button>
          )}
        </section>

        {selected && (
          <aside aria-label={tr('Pré-visualização', 'Preview')} aria-live="polite" className={`card ${styles.aside}`}>
            <Preview key={selected.org.id} org={selected.org} match={selected.match} position={index + 1} prefs={prefs} all={allCriteria} onToggleAll={() => setAllCriteria(!allCriteria)} />
          </aside>
        )}
      </div>
    </div>
  );
}

function CriterionValue({ org, k }: { org: Org; k: CriterionKey }) {
  const c = CRITERION[k];
  const v = org.scores[k];
  return (
    <div role="img" aria-label={`${c.label} ${v == null ? tr('não se aplica', 'not applicable') : tr(`${fmt(v)} de 5`, `${fmt(v)} out of 5`)}`} className={`row ${styles.crit}`} data-respeito={k === 'respeito' || undefined}>
      <span className={`grow ${styles.critName}`}>{c.label}</span>
      <Dots value={v} color={c.color} />
      <span className={`mono ${styles.critValue}`}>{v == null ? '—' : fmt(v)}</span>
    </div>
  );
}

/** Pré-visualização: posição, nota, compatibilidade e critérios (os que a pessoa valoriza, ou todos) */
function Preview({ org, match, position, prefs, all, onToggleAll }: { org: Org; match: number; position: number; prefs: CriterionKey[]; all: boolean; onToggleAll: () => void }) {
  return (
    <div className={`fade-up ${styles.preview}`}>
      <div className={styles.previewHead}>
        <span className={`small muted ${styles.previewPos}`}>
          #{position} · {orgTypeLabel(org.type)}
        </span>
        <h2 className={`h2 ${styles.previewName}`}>{org.name}</h2>
      </div>
      <div className={`row ${styles.previewScore}`}>
        <Ring value={org.score} size={112} thickness={10} fontSize={34} />
        <div className={styles.previewMeta}>
          <span className={`pill pill-match ${styles.previewMatch}`}>{tr(`${match}% para ti`, `${match}% for you`)}</span>
          <span className="small muted">{plural(org.reviewsCount, tr('avaliação', 'review'), tr('avaliações', 'reviews'))}</span>
        </div>
      </div>
      <div className={styles.criteria}>
        {previewOrder(prefs, all).map((k) => (
          <CriterionValue key={k} org={org} k={k} />
        ))}
        <button type="button" className={`link ${styles.criteriaToggle}`} aria-expanded={all} onClick={onToggleAll}>
          {all ? tr('Ver só os 3 que valorizas', 'Show only the 3 you value') : tr(`Ver os ${CRITERIA.length} critérios`, `Show all ${CRITERIA.length} criteria`)}
        </button>
      </div>
      <Link to={`/org/${org.id}`} data-ev="select_org" data-ev-org-type={org.type} className={`btn btn-primary lift ${styles.open}`}>
        {tr('Ver página', 'View page')} <Icon name="next" size={18} />
      </Link>
      <Link to="/metodologia" className={`link ${styles.how}`}>
        {tr('Como calculamos a nota', 'How we calculate the score')}
      </Link>
    </div>
  );
}
