import { useState } from 'react';
import { Icon } from '../../components/Icon';
import { MapView } from '../../components/MapView';
import type { Org } from '../../data/orgs';
import { tr } from '../../i18n';
import { fmt } from '../../lib/format';
import { useToggle } from '../../lib/useToggle';
import { BigRing } from '../../components/Score';
import { BackButton } from '../../components/UI';
import { MobileCriteria } from './Criteria';
import { MobileInterviews } from './Interviews';
import { locationsSuffix, orgMetaLine, scoreAria, shareCta, type OrgTab } from './org';
import { LocationList, ManagedLine, OrgTabs, SaveButton } from './OrgCommon';
import { ReviewsSection } from './Reviews';
import { MobileSalaries } from './Salaries';
import { useOrgActions } from './useOrgPage';
import styles from './OrgMobile.module.css';

/** Telemóvel: entrevistas e salários com cabeçalho curto; avaliações com resumo, critérios e mapa */
export function OrgMobile({ org, tab }: { org: Org; tab: OrgTab }) {
  const { has, m, startReview, share } = useOrgActions(org);
  const [active, setActive] = useState(org.locations[0]?.id ?? '');

  if (tab !== 'avaliacoes') {
    return (
      <div className={`page ${styles.page}`}>
        <div className={`row ${styles.head}`}>
          <BackButton fallback="/ranking" />
          <div className="stack grow">
            <h1 className="h2 ellipsis">{org.name}</h1>
            <span className="small muted">{has ? tr(`${fmt(org.score)} · ${m}% para ti`, `${fmt(org.score)} · ${m}% for you`) : tr('Ainda sem avaliações', 'No reviews yet')}</span>
          </div>
        </div>
        <OrgTabs org={org} tab={tab} desktop={false} />
        {tab === 'entrevistas' ? <MobileInterviews org={org} /> : <MobileSalaries org={org} />}
        <div className={`sticky-cta ${styles.sticky}`}>
          <button type="button" className={`btn btn-primary btn-block ${styles.cta}`} onClick={() => share(tab)}>
            {shareCta(tab, org.type)}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className={`page ${styles.reviewsPage}`}>
      <div className="row between">
        <BackButton fallback="/ranking" />
        <SaveButton org={org} />
      </div>

      <section aria-label={tr('Resumo', 'Summary')} className={styles.summary}>
        <div className={styles.titleBlock}>
          <h1 className={`h1 ${styles.title}`}>{org.name}</h1>
          <div className="small muted">
            {orgMetaLine(org)}
            {locationsSuffix(org.locations.length)}
          </div>
          <ManagedLine org={org} />
        </div>
        <div className={`row ${styles.scoreRow}`}>
          <BigRing value={org.score} size={112} thickness={11} muted={!has} ariaLabel={scoreAria(org)}>
            <span className={styles.score}>{has ? fmt(org.score) : '—'}</span>
            <span className={styles.unit}>{has ? tr('de 5', 'out of 5') : tr('sem nota', 'no score')}</span>
          </BigRing>
          <div className={styles.matchCol}>
            {has && (
              <div className={`row ${styles.match}`}>
                <span className={`num ${styles.matchValue}`}>{m}%</span>
                <span className={styles.matchLabel}>{tr('para ti', 'for you')}</span>
              </div>
            )}
            <p className={`body ${styles.summaryText}`}>{org.summary}</p>
          </div>
        </div>
        <button type="button" className={`btn btn-primary btn-block ${styles.cta}`} onClick={startReview}>
          {tr('Avaliar esta organização', 'Review this organisation')}
        </button>
      </section>

      {has && <MobileCriteria org={org} />}

      <MobileMap org={org} active={active} setActive={setActive} />

      <section aria-label={tr('Opiniões', 'Opinions')} className={styles.reviews}>
        <OrgTabs org={org} tab={tab} desktop={false} />
        <ReviewsSection org={org} desktop={false} />
      </section>
    </div>
  );
}

/** Morada (ou n.º de locais) que abre o mapa e a escolha do local */
function MobileMap({ org, active, setActive }: { org: Org; active: string; setActive: (id: string) => void }) {
  const [open, toggle] = useToggle();
  const cur = org.locations.find((l) => l.id === active) ?? org.locations[0];
  if (!cur) return null;
  const many = org.locations.length > 1;
  return (
    <section aria-label={tr('Localização', 'Location')} className={styles.map}>
      <button type="button" aria-expanded={open} aria-controls="org-map" onClick={toggle} className={`row ${styles.mapToggle}`}>
        <Icon name="pin" size={20} className={styles.pin} />
        <span className={`grow ellipsis ${styles.mapLabel}`}>{many ? tr(`${org.locations.length} locais · ${org.city}`, `${org.locations.length} locations · ${org.city}`) : cur.address}</span>
        <span className={styles.mapAction}>{open ? tr('Fechar', 'Close') : tr('Ver mapa', 'See map')}</span>
      </button>
      {open && (
        <div id="org-map" className={`fade-up ${styles.mapBody}`}>
          <MapView locations={org.locations} active={active} onPick={many ? setActive : undefined} height={160} />
          <LocationList org={org} active={active} onPick={setActive} />
        </div>
      )}
    </section>
  );
}
