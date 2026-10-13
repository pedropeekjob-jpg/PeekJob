import { useCallback, useEffect, useRef, useState, type PointerEvent } from 'react';
import { Link } from 'react-router-dom';
import { LogoAnimated } from '../components/Brand';
import { Icon } from '../components/Icon';
import { DesktopHeader, MobileHomeHeader, SiteFooter } from '../components/Layout';
import { tr } from '../i18n';
import { useIsDesktop } from '../lib/useMedia';
import '../styles/home.css';

type Door = 'peek' | 'job' | null;

/**
 * Página inicial (esboço do cliente): duas zonas de cor, cada uma um botão inteiro,
 * e o logo na fronteira, a mudar de cor ao atravessar a linha.
 * - Em cima, "peek": espreitar organizações (explorar e pesquisar).
 * - Em baixo, "Job": o teu trabalho (avaliar).
 */
export default function Home() {
  const desktop = useIsDesktop();
  const [door, setDoor] = useState<Door>(null);

  // A mancha de luz segue o cursor (em ecrãs táteis anda sozinha, devagar)
  const follow = useCallback((e: PointerEvent<HTMLElement>) => {
    if (e.pointerType !== 'mouse') return;
    const r = e.currentTarget.getBoundingClientRect();
    e.currentTarget.style.setProperty('--gx', `${e.clientX - r.left}px`);
    e.currentTarget.style.setProperty('--gy', `${e.clientY - r.top}px`);
  }, []);

  const enter = (d: Door) => () => setDoor(d);
  const leave = () => setDoor(null);

  return (
    <div className="home">
      {desktop ? <DesktopHeader home /> : <MobileHomeHeader />}
      <main id="conteudo" tabIndex={-1} className="home-split" data-door={door ?? ''}>
        <Link
          to="/explorar"
          className="home-door home-peek"
          onPointerEnter={enter('peek')}
          onPointerLeave={leave}
          onPointerMove={follow}
          onFocus={enter('peek')}
          onBlur={leave}
          data-ev="cta_click"
          data-ev-cta="explorar"
          data-ev-area="home"
        >
          <span className="home-glow" aria-hidden />
          <span className="home-copy">
            <span className="home-eyebrow">{tr('Espreitar', 'Peek inside')}</span>
            <h1 className="home-title">{tr('Como é trabalhar lá dentro?', 'What’s it really like to work there?')}</h1>
            <span className="home-sub">
              {tr('Procura uma organização e vê o que dizem as pessoas que lá trabalham.', 'Find an organisation and see what the people who work there say.')}
            </span>
            <span className="home-cta home-cta-field">
              <Icon name="search" size={20} />
              <span className="grow">{tr('Empresa, associação ou cidade', 'Company, association or city')}</span>
              <Icon name="arrow" size={20} className="home-arrow" />
            </span>
          </span>
        </Link>

        <Link
          to="/avaliar"
          className="home-door home-job"
          onPointerEnter={enter('job')}
          onPointerLeave={leave}
          onPointerMove={follow}
          onFocus={enter('job')}
          onBlur={leave}
          data-ev="cta_click"
          data-ev-cta="avaliar"
          data-ev-area="home"
        >
          <span className="home-glow" aria-hidden />
          <span className="home-rule" aria-hidden />
          <HomeMark width={desktop ? 264 : 206} />
          <span className="home-copy">
            <span className="home-eyebrow">{tr('O teu trabalho', 'Your job')}</span>
            <h2 className="home-title">{tr('Conta como é. Sem dar a cara.', 'Tell it like it is. Stay anonymous.')}</h2>
            <span className="home-sub">
              {tr('Avaliação anónima em 3 minutos. A organização nunca sabe quem escreveu.', 'An anonymous review in 3 minutes. The organisation never knows who wrote it.')}
            </span>
            <span className="home-cta home-cta-solid">
              {tr('Avaliar onde trabalho', 'Review where I work')}
              <Icon name="arrow" size={20} className="home-arrow" />
            </span>
          </span>
        </Link>
      </main>
      <SiteFooter />
    </div>
  );
}

/**
 * Logo na fronteira: duas cópias sincronizadas, cortadas na linha.
 * Em cima (fundo teal): "peek" a tinta, perna do k a branco. Em baixo (fundo ink): "Job" a teal, "o" a branco.
 * A linha da fronteira desenha-se a partir do pino do "k".
 */
function HomeMark({ width }: { width: number }) {
  const label = 'PeekJob';
  const ref = useRef<HTMLSpanElement>(null);
  const [ready, setReady] = useState(false);
  useEffect(() => {
    const t = requestAnimationFrame(() => setReady(true));
    return () => cancelAnimationFrame(t);
  }, []);
  return (
    <span ref={ref} className={'home-mark' + (ready ? ' is-ready' : '')} style={{ width }} aria-hidden>
      <span className="mk mk-top">
        <LogoAnimated width={width} label={label} />
      </span>
      <span className="mk mk-bot">
        <LogoAnimated width={width} label={label} />
      </span>
    </span>
  );
}
