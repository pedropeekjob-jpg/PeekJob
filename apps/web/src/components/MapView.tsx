import { lazy, Suspense, useMemo } from 'react';
import type { OrgLocation } from '../data/orgs';
import { tr } from '../i18n';
import { Icon } from './Icon';
import { mapPoints, useMapOptIn } from './map';
import styles from './MapView.module.css';

/** O mapa real (Leaflet) vem num ficheiro à parte: só se descarrega quando a pessoa pede */
const RealMap = lazy(() => import('./RealMap'));

interface Props {
  locations: OrgLocation[];
  active?: string | null;
  onPick?: (id: string) => void;
  height?: number;
  showLink?: boolean;
}

/**
 * Mapa dos locais. Primeiro uma ilustração (sem pedidos a outros sites); com coordenadas, "Ver no mapa" abre o
 * mapa real (OpenStreetMap ou o fornecedor configurado). A escolha fica lembrada neste browser.
 */
export function MapView({ locations, active, onPick, height = 180, showLink = true }: Props) {
  const points = useMemo(() => mapPoints(locations), [locations]);
  const [real, openReal] = useMapOptIn();
  const cur = locations.find((l) => l.id === active) ?? locations[0];
  const illustration = <Illustration locations={locations} cur={cur} onPick={onPick} height={height} />;
  const canReal = points.length > 0;

  return (
    <div className={`stack ${styles.map}`}>
      {canReal && real ? (
        <Suspense fallback={illustration}>
          <RealMap locations={locations} active={cur?.id} onPick={onPick} height={height} />
        </Suspense>
      ) : (
        illustration
      )}
      {canReal && !real && (
        <div className={`row wrap ${styles.realCta}`}>
          <button type="button" className={`btn btn-ghost btn-sm ${styles.realButton}`} onClick={openReal}>
            <Icon name="pin" size={16} /> {tr('Ver no mapa', 'Show on map')}
          </button>
          <span className="small muted">{tr('O mapa vem do OpenStreetMap (outro site).', 'The map comes from OpenStreetMap (another site).')}</span>
        </div>
      )}
      {showLink && cur && hasLink(cur) && (
        <a className={`link small ${styles.open}`} href={`https://www.openstreetmap.org/?mlat=${cur.lat}&mlon=${cur.lng}#map=17/${cur.lat}/${cur.lng}`} target="_blank" rel="noreferrer">
          {tr('Abrir no mapa', 'Open in map')} <Icon name="external" size={14} />
        </a>
      )}
    </div>
  );
}

const hasLink = (l: OrgLocation) => mapPoints([l]).length > 0;

/** Mapa ilustrado (sem dependências nem pedidos a outros sites); as posições dos pinos são aproximadas */
function Illustration({ locations, cur, onPick, height }: { locations: OrgLocation[]; cur?: OrgLocation; onPick?: (id: string) => void; height: number }) {
  const W = 400;
  const H = 180;
  return (
    <svg viewBox={`0 0 ${W} ${H}`} width="100%" height={height} preserveAspectRatio="xMidYMid slice" role={onPick ? 'group' : 'img'} aria-label={tr(`Mapa: ${cur?.address ?? ''}`, `Map: ${cur?.address ?? ''}`)} className={styles.canvas}>
      <path d="M0 150 C 90 132, 170 170, 270 154 S 380 136, 400 146 L 400 180 L 0 180 Z" fill="#CFE3E6" />
      <rect x="18" y="14" width="90" height="48" rx="8" fill="#ECEFEF" />
      <rect x="126" y="14" width="74" height="48" rx="8" fill="#ECEFEF" />
      <rect x="270" y="14" width="112" height="48" rx="8" fill="#DCEBDD" />
      <rect x="18" y="82" width="140" height="44" rx="8" fill="#ECEFEF" />
      <rect x="270" y="82" width="112" height="44" rx="8" fill="#ECEFEF" />
      <path d="M0 72 H400 M224 0 V140 M116 0 V72 M172 72 L224 132" stroke="#FFFFFF" strokeWidth="10" fill="none" strokeLinecap="round" />
      {locations.map((l) => {
        const x = (l.mapX / 100) * W;
        const y = (l.mapY / 100) * H;
        const on = l.id === cur?.id;
        return (
          <g
            key={l.id}
            onClick={onPick ? () => onPick(l.id) : undefined}
            className={onPick ? styles.pick : undefined}
            role={onPick ? 'button' : undefined}
            aria-label={onPick ? tr(`Escolher ${l.label}`, `Choose ${l.label}`) : undefined}
            tabIndex={onPick ? 0 : undefined}
            onKeyDown={onPick ? (e) => (e.key === 'Enter' || e.key === ' ') && onPick(l.id) : undefined}
          >
            {on && <circle className="pulse" cx={x} cy={y} r="18" fill="#00A9AF" />}
            <circle cx={x} cy={y} r={on ? 13 : 10} fill="#FFFFFF" stroke={on ? '#010B13' : '#A7A9AC'} strokeWidth="5" />
            <circle cx={x} cy={y} r="4" fill={on ? '#00A9AF' : '#A7A9AC'} />
          </g>
        );
      })}
    </svg>
  );
}
