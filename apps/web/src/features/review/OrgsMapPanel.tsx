import { lazy, Suspense, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { useMapOrgs } from '../../api/orgs';
import { Ring } from '../../components/Data';
import { Icon } from '../../components/Icon';
import { useMapOptIn } from '../../components/map';
import type { Org } from '../../data/orgs';
import { tr } from '../../i18n';
import { orgTypeLabel } from '../../i18n/labels';
import { plural } from '../../lib/format';
import { matchPins, orgPins, pinKey } from './orgsMap';
import styles from './OrgsMapPanel.module.css';

/** O mapa (Leaflet) vem num ficheiro à parte: só se descarrega quando a pessoa o abre */
const OrgsMap = lazy(() => import('./OrgsMap'));

/**
 * Empresas já avaliadas no mapa (pedido de 03/11), no passo «Onde trabalhas?». A lista continua a ser o
 * caminho principal: o mapa abre a pedido (vem de outro site, como o da página da organização) e no
 * telemóvel não fica aberto de uma visita para a outra, para o passo continuar leve. A pesquisa escrita
 * (nome, localidade ou morada) filtra os pinos.
 */
export function OrgsMapPanel({ query, desktop, onChoose, closed }: { query: string; desktop: boolean; onChoose: (org: Org, locationId: string) => void; closed?: ReactNode }) {
  const [consented, consent] = useMapOptIn();
  const [open, setOpen] = useState(desktop && consented);
  const orgs = useMapOrgs(open);
  const pins = useMemo(() => orgPins(orgs), [orgs]);
  const shown = useMemo(() => matchPins(pins, query), [pins, query]);
  const [picked, setPicked] = useState<string | null>(null);
  const selected = shown.find((p) => pinKey(p) === picked) ?? null;
  const selectedOrg = selected ? orgs.find((o) => o.id === selected.orgId) : undefined;
  // escolhido com o teclado: o foco passa para o botão de confirmar (o pino é redesenhado)
  const chooseRef = useRef<HTMLButtonElement>(null);
  const [focusChoose, setFocusChoose] = useState(0);
  useEffect(() => {
    if (focusChoose) chooseRef.current?.focus();
  }, [focusChoose]);

  if (!open) {
    return (
      <>
        {closed}
        <div className={`row wrap ${styles.cta}`}>
        <button
          type="button"
          className={`btn btn-ghost btn-sm ${styles.ctaButton}`}
          onClick={() => {
            consent();
            setOpen(true);
          }}
        >
          <Icon name="pin" size={16} /> {tr('Ver empresas avaliadas no mapa', 'Show reviewed organisations on a map')}
        </button>
          {!consented && <span className="small muted">{tr('O mapa vem do OpenStreetMap (outro site).', 'The map comes from OpenStreetMap (another site).')}</span>}
        </div>
      </>
    );
  }

  const orgCount = new Set(shown.map((p) => p.orgId)).size;
  const height = desktop ? 340 : 260;
  return (
    <div className={`fade-up ${styles.panel}`}>
      <div className={`row wrap between ${styles.head}`}>
        <span role="status" aria-label={tr('No mapa', 'On the map')} className="small muted">
          {orgCount > 0
            ? tr(`${plural(orgCount, 'organização avaliada', 'organizações avaliadas')} no mapa`, `${plural(orgCount, 'reviewed organisation', 'reviewed organisations')} on the map`)
            : query.trim()
              ? tr(`Nenhuma organização avaliada no mapa para «${query.trim()}».`, `No reviewed organisation on the map for “${query.trim()}”.`)
              : tr('Ainda não há organizações avaliadas no mapa.', 'No reviewed organisations on the map yet.')}
        </span>
        {!desktop && (
          <button type="button" className={`link small ${styles.close}`} onClick={() => setOpen(false)}>
            {tr('Fechar o mapa', 'Close the map')}
          </button>
        )}
      </div>
      <Suspense fallback={<div className={styles.real} style={{ ['--h' as string]: `${height}px` }} />}>
        <OrgsMap pins={shown} selected={selected ? pinKey(selected) : null} onSelect={(p, keyboard) => {
            setPicked(pinKey(p));
            if (keyboard) setFocusChoose((n) => n + 1);
          }} height={height} />
      </Suspense>
      {selected && selectedOrg ? (
        <div role="group" aria-label={selected.name} className={`fade-up ${styles.card}`}>
          <Ring value={selected.score} size={44} thickness={5} fontSize={14} />
          <span className={styles.cardText}>
            <span className={styles.cardName}>{selected.name}</span>
            <span className="small muted">
              {orgTypeLabel(selectedOrg.type)} · {plural(selected.reviewsCount, tr('avaliação', 'review'), tr('avaliações', 'reviews'))}
            </span>
            <span className="small muted">{selected.place && selected.place !== 'Sede' ? `${selected.place} · ${selected.address}` : selected.address}</span>
          </span>
          <button ref={chooseRef} type="button" className={`btn btn-primary btn-sm lift ${styles.choose}`} onClick={() => onChoose(selectedOrg, selected.locationId)}>
            {tr('É aqui que trabalho', 'I work here')}
          </button>
        </div>
      ) : (
        orgCount > 0 && <span className="small muted">{tr('Toca num pino para escolher o teu local de trabalho.', 'Tap a pin to choose your workplace.')}</span>
      )}
    </div>
  );
}
