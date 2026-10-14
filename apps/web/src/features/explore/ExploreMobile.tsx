import { Link } from 'react-router';
import { Logo } from '../../components/Brand';
import { Ring } from '../../components/Data';
import { Icon } from '../../components/Icon';
import { WEEK_TAGS } from '../../data/content';
import { tr } from '../../i18n';
import { orgTypeLabel, tagLabel } from '../../i18n/labels';
import { useStore } from '../../lib/store';
import { deltaText, prefsLine } from './explore';
import { PrioritiesInvite } from './PrioritiesInvite';
import { useForYou, useMovers } from './useExplore';
import styles from './Explore.module.css';

function BigAction({ to, icon, title, sub, primary = false }: { to: string; icon: string; title: string; sub: string; primary?: boolean }) {
  return (
    <Link to={to} className={`plain row lift ${primary ? 'zone ' : ''}${styles.action}`} data-primary={primary || undefined}>
      <span className={styles.actionIcon}>
        <Icon name={icon} size={18} stroke={2.2} />
      </span>
      <span className={styles.actionText}>
        <span className={`num ${styles.actionTitle}`}>{title}</span>
        <span className={styles.actionSub}>{sub}</span>
      </span>
    </Link>
  );
}

/** Telemóvel: as duas ações, 3 organizações para ti e o pulso da semana numa fita */
export function ExploreMobile() {
  const { prefs } = useStore();
  const forYou = useForYou();
  const list = forYou.list.slice(0, 3);
  const { ups, downs } = useMovers();
  const moved = [...ups.slice(0, 2), ...downs.slice(0, 1)];

  return (
    <div className="page">
      <div className="row between">
        <Link to="/" aria-label="PeekJob">
          <Logo height={44} />
        </Link>
        <Link to="/perfil" className="icon-btn" aria-label={tr('Perfil', 'Profile')}>
          <Icon name="user" size={18} />
        </Link>
      </div>

      <h1 className={`display ${styles.mobileTitle}`}>{tr('Como é trabalhar lá dentro?', 'What’s it like to work there?')}</h1>

      <div className={styles.actions}>
        <BigAction to="/pesquisa" icon="search" title={tr('Procurar uma organização', 'Find an organisation')} sub={tr('PME, associações, voluntariado', 'SMEs, associations, volunteering')} />
        <BigAction to="/avaliar" icon="plus" title={tr('Avaliar onde trabalho', 'Review where I work')} sub={tr('2 minutos · anónimo', '2 minutes · anonymous')} primary />
      </div>

      <section className={styles.forYouMobile} aria-labelledby="para-ti-m">
        <div className={`row between ${styles.baseline}`}>
          <h2 id="para-ti-m" className="h2">
            {forYou.chosen ? tr('Para ti', 'For you') : tr('Mais bem avaliadas', 'Top rated')}
          </h2>
          {forYou.chosen && (
            <Link to="/preferencias" className={`link small ${styles.medium}`}>
              {tr('Mudar prioridades', 'Change priorities')}
            </Link>
          )}
        </div>
        {forYou.chosen ? (
          <div className={`small muted ${styles.prefsLine}`}>{prefsLine(prefs)}</div>
        ) : (
          <PrioritiesInvite />
        )}
        <div className={styles.cards}>
          {list.map(({ org, match }) => (
            <Link key={org.id} to={`/org/${org.id}`} data-ev="select_org" data-ev-org-type={org.type} className={`plain row lift ${styles.card}`}>
              <Ring value={org.score} size={46} thickness={5} fontSize={15} />
              <span className={`grow ${styles.cardText}`}>
                <span className={`ellipsis ${styles.cardName}`}>{org.name}</span>
                <span className="small muted ellipsis">
                  {orgTypeLabel(org.type)} · {org.city}
                </span>
              </span>
              {forYou.personal && (
                <span className={styles.match}>
                  <span className={`num ${styles.matchNum}`}>{match}%</span>
                  <span className={styles.matchLabel}>{tr('para ti', 'for you')}</span>
                </span>
              )}
            </Link>
          ))}
        </div>
        <Link to="/pesquisa" className={`link small ${styles.more}`}>
          {tr('Ver mais organizações →', 'Show more organisations →')}
        </Link>
      </section>

      <section aria-label={tr('Pulso da semana', 'This week’s pulse')} className={`row ${styles.pulseMobile}`}>
        <Link to="/ranking" className={`label ${styles.pulseLabel}`}>
          {tr('Pulso', 'Pulse')}
        </Link>
        {/* desliza na horizontal: focável para se poder percorrer com o teclado (WCAG 2.1.1) */}
        <div role="group" tabIndex={0} aria-label={tr('Subidas, descidas e temas da semana', 'This week’s rises, falls and topics')} className={`grow row ${styles.strip}`}>
          {moved.map((o) => (
            <Link key={o.id} to={`/org/${o.id}`} data-ev="select_org" data-ev-org-type={o.type} className={`plain row ${styles.stripItem} ${styles.stripOrg}`}>
              {o.name}
              <span className={`mono ${styles.stripDelta}`} data-up={o.weekDelta > 0 || undefined}>
                {deltaText(o)}
              </span>
            </Link>
          ))}
          {WEEK_TAGS.map((t) => (
            <span key={t.label} className={`row ${styles.stripItem} ${styles.stripTag}`}>
              «{tagLabel(t.label)}»
              <span className={`mono ${styles.stripDelta}`} data-up={t.up || undefined}>
                {t.up ? '▲' : '▼'} {t.n}
              </span>
            </span>
          ))}
        </div>
      </section>
    </div>
  );
}
