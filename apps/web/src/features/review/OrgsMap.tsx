import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { useEffect, useRef, type CSSProperties } from 'react';
import { attributionHtml, tilesConfig } from '../../components/map';
import { tr } from '../../i18n';
import { pinKey, type MapPin } from './orgsMap';
import styles from './OrgsMapPanel.module.css';

/** Portugal continental à vista quando não há pinos */
const PORTUGAL: L.LatLngBoundsExpression = [
  [36.95, -9.5],
  [42.15, -6.2],
];

/** Pino nas cores da PeekJob (turquesa com centro branco; o escolhido a tinta, maior). SVG, sem imagens. */
const pinSvg = (on: boolean) => {
  const fill = on ? '#010B13' : '#00A9AF';
  const dot = on ? '#00A9AF' : '#FFFFFF';
  return `<svg viewBox="0 0 32 42" width="100%" height="100%" aria-hidden="true"><path d="M16 1C7.7 1 1 7.6 1 15.8 1 26.6 16 41 16 41s15-14.4 15-25.2C31 7.6 24.3 1 16 1z" fill="${fill}" stroke="#FFFFFF" stroke-width="2"/><circle cx="16" cy="15.5" r="6" fill="${dot}"/></svg>`;
};
const icon = (on: boolean) => {
  const [w, h] = on ? [36, 47] : [28, 37];
  return L.divIcon({ html: pinSvg(on), className: styles.pin, iconSize: [w, h], iconAnchor: [w / 2, h], tooltipAnchor: [0, -h] });
};

/**
 * Mapa real das organizações já avaliadas (Leaflet, carregado à parte e só a pedido). Cada pino é um botão
 * (rato, toque, Tab e Enter ou espaço); escolhido um pino, o cartão por baixo do mapa diz qual é e deixa avançar.
 * Quando a pesquisa muda, enquadra os pinos que coincidem.
 */
export default function OrgsMap({ pins, selected, onSelect, height }: { pins: MapPin[]; selected: string | null; onSelect: (p: MapPin, keyboard?: boolean) => void; height: number }) {
  const box = useRef<HTMLDivElement>(null);
  const map = useRef<L.Map | null>(null);
  const layer = useRef<L.LayerGroup | null>(null);
  const select = useRef(onSelect);
  useEffect(() => {
    select.current = onSelect;
  });

  useEffect(() => {
    if (!box.current) return;
    const tiles = tilesConfig();
    const m = L.map(box.current, { scrollWheelZoom: false, zoomControl: false, attributionControl: true });
    m.attributionControl.setPrefix(false);
    L.control.zoom({ zoomInTitle: tr('Aproximar', 'Zoom in'), zoomOutTitle: tr('Afastar', 'Zoom out') }).addTo(m);
    L.tileLayer(tiles.url, { attribution: attributionHtml(tiles.attribution), maxZoom: 19 }).addTo(m);
    layer.current = L.layerGroup().addTo(m);
    map.current = m;
    return () => {
      m.remove();
      map.current = null;
    };
  }, []);

  // enquadra quando muda o conjunto de pinos (pesquisa), não quando se escolhe um
  const ids = pins.map(pinKey).join('|');
  useEffect(() => {
    const m = map.current;
    if (!m) return;
    if (pins.length === 0) m.fitBounds(PORTUGAL);
    else if (pins.length === 1) m.setView([pins[0].lat, pins[0].lng], 16);
    else m.fitBounds(L.latLngBounds(pins.map((p) => [p.lat, p.lng] as [number, number])), { padding: [32, 32], maxZoom: 16 });
    // eslint-disable-next-line react-hooks/exhaustive-deps -- `ids` resume os pinos
  }, [ids]);

  useEffect(() => {
    const g = layer.current;
    if (!g) return;
    g.clearLayers();
    for (const p of pins) {
      const on = pinKey(p) === selected;
      const label = p.place && p.place !== 'Sede' ? `${p.name} · ${p.place}` : p.name;
      const marker = L.marker([p.lat, p.lng], { icon: icon(on), keyboard: true, title: label, alt: label, zIndexOffset: on ? 1000 : 0, riseOnHover: true })
        .bindTooltip(label, { direction: 'top' })
        .on('click', () => select.current(p))
        .addTo(g);
      const el = marker.getElement();
      el?.setAttribute('aria-label', label);
      el?.setAttribute('aria-pressed', String(on));
      // o Leaflet põe o pino no Tab (role=button) mas não reage ao Enter nem ao espaço
      el?.addEventListener('keydown', (e) => {
        if (e.key !== 'Enter' && e.key !== ' ') return;
        e.preventDefault();
        select.current(p, true);
      });
    }
  }, [pins, selected]);

  return <div ref={box} className={styles.real} style={{ '--h': `${height}px` } as CSSProperties} role="region" aria-label={tr('Mapa das organizações avaliadas', 'Map of reviewed organisations')} />;
}
