import { useCallback, useState, type PointerEvent, type ReactNode } from 'react';
import { DesktopHeader, MobileHomeHeader, SiteFooter } from '../components/Layout';
import { cursorLabelSpot, type Zone } from '../features/home/home';
import { Door, HomeMark, JobPanel, PeekPanel } from '../features/home/HomeParts';
import styles from '../features/home/Home.module.css';
import { useHomeZone } from '../features/home/useHomeZone';
import { tr } from '../i18n';
import { useMedia, useIsDesktop } from '../lib/useMedia';
import { preload } from './lazy';

/** A próxima página descarrega-se mal a pessoa mostra intenção (passar o rato ou escolher a zona) */
const NEXT = { peek: ['Pesquisa', 'Inicio'], job: ['AvaliarEscolher'] } as const;

/**
 * Página inicial (pedido do cliente): duas zonas de cor e o logo na fronteira.
 * O primeiro clique escolhe: a zona clicada estende-se até ocupar a página (a linha desliza para o fundo ou para o topo)
 * enquanto a outra se retrai, e só então mostra o que fazer (pesquisar ou avaliar). Com rato, uma mancha de luz segue o cursor.
 */
export default function Home() {
  const desktop = useIsDesktop();
  // só com rato/trackpad o campo recebe logo o foco (no telemóvel abriria o teclado sem a pessoa pedir)
  const finePointer = useMedia('(hover: hover) and (pointer: fine)');
  const { zone, open, close, typed, closed } = useHomeZone();
  const intent = useCallback((z: Zone) => preload(...NEXT[z]), []);
  const [hover, setHover] = useState<Zone | null>(null);

  // a mancha de luz e a etiqueta seguem o cursor (variáveis CSS, sem re-render); a etiqueta nunca tapa o logo
  const follow = useCallback((e: PointerEvent<HTMLElement>) => {
    if (e.pointerType !== 'mouse') return;
    const el = e.currentTarget;
    const r = el.getBoundingClientRect();
    const x = e.clientX - r.left;
    const y = e.clientY - r.top;
    el.style.setProperty('--gx', `${x}px`);
    el.style.setProperty('--gy', `${y}px`);
    const label = el.querySelector<HTMLElement>(`.${styles.cursorLabel}`);
    if (!label?.offsetWidth) return;
    const m = el.parentElement?.querySelector(`.${styles.mark}`)?.getBoundingClientRect();
    const avoid = m && { left: m.left - r.left, top: m.top - r.top, right: m.right - r.left, bottom: m.bottom - r.top };
    const spot = cursorLabelSpot({ x, y }, { w: label.offsetWidth, h: label.offsetHeight }, { w: r.width, h: r.height }, avoid ?? null);
    el.style.setProperty('--lx', `${spot.x}px`);
    el.style.setProperty('--ly', `${spot.y}px`);
  }, []);

  const half = (z: Zone) => ({
    className: `${styles.half} ${z === 'peek' ? styles.peek : styles.job}`,
    onPointerMove: follow,
    onPointerEnter: () => {
      setHover(z);
      intent(z);
    },
    onPointerLeave: () => setHover(null),
  });
  // a zona que se retrai fica vazia (só a cor, enquanto encolhe)
  const openZone = useCallback(
    (z: Zone) => {
      intent(z);
      open(z);
    },
    [intent, open],
  );
  const content = (z: Zone, panel: ReactNode) => (zone === z ? panel : zone === null ? <Door zone={z} onOpen={openZone} focusOnMount={closed === z} /> : null);

  return (
    <div className={styles.home}>
      {desktop ? <DesktopHeader home /> : <MobileHomeHeader />}
      <main id="conteudo" tabIndex={-1} className={styles.split} data-zone={zone ?? 'none'} data-hover={(zone === null && hover) || undefined}>
        <h1 className="sr-only">{tr('PeekJob: como é trabalhar lá dentro, contado por quem lá trabalha', 'PeekJob: what it’s like to work there, told by the people who do')}</h1>
        <div {...half('peek')}>
          <span className={styles.glow} aria-hidden="true" />
          {content('peek', <PeekPanel typed={typed} autoFocus={finePointer || typed !== ''} onClose={close} />)}
        </div>
        <div {...half('job')}>
          <span className={styles.glow} aria-hidden="true" />
          <span className={styles.rule} aria-hidden="true" />
          <HomeMark />
          {content('job', <JobPanel autoFocus={finePointer} onClose={close} />)}
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}
