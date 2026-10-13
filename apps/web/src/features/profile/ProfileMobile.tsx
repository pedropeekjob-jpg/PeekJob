import { Link } from 'react-router-dom';
import { AnalyticsSwitch } from '../../components/ConsentBanner';
import { Icon } from '../../components/Icon';
import { LangSwitch, tr } from '../../i18n';
import { whenLabel } from '../../i18n/labels';
import { useToggle } from '../../lib/useToggle';
import { prefsSummary } from './profile';
import { MRow, ResetDemo, UnreadBadge } from './ProfileParts';
import type { Profile } from './useProfile';
import styles from './Profile.module.css';

/** Telemóvel: a conta como lista (atividade e mais) */
export function ProfileMobile({ p, email }: { p: Profile; email: string }) {
  const [mineOpen, toggleMine] = useToggle();
  return (
    <div className={`page ${styles.mobilePage}`}>
      <div className={styles.mobileHead}>
        <h1 className={styles.mobileTitle}>{tr('A tua conta', 'Your account')}</h1>
        <div className={`row small muted ${styles.anonLine}`}>
          <Icon name="lock" size={14} />
          {tr('Para os outros és anónimo/a.', 'To others you’re anonymous.')}
        </div>
      </div>

      <section aria-label={tr('A tua atividade', 'Your activity')} className="stack">
        <MRow to="/apoio" label={tr('Mensagens', 'Messages')}>
          {p.unread > 0 ? <UnreadBadge n={p.unread} size={24} /> : <span className="small muted">{tr('Sem novas', 'None new')}</span>}
        </MRow>
        <MRow to="/preferencias" label={tr('O que valorizo', 'What I value')}>
          <span className={`small muted ellipsis ${styles.prefsSummary}`}>{prefsSummary(p.prefs)}</span>
        </MRow>
        <button type="button" onClick={toggleMine} aria-expanded={mineOpen} className={`row ${styles.mrow} ${styles.mrowButton}`}>
          <span className={`grow ${styles.mrowLabel}`}>{tr('As minhas avaliações', 'My reviews')}</span>
          <span className="small muted">{p.myReviews.length}</span>
          <Icon name="next" size={16} className={`${styles.arrow} ${styles.turn}`} />
        </button>
        {mineOpen && (
          <div className={`fade-up ${styles.mine}`}>
            {p.myReviews.length === 0 && <span className={`small muted ${styles.mineEmpty}`}>{tr('Ainda não avaliaste nenhuma organização.', 'You haven’t reviewed any organisation yet.')}</span>}
            {p.myReviews.map((r) => (
              <Link key={r.id} to={`/org/${r.orgId}`} className={`plain row ${styles.mineItem}`}>
                <span className={`grow ${styles.mrowLabel}`}>{p.orgName(r.orgId)}</span>
                <span className="small muted">
                  {tr('Publicada', 'Published')} · {whenLabel(r.when)}
                </span>
              </Link>
            ))}
          </div>
        )}
        <MRow to="/avaliar/verificar" label={tr('Verificação', 'Verification')} last>
          <span className="small muted">{p.verification}</span>
        </MRow>
      </section>

      <section aria-label={tr('Mais', 'More')} className="stack">
        {p.settings.slice(1).map((s) => (
          <MRow key={s.label} to={s.to} label={s.label} />
        ))}
        <div className={`row between ${styles.mrow}`}>
          <span className={styles.mrowLabel}>{tr('Idioma', 'Language')}</span>
          <LangSwitch />
        </div>
        <AnalyticsSwitch />
        <button type="button" onClick={p.signOut} className={`row between ${styles.mrow} ${styles.mrowButton} ${styles.signOut}`} data-last>
          {tr('Terminar sessão', 'Sign out')}
          <span className={`small muted ${styles.signOutEmail}`}>{email}</span>
        </button>
        <div className={styles.resetWrap}>
          <ResetDemo p={p} />
        </div>
      </section>
    </div>
  );
}
