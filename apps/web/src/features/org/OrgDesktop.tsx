import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Ring } from '../../components/Data';
import { Icon } from '../../components/Icon';
import { MapView } from '../../components/MapView';
import type { Org } from '../../data/orgs';
import { tr } from '../../i18n';
import { orgTypeLabel, sectorLabel } from '../../i18n/labels';
import { fmt, plural } from '../../lib/format';
import { BigRing } from '../../components/Score';
import { DesktopCriteria, DesktopRespeito } from './Criteria';
import { DesktopInterviews } from './Interviews';
import { locationsSuffix, osmLink, scoreAria, shareCta, type OrgTab } from './org';
import { LocationList, OrgTabs, SaveButton } from './OrgCommon';
import { ReviewsSection } from './Reviews';
import { DesktopSalaries } from './Salaries';
import { useOrgActions } from './useOrgPage';
import styles from './OrgDesktop.module.css';

function BackToRanking() {
  return (
    <Link to="/ranking" className={`row ${styles.back}`}>
      <Icon name="back" size={16} /> Ranking
    </Link>
  );
}

/** Computador: cabeçalho, separadores e duas colunas (conteúdo + lateral) */
export function OrgDesktop({ org, tab }: { org: Org; tab: OrgTab }) {
  const { has, m, startReview } = useOrgActions(org);

  if (tab !== 'avaliacoes') {
    return (
      <div className={`container ${styles.container}`}>
        <BackToRanking />
        <section aria-label={tr('Organização', 'Organisation')} className={`row wrap ${styles.head}`}>
          <Ring value={org.score} size={80} inner="var(--ground)" fontSize={24} muted={!has} />
          <div className={`row wrap ${styles.nameBlock}`}>
            <h1 className={`h1 ${styles.name}`}>{org.name}</h1>
            {has && <span className={`pill pill-match ${styles.matchPill}`}>{tr(`${m}% para ti`, `${m}% for you`)}</span>}
          </div>
          <button type="button" className={`btn btn-primary lift ${styles.cta}`} onClick={startReview}>
            {shareCta(tab, org.type)}
          </button>
        </section>
        <OrgTabs org={org} tab={tab} desktop />
        <div className={styles.columns}>{tab === 'entrevistas' ? <DesktopInterviews org={org} /> : <DesktopSalaries org={org} />}</div>
      </div>
    );
  }

  return (
    <div className={`container ${styles.container}`}>
      <BackToRanking />
      <section aria-label={tr('Resumo', 'Summary')} className={`row wrap between ${styles.summary}`}>
        <div className={styles.summaryText}>
          <h1 className={`h1 ${styles.bigName}`}>{org.name}</h1>
          <span className={`muted ${styles.meta}`}>
            {orgTypeLabel(org.type)} · {sectorLabel(org.sector)} · {org.city}
            {locationsSuffix(org.locations.length)}
          </span>
          <p className={`body ${styles.lead}`}>{org.summary}</p>
          <div className={`row wrap ${styles.actions}`}>
            <button type="button" className={`btn btn-primary lift ${styles.review}`} onClick={startReview}>
              {tr('Avaliar esta organização', 'Review this organisation')}
            </button>
            <SaveButton org={org} large />
          </div>
        </div>
        <div className={styles.scoreCol}>
          <BigRing value={org.score} size={208} thickness={17} muted={!has} ariaLabel={scoreAria(org)}>
            <span className={styles.score}>{has ? fmt(org.score) : '—'}</span>
            <span className={styles.unit}>
              {has ? tr(`de 5 · ${plural(org.reviewsCount, 'avaliação', 'avaliações')}`, `out of 5 · ${plural(org.reviewsCount, 'review', 'reviews')}`) : tr('sem avaliações', 'no reviews')}
            </span>
          </BigRing>
          {has && <span className={`pill pill-match ${styles.matchPillLarge}`}>{tr(`${m}% para ti`, `${m}% for you`)}</span>}
        </div>
      </section>

      <OrgTabs org={org} tab={tab} desktop />

      <div className={styles.columnsReviews}>
        <section aria-label={tr('Avaliações', 'Reviews')} className="stack">
          <ReviewsSection org={org} desktop />
        </section>
        <aside className={styles.aside}>
          {has && <DesktopRespeito org={org} />}
          {has && <DesktopCriteria org={org} />}
          <WhereItIs org={org} />
        </aside>
      </div>
    </div>
  );
}

/** Mapa, locais e ligação para o OpenStreetMap */
function WhereItIs({ org }: { org: Org }) {
  const [active, setActive] = useState(org.locations[0]?.id ?? '');
  const cur = org.locations.find((l) => l.id === active) ?? org.locations[0];
  return (
    <section aria-labelledby="onde-fica" className={styles.where}>
      <h2 id="onde-fica" className={`h2 ${styles.whereTitle}`}>
        {tr('Onde fica', 'Where it is')}
      </h2>
      <MapView locations={org.locations} active={active} onPick={org.locations.length > 1 ? setActive : undefined} height={190} showLink={false} />
      <LocationList org={org} active={active} onPick={setActive} />
      {cur && (
        <a className={`link ${styles.osm}`} href={osmLink(cur)} target="_blank" rel="noreferrer">
          {tr('Abrir no mapa', 'Open in map')} <Icon name="external" size={14} />
        </a>
      )}
    </section>
  );
}
