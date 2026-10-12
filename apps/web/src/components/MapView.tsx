import type { OrgLocation } from '../data/orgs';
import { Icon } from './Icon';

/**
 * Mapa ilustrado (sem dependências nem chaves de API).
 * No produto final pode ser trocado por MapLibre/Leaflet com tiles OpenStreetMap usando lat/lng.
 */
export function MapView({
  locations,
  active,
  onPick,
  height = 180,
  showLink = true,
}: {
  locations: OrgLocation[];
  active?: string | null;
  onPick?: (id: string) => void;
  height?: number;
  showLink?: boolean;
}) {
  const cur = locations.find((l) => l.id === active) ?? locations[0];
  const W = 400;
  const H = 180;
  return (
    <div className="stack" style={{ gap: 8 }}>
      <svg viewBox={`0 0 ${W} ${H}`} width="100%" height={height} preserveAspectRatio="xMidYMid slice" role="img" aria-label={`Mapa: ${cur?.address ?? ''}`} style={{ borderRadius: 18, background: '#E9EEEF' }}>
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
              style={{ cursor: onPick ? 'pointer' : 'default' }}
              role={onPick ? 'button' : undefined}
              aria-label={onPick ? `Escolher ${l.label}` : undefined}
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
      {showLink && cur && (
        <a
          className="link small"
          style={{ padding: 0, minHeight: 32 }}
          href={`https://www.openstreetmap.org/?mlat=${cur.lat}&mlon=${cur.lng}#map=17/${cur.lat}/${cur.lng}`}
          target="_blank"
          rel="noreferrer"
        >
          Abrir no mapa <Icon name="external" size={14} />
        </a>
      )}
    </div>
  );
}
