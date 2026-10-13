import type { ReactNode } from 'react';
import { Link, NavLink, useLocation } from 'react-router-dom';
import { analytics } from '../analytics';
import { SOCIAL } from '../config';
import { LangSwitch, tr } from '../i18n';
import { useStore } from '../lib/store';
import { useIsDesktop } from '../lib/useMedia';
import { Logo } from './Brand';
import { openConsent } from './ConsentBanner';
import { Icon } from './Icon';

const nav = (area: string, item: string) => ({ 'data-ev': 'nav_click', 'data-ev-area': area, 'data-ev-item': item });

/** Navegação principal pedida pelo cliente: Sobre, Ranking, Contacto */
function MainLinks({ area }: { area: string }) {
  return (
    <>
      <NavLink className="caps-link" to="/sobre" {...nav(area, 'sobre')}>{tr('Sobre', 'About')}</NavLink>
      <NavLink className="caps-link" to="/ranking" {...nav(area, 'ranking')}>Ranking</NavLink>
      <NavLink className="caps-link" to="/contacto" {...nav(area, 'contacto')}>{tr('Contacto', 'Contact')}</NavLink>
    </>
  );
}

function ProfileButton({ area }: { area: string }) {
  const { messages } = useStore();
  const unread = messages.filter((m) => !m.read).length;
  return (
    <NavLink
      to="/perfil"
      {...nav(area, 'perfil')}
      className={({ isActive }) => 'icon-btn' + (isActive ? ' on' : '')}
      aria-label={unread ? tr(`Perfil, ${unread} mensagem nova`, `Profile, ${unread} new message`) : tr('Perfil', 'Profile')}
    >
      <Icon name="user" size={18} />
      {unread > 0 && <span className="badge">{unread}</span>}
    </NavLink>
  );
}

export function DesktopHeader({ home = false }: { home?: boolean }) {
  return (
    <header className={'site-header' + (home ? ' is-home' : '')}>
      <div className="container row" style={{ gap: 28 }}>
        <Link to="/" aria-label={tr('PeekJob, início', 'PeekJob, home')} {...nav('header', 'logo')}>
          <Logo height={46} />
        </Link>
        <nav aria-label={tr('Principal', 'Main')} className="row grow" style={{ gap: 30, justifyContent: 'flex-end' }}>
          <MainLinks area="header" />
        </nav>
        <span className="row" style={{ gap: 10 }}>
          <LangSwitch />
          {!home && (
            <NavLink to="/pesquisa" {...nav('header', 'pesquisa')} className={({ isActive }) => 'icon-btn' + (isActive ? ' on' : '')} aria-label={tr('Pesquisar', 'Search')}>
              <Icon name="search" size={18} />
            </NavLink>
          )}
          {!home && (
            <NavLink to="/guardadas" {...nav('header', 'guardadas')} className={({ isActive }) => 'icon-btn' + (isActive ? ' on' : '')} aria-label={tr('Guardadas', 'Saved')}>
              <Icon name="bookmark" size={18} />
            </NavLink>
          )}
          <ProfileButton area="header" />
        </span>
        {!home && (
          <Link to="/avaliar" data-ev="cta_click" data-ev-cta="avaliar" data-ev-area="header" className="btn btn-primary" style={{ height: 46, borderRadius: 14 }}>
            {tr('Avaliar onde trabalho', 'Review where I work')}
          </Link>
        )}
      </div>
    </header>
  );
}

/** Cabeçalho da página inicial em mobile (esboço do cliente: logo à esquerda, três ligações à direita) */
export function MobileHomeHeader() {
  return (
    <header className="site-header is-home">
      <div className="page-x row between" style={{ gap: 12 }}>
        <Link to="/" aria-label={tr('PeekJob, início', 'PeekJob, home')} {...nav('header', 'logo')}>
          <Logo height={34} />
        </Link>
        <nav aria-label={tr('Principal', 'Main')} className="row" style={{ gap: 14 }}>
          <MainLinks area="header" />
        </nav>
        <ProfileButton area="header" />
      </div>
    </header>
  );
}

function SocialLinks() {
  return (
    <div className="row social" style={{ gap: 28, justifyContent: 'center' }}>
      <a href={SOCIAL.facebook} target="_blank" rel="noopener noreferrer" {...nav('footer', 'facebook')}>
        <Icon name="facebook" size={22} />
        <span>Facebook</span>
      </a>
      <a href={SOCIAL.instagram} target="_blank" rel="noopener noreferrer" {...nav('footer', 'instagram')}>
        <Icon name="instagram" size={22} />
        <span>Instagram</span>
      </a>
    </div>
  );
}

function FooterLinks() {
  return (
    <nav aria-label={tr('Rodapé', 'Footer')} className="row wrap footer-links">
      <Link to="/setores" {...nav('footer', 'setores')}>{tr('Tipos e setores', 'Types and sectors')}</Link>
      <Link to="/metodologia" {...nav('footer', 'metodologia')}>{tr('Como calculamos', 'How we score')}</Link>
      <Link to="/para-organizacoes" {...nav('footer', 'para-organizacoes')}>{tr('Para organizações', 'For organisations')}</Link>
      <Link to="/metodologia#privacidade" {...nav('footer', 'privacidade')}>{tr('Privacidade', 'Privacy')}</Link>
      {analytics.configured() && (
        <button type="button" onClick={openConsent}>
          {tr('Estatísticas', 'Analytics')}
        </button>
      )}
    </nav>
  );
}

/** Rodapé: redes sociais ao centro (esboço do cliente), ligações secundárias e idioma */
export function SiteFooter({ compact = false }: { compact?: boolean }) {
  return (
    <footer className={'site-footer' + (compact ? ' is-compact' : '')}>
      <div className="container stack" style={{ gap: 18, alignItems: 'center' }}>
        <SocialLinks />
        <FooterLinks />
        <div className="row wrap" style={{ gap: 14, justifyContent: 'center', alignItems: 'center' }}>
          <LangSwitch />
          <span className="small muted">{tr('Avaliações anónimas de quem trabalha em pequenas organizações.', 'Anonymous reviews from people who work at small organisations.')}</span>
        </div>
        <a className="small muted osm-credit" href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener noreferrer">
          {tr('Dados de organizações: © contribuidores do OpenStreetMap (ODbL)', 'Organisation data: © OpenStreetMap contributors (ODbL)')}
        </a>
      </div>
    </footer>
  );
}

export function BottomNav() {
  const { pathname } = useLocation();
  const { messages } = useStore();
  const unread = messages.filter((m) => !m.read).length;
  const cur = (p: string) => (pathname.startsWith(p) ? 'page' : undefined);
  return (
    <nav aria-label={tr('Navegação principal', 'Main navigation')} className="bottom-nav">
      <Link to="/explorar" aria-current={cur('/explorar')} {...nav('tabbar', 'explorar')}>
        <Icon name="search" size={22} />
        {tr('Explorar', 'Explore')}
      </Link>
      <Link to="/ranking" aria-current={cur('/ranking')} {...nav('tabbar', 'ranking')}>
        <Icon name="ranking" size={22} />
        Ranking
      </Link>
      <Link to="/avaliar" data-ev="cta_click" data-ev-cta="avaliar" data-ev-area="tabbar" className="fab" aria-label={tr('Avaliar onde trabalho', 'Review where I work')}>
        <Icon name="plus" size={24} stroke={2.2} />
      </Link>
      <Link to="/guardadas" aria-current={cur('/guardadas')} {...nav('tabbar', 'guardadas')}>
        <Icon name="bookmark" size={22} />
        {tr('Guardadas', 'Saved')}
      </Link>
      <Link to="/perfil" aria-current={cur('/perfil')} {...nav('tabbar', 'perfil')}>
        <Icon name="user" size={22} />
        {tr('Perfil', 'Profile')}
        {unread > 0 && <span className="badge" style={{ right: 8 }}>{unread}</span>}
      </Link>
    </nav>
  );
}

/**
 * Estrutura comum:
 * - desktop: cabeçalho + conteúdo + rodapé (chrome='none' para ecrãs a ecrã inteiro)
 * - mobile: conteúdo + barra inferior nas páginas principais (nav); footer=true mostra o rodapé
 */
export function Shell({ children, nav: withNav = false, chrome = 'full', footer = false }: { children: ReactNode; nav?: boolean; chrome?: 'full' | 'header' | 'none'; footer?: boolean }) {
  const desktop = useIsDesktop();
  if (desktop) {
    return (
      <>
        {chrome !== 'none' && <DesktopHeader />}
        <main>{children}</main>
        {chrome === 'full' && <SiteFooter />}
      </>
    );
  }
  return (
    <>
      <main>{children}</main>
      {footer && <SiteFooter compact />}
      {withNav && <BottomNav />}
    </>
  );
}
