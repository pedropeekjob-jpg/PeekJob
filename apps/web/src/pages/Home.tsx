import { useCallback, useState, type PointerEvent, type ReactNode } from 'react';
import { DesktopHeader, MobileHomeHeader, SiteFooter } from '../components/Layout';
import type { Zone } from '../features/home/home';
import { CursorHint, Door, HomeMark, JobPanel, PeekPanel } from '../features/home/HomeParts';
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
 * enquanto a outra se retrai, e só então mostra o que fazer (pesquisar ou avaliar). Com rato, uma dica segue o cursor.
 */
export default function Home() {
  const desktop = useIsDesktop();
  // só com rato/trackpad o campo recebe logo o foco (no telemóvel abriria o teclado sem a pessoa pedir)
  const finePointer = useMedia('(hover: hover) and (pointer: fine)');
  const { zone, open, close, typed, closed } = useHomeZone();
  const intent = useCallback((z: Zone) => preload(...NEXT[z]), []);
  const [hover, setHover] = useState<Zone | null>(null);

  // a mancha de luz e a dica seguem o cursor (variáveis CSS, sem re-render)
  const follow = useCallback((e: PointerEvent<HTMLElement>) => {
    if (e.pointerType !== 'mouse') return;
    const r = e.currentTarget.getBoundingClientRect();
    e.currentTarget.style.setProperty('--gx', `${e.clientX - r.left}px`);
    e.currentTarget.style.setProperty('--gy', `${e.clientY - r.top}px`);
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
          {zone === null && <CursorHint zone="peek" />}
        </div>
        <div {...half('job')}>
          <span className={styles.glow} aria-hidden="true" />
          <span className={styles.rule} aria-hidden="true" />
          <HomeMark />
          {content('job', <JobPanel autoFocus={finePointer} onClose={close} />)}
          {zone === null && <CursorHint zone="job" />}
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}
