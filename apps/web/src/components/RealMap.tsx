import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { useEffect, useRef, type CSSProperties } from 'react';
import type { OrgLocation } from '../data/orgs';
import { tr } from '../i18n';
import { mapPoints, tilesConfig } from './map';
import styles from './MapView.module.css';

const esc = (s: string) => s.replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);
/** A atribuição é obrigatória (licença dos dados); a menção ao OpenStreetMap leva à página de direitos */
const attributionHtml = (text: string) =>
  esc(text).replace('OpenStreetMap', '<a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noreferrer">OpenStreetMap</a>');

const TEAL = '#00A9AF';
const INK = '#010B13';

/**
 * Mapa real (Leaflet + mosaicos configuráveis). Carregado à parte, só quando a pessoa pede "Ver no mapa".
 * Os locais são marcadores redondos (sem imagens); o ativo maior e com contorno escuro. A escolha do local
 * com teclado faz-se na lista ao lado (o mapa é um complemento).
 */
export default function RealMap({
  locations,
  active,
  onPick,
  height,
}: {
  locations: OrgLocation[];
  active?: string | null;
  onPick?: (id: string) => void;
  height: number;
}) {
  const box = useRef<HTMLDivElement>(null);
  const map = useRef<L.Map | null>(null);
  const layer = useRef<L.LayerGroup | null>(null);
  const framed = useRef(false);
  const pick = useRef(onPick);
  useEffect(() => {
    pick.current = onPick;
  });

  // Cria o mapa uma vez (e desfaz ao sair)
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
      framed.current = false;
    };
  }, []);

  // Marcadores e enquadramento quando os locais ou o ativo mudam
  useEffect(() => {
    const m = map.current;
    const g = layer.current;
    if (!m || !g) return;
    g.clearLayers();
    const points = mapPoints(locations);
    const cur = points.find((p) => p.id === active) ?? points[0];
    for (const p of points) {
      const on = p.id === cur?.id;
      L.circleMarker([p.lat, p.lng], { radius: on ? 10 : 7, weight: on ? 4 : 3, color: on ? INK : '#FFFFFF', fillColor: TEAL, fillOpacity: 1 })
        .bindTooltip(p.label || p.address, { direction: 'top', offset: [0, -8] })
        .on('click', () => pick.current?.(p.id))
        .addTo(g);
    }
    if (!cur) return;
    if (!framed.current) {
      // primeira vez: todos os locais à vista (um só: perto, ao nível da rua)
      if (points.length === 1) m.setView([cur.lat, cur.lng], 16);
      else m.fitBounds(L.latLngBounds(points.map((p) => [p.lat, p.lng] as [number, number])), { padding: [28, 28], maxZoom: 16 });
      framed.current = true;
    } else if (!m.getBounds().contains([cur.lat, cur.lng])) {
      // escolheu outro local fora de vista: desloca até ele, sem mudar o zoom
      m.panTo([cur.lat, cur.lng]);
    }
  }, [locations, active]);

  const cur = locations.find((l) => l.id === active) ?? locations[0];
  return <div ref={box} className={styles.real} style={{ '--h': `${height}px` } as CSSProperties} role="region" aria-label={tr(`Mapa: ${cur?.address ?? ''}`, `Map: ${cur?.address ?? ''}`)} />;
}
