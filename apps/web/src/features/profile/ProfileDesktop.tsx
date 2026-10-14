import { Link } from 'react-router-dom';
import { AnalyticsSwitch } from '../../components/ConsentBanner';
import { Ring } from '../../components/Data';
import { Icon } from '../../components/Icon';
import { LangSwitch, tr } from '../../i18n';
import { whenLabel } from '../../i18n/labels';
import { fmt } from '../../lib/format';
import { PrefChips, ResetDemo, UnreadBadge } from './ProfileParts';
import type { Profile } from './useProfile';
import styles from './Profile.module.css';

/** Computador: cartões à esquerda, avaliações e definições à direita */
export function ProfileDesktop({ p, email }: { p: Profile; email: string }) {
  return (
    <div className={`container ${styles.desktop}`}>
      <h1 className={`zone zone-band ${styles.desktopTitle}`}>{tr('A tua conta', 'Your account')}</h1>
      <div className={`row wrap between ${styles.columns}`}>
        <div className={styles.left}>
          <div className={`zone ${styles.anonCard}`}>
            <div aria-hidden="true" className={`float ${styles.anonDeco}`} />
            <div className={styles.anonTitle}>{tr('Para os outros és anónimo/a', 'To others you’re anonymous')}</div>
            <div className={styles.anonText}>{tr('Nem a PeekJob liga o teu email às avaliações.', 'Not even PeekJob links your email to your reviews.')}</div>
          </div>

          <Link to="/apoio" className={`plain row lift ${styles.messages}`}>
            <span className={styles.messagesIcon}>
              <Icon name="mail" size={18} stroke={2} />
            </span>
            <span className={`grow ${styles.messagesText}`}>
              <span className={styles.strong}>{tr('Mensagens', 'Messages')}</span>
              <span className={`small ${styles.purple}`}>
                {tr('Onde pedir ajuda', 'Where to get help')}
                {p.lastWhen ? ` · ${p.lastWhen}` : ''}
              </span>
            </span>
            {p.unread > 0 && <UnreadBadge n={p.unread} size={28} />}
          </Link>

          <section aria-label={tr('O que valorizo', 'What I value')} className={styles.values}>
            <div className="row between">
              <h2 className={styles.h2}>{tr('O que valorizo', 'What I value')}</h2>
              <Link to="/preferencias" className={`link ${styles.change}`}>
                {tr('Mudar', 'Change')}
              </Link>
            </div>
            <PrefChips prefs={p.prefs} />
          </section>

          <ResetDemo p={p} />
        </div>

        <div className={styles.right}>
          <section aria-label={tr('As minhas avaliações', 'My reviews')}>
            <h2 className={`${styles.h2} ${styles.h2Spaced}`}>{tr('As minhas avaliações', 'My reviews')}</h2>
            {p.myReviews.length === 0 && <p className="body">{tr('Ainda não avaliaste nenhuma organização.', 'You haven’t reviewed any organisation yet.')}</p>}
            {p.myReviews.map((r) => (
              <Link key={r.id} to={`/org/${r.orgId}`} className={`plain row ${styles.hover} ${styles.reviewRow}`}>
                <Ring value={r.avg} size={48} thickness={5} inner="var(--ground)" fontSize={15} ariaLabel={tr(`A tua nota ${fmt(r.avg)} de 5`, `Your score ${fmt(r.avg)} out of 5`)} />
                <span className={`grow ${styles.messagesText}`}>
                  <span className={styles.strong}>{p.orgName(r.orgId)}</span>
                  <span className="small muted">{whenLabel(r.when)}</span>
                </span>
                <span className={`small ${styles.published}`}>{tr('Publicada', 'Published')}</span>
              </Link>
            ))}
          </section>

          <section aria-label={tr('Definições', 'Settings')}>
            <h2 className={`${styles.h2} ${styles.h2Spaced}`}>{tr('Definições', 'Settings')}</h2>
            {p.settings.map((s) => (
              <Link key={s.label} to={s.to} className={`plain row between ${styles.hover} ${styles.settingRow}`}>
                <span className={styles.settingLabel}>{s.label}</span>
                <span className={`row small muted ${styles.settingValue}`}>
                  {s.value}
                  <Icon name="next" size={16} className={styles.arrow} />
                </span>
              </Link>
            ))}
            <div className={`row between ${styles.langRow}`}>
              <span className={styles.settingLabel}>{tr('Idioma', 'Language')}</span>
              <LangSwitch />
            </div>
            <AnalyticsSwitch />
            <button type="button" onClick={p.signOut} className={`row between ${styles.signOutDesktop}`}>
              {tr('Terminar sessão', 'Sign out')}
              <span className={`small muted ${styles.signOutEmail}`}>{email}</span>
            </button>
          </section>
        </div>
      </div>
    </div>
  );
}
