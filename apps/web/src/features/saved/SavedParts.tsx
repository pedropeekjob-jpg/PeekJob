import { Link } from 'react-router';
import { Ring } from '../../components/Data';
import { Icon } from '../../components/Icon';
import type { CriterionKey } from '../../data/criteria';
import type { Org } from '../../data/orgs';
import { tr } from '../../i18n';
import { match } from '../../lib/match';
import { changeNote } from './saved';
import styles from './Saved.module.css';

/** Aviso temporário com "Desfazer" (fixo em baixo no telemóvel) */
export function UndoBar({ name, onUndo }: { name: string; onUndo: () => void }) {
  return (
    <div className={`fade-up row wrap between ${styles.undo}`} role="status">
      <span className={styles.undoText}>{tr(<>Deixaste de guardar <strong>{name}</strong>.</>, <>Removed <strong>{name}</strong> from Saved.</>)}</span>
      <button type="button" className={`btn btn-primary btn-sm ${styles.undoButton}`} onClick={onUndo}>
        {tr('Desfazer', 'Undo')}
      </button>
    </div>
  );
}

/** Uma guardada: nota, mudança desde que guardou, compatibilidade e deixar de guardar */
export function SavedRow({ org, prefs, desktop, onRemove }: { org: Org; prefs: CriterionKey[]; desktop: boolean; onRemove: (o: Org) => void }) {
  const note = changeNote(org, !desktop);
  const m = match(org, prefs);
  return (
    <article className={`row ${styles.row}`}>
      <Link to={`/org/${org.id}`} data-ev="select_org" data-ev-org-type={org.type} className={`plain row grow ${styles.link}`}>
        <Ring value={org.score} size={desktop ? 64 : 50} fontSize={desktop ? 20 : 15} inner="var(--ground)" muted={!org.reviewsCount} />
        <span className={`grow ${styles.text}`}>
          <span className={`${desktop ? 'num' : 'ellipsis'} ${styles.name}`}>{org.name}</span>
          <span className={`${desktop ? '' : 'ellipsis '}${styles.note}`} data-kind={note.kind} aria-label={note.aria}>
            {note.text}
          </span>
        </span>
        {desktop ? (
          <span className={`pill pill-match ${styles.pill}`}>{tr(`${m}% para ti`, `${m}% for you`)}</span>
        ) : (
          <span className={styles.match}>
            <span className={styles.matchNum}>{m}%</span>
            <span className={styles.matchLabel}>{tr('para ti', 'for you')}</span>
          </span>
        )}
      </Link>
      <button type="button" className="icon-btn bare" aria-label={tr(`Deixar de guardar ${org.name}`, `Remove ${org.name} from Saved`)} title={tr('Deixar de guardar', 'Remove from Saved')} onClick={() => onRemove(org)}>
        <Icon name="bookmark" size={18} filled />
      </button>
    </article>
  );
}

export function EmptySavedDesktop() {
  return (
    <div className={`fade-up row wrap ${styles.emptyDesktop}`}>
      <div aria-hidden="true" className={styles.emptyArt}>
        <div className={styles.emptyOuter} />
        <div className={styles.emptyInner} />
      </div>
      <div className={styles.emptyText}>
        <h2 className={`h2 ${styles.emptyTitle}`}>{tr('Ainda não guardaste nenhuma organização', 'You haven’t saved any organisations yet')}</h2>
        <p className={`lead ${styles.lead}`}>{tr('Carrega em Guardar na página de uma organização.', 'Click Save on an organisation’s page.')}</p>
        <Link to="/ranking" className={`btn btn-primary ${styles.emptyButton}`}>
          {tr('Ver o ranking', 'View the ranking')}
        </Link>
      </div>
    </div>
  );
}

export function EmptySavedMobile() {
  return (
    <div className={`fade-up ${styles.emptyMobile}`}>
      <div className={styles.emptyMobileTitle}>{tr('Ainda não guardaste nenhuma', 'You haven’t saved any yet')}</div>
      <div className="small muted">{tr('Toca em Guardar na página de uma organização.', 'Tap Save on an organisation’s page.')}</div>
      <Link to="/ranking" className={`btn btn-primary ${styles.emptyMobileButton}`}>
        {tr('Ver o ranking', 'View the ranking')}
      </Link>
    </div>
  );
}
