import { memo, type CSSProperties } from 'react';
import { Link } from 'react-router';
import { CRITERION, type CriterionKey } from '../../data/criteria';
import { tr } from '../../i18n';
import { countText, emptyTitle, LIMIT } from './search';
import { ResultRow, Searching, SearchBox, TypeChips } from './SearchParts';
import type { SearchState } from './useSearchPage';
import styles from './Search.module.css';

function NoResults({ applied, reset }: { applied: string; reset: () => void }) {
  return (
    <div className={styles.emptyWide}>
      <div className={`num ${styles.emptyWideTitle}`}>{emptyTitle(applied)}</div>
      <div className={`body ${styles.fs15}`}>{tr('Experimenta outro nome ou tipo de organização.', 'Try another name or type of organisation.')}</div>
      <div className={`row wrap ${styles.emptyActions}`}>
        <button type="button" className={`btn btn-ghost ${styles.button}`} onClick={reset}>
          {tr('Limpar filtros', 'Clear filters')}
        </button>
        <Link to="/avaliar" className={`btn btn-primary ${styles.button}`}>
          {tr('Adicionar e avaliar', 'Add and review')}
        </Link>
      </div>
    </div>
  );
}

/** Lateral: como está ordenado e o caminho para adicionar (memo: só muda com as prioridades) */
const SortAside = memo(function SortAside({ prefs }: { prefs: CriterionKey[] }) {
  return (
    <aside className={styles.aside}>
      <div className={styles.sorted}>
        <h2 className={`small muted ${styles.sortedTitle}`}>{prefs.length ? tr('Ordenado pelo que valorizas', 'Sorted by what you value') : tr('Ordenado pela nota', 'Sorted by score')}</h2>
        {prefs.map((k, i) => (
          <span key={k} className={`row ${styles.pref}`}>
            <span aria-hidden="true" className={styles.prefRank} style={{ '--c': CRITERION[k].color } as CSSProperties}>
              {i + 1}
            </span>
            {CRITERION[k].label}
          </span>
        ))}
        <Link to="/preferencias" className={`link ${styles.fs14}`}>
          {tr('Mudar o que valorizo →', 'Change what I value →')}
        </Link>
      </div>
      <div className={styles.add}>
        <h2 className={`display ${styles.addTitle}`}>{tr('Não encontras?', 'Can’t find it?')}</h2>
        <p className={`body ${styles.addText}`}>{tr('Adiciona-a quando a avaliares.', 'Add it when you review it.')}</p>
        <Link to="/avaliar" className={`btn btn-dark ${styles.button} ${styles.start}`}>
          {tr('Adicionar e avaliar', 'Add and review')}
        </Link>
      </div>
    </aside>
  );
});

/** Computador: cabeçalho com campo grande, resultados à esquerda e lateral à direita */
export function SearchDesktop({ s }: { s: SearchState }) {
  const n = s.results.length;
  const shown = s.more ? s.results : s.results.slice(0, LIMIT);
  return (
    <div className={`container ${styles.desktop}`}>
      <section className={`zone zone-band ${styles.head}`}>
        <h1 className={`display ${styles.title}`}>{tr('Procurar uma organização', 'Find an organisation')}</h1>
        <div className="row">
          <SearchBox id="dq" text={s.text} onText={s.onText} clear={s.clear} large />
        </div>
        <TypeChips type={s.type} pickType={s.pickType} />
      </section>

      <div className={`row wrap ${styles.columns}`}>
        <section aria-label={tr('Resultados', 'Results')} className={styles.results}>
          {s.loading ? (
            <Searching total={s.total} desktop />
          ) : (
            <div className={`fade-up ${styles.listWide}`}>
              <div aria-live="polite" className={`small muted ${styles.count}`}>
                {countText(n, true)}
              </div>
              {shown.map((r) => (
                <ResultRow key={r.org.id} r={r} desktop />
              ))}
              {!s.more && n > LIMIT && (
                <button type="button" className={`btn btn-ghost ${styles.button} ${styles.more}`} onClick={s.showMore}>
                  {tr(`Ver mais ${n - LIMIT}`, `Show ${n - LIMIT} more`)}
                </button>
              )}
              {n === 0 && <NoResults applied={s.applied} reset={s.reset} />}
            </div>
          )}
        </section>
        <SortAside prefs={s.prefs} />
      </div>
    </div>
  );
}
