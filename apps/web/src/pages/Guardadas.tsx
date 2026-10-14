import { Link } from 'react-router-dom';
import { Icon } from '../components/Icon';
import { Shell } from '../components/Layout';
import { orgCount } from '../features/saved/saved';
import { EmptySavedDesktop, EmptySavedMobile, SavedRow, UndoBar } from '../features/saved/SavedParts';
import styles from '../features/saved/Saved.module.css';
import { useSaved } from '../features/saved/useSaved';
import { tr } from '../i18n';
import { useIsDesktop } from '../lib/useMedia';

/** Organizações guardadas (contentor: lista, desfazer e layout) */
export default function Guardadas() {
  const desktop = useIsDesktop();
  const { items, prefs, last, remove, undo } = useSaved();
  const undoBar = last && <UndoBar name={last.name} onUndo={undo} />;
  const rows = items.map((o) => <SavedRow key={o.id} org={o} prefs={prefs} desktop={desktop} onRemove={remove} />);

  if (desktop) {
    return (
      <Shell nav>
        <div className={`container ${styles.container}`}>
          <div className={`row wrap between zone zone-band ${styles.desktopHead}`}>
            <div className={styles.desktopTitleBlock}>
              <h1 className={`h1 ${styles.desktopTitle}`}>{tr('Guardadas', 'Saved')}</h1>
              <p className={`lead ${styles.lead}`}>
                {orgCount(items.length)} · {tr('avisamos-te quando algo muda.', 'we’ll let you know when something changes.')}
              </p>
            </div>
            <Link to="/ranking" className="btn btn-dark">
              {tr('Descobrir mais', 'Discover more')} <Icon name="next" size={18} />
            </Link>
          </div>
          {undoBar}
          {items.length > 0 ? <div className={styles.grid}>{rows}</div> : <EmptySavedDesktop />}
        </div>
      </Shell>
    );
  }

  return (
    <Shell nav>
      <div className={`page ${styles.page}`}>
        <div className={`zone zone-band ${styles.head}`}>
          <h1 className={`h1 ${styles.title}`}>{tr('Guardadas', 'Saved')}</h1>
          <div className="small muted">
            {items.length > 0 ? `${orgCount(items.length)} · ` : ''}
            {tr('Avisamos-te quando algo muda.', 'We’ll let you know when something changes.')}
          </div>
        </div>
        <div className="stack">
          {rows}
          {items.length === 0 && <EmptySavedMobile />}
        </div>
        {items.length > 0 && (
          <Link to="/ranking" className={`link ${styles.more}`}>
            {tr('Descobrir mais organizações', 'Discover more organisations')} <Icon name="next" size={16} />
          </Link>
        )}
      </div>
      {undoBar}
    </Shell>
  );
}
