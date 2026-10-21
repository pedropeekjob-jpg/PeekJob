import { Link } from 'react-router';
import { Icon } from '../../components/Icon';
import { tr } from '../../i18n';
import { useBack } from '../../lib/useBack';
import { countText, emptyTitle } from './search';
import { ResultRow, Searching, SearchBox, TypeChips } from './SearchParts';
import type { SearchState } from './useSearchPage';
import styles from './Search.module.css';

/** Telemóvel: campo no topo, tipos, lista e "adicionar" fixo em baixo */
export function SearchMobile({ s }: { s: SearchState }) {
  const back = useBack('/');
  const n = s.results.length;
  return (
    <div className={`page ${styles.mobile}`}>
      <div className={`row ${styles.top}`}>
        <button type="button" className={`icon-btn bare ${styles.back}`} aria-label={tr('Voltar', 'Back')} onClick={back}>
          <Icon name="back" />
        </button>
        <SearchBox id="mq" text={s.text} onText={s.onText} clear={s.clear} settled={!s.loading && s.applied === s.text} />
      </div>

      <TypeChips type={s.type} pickType={s.pickType} small />

      {s.loading ? (
        <Searching total={s.total} />
      ) : (
        <div className={`fade-up ${styles.list}`}>
          <div aria-live="polite" className={`small muted ${styles.count}`}>
            {countText(n, false)}
          </div>
          {s.results.map((r) => (
            <ResultRow key={r.org.id} r={r} />
          ))}
          {n === 0 && (
            <div className={styles.empty}>
              <div className={styles.emptyTitle}>{emptyTitle(s.applied)}</div>
              <div className="small body">{tr('Confirma o nome ou adiciona-a ao avaliar.', 'Check the name, or add it when you review.')}</div>
            </div>
          )}
        </div>
      )}

      <div className={`row between ${styles.footer}`}>
        <span className="small body">{tr('Não encontras a tua?', 'Can’t find yours?')}</span>
        <Link to="/avaliar" className={`link ${styles.fs15}`}>
          {tr('Adicionar e avaliar', 'Add and review')}
        </Link>
      </div>
    </div>
  );
}
