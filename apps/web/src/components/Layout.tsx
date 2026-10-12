import type { ReactNode } from 'react';
import { Link, NavLink, useLocation } from 'react-router-dom';
import { useStore } from '../lib/store';
import { useIsDesktop } from '../lib/useMedia';
import { Logo } from './Brand';
import { Icon } from './Icon';

export function DesktopHeader() {
  const { messages } = useStore();
  const unread = messages.filter((m) => !m.read).length;
  return (
    <header className="container row" style={{ gap: 28, paddingTop: 20, paddingBottom: 20 }}>
      <Link to="/" aria-label="PeekJob, início">
        <Logo height={52} />
      </Link>
      <nav aria-label="Principal" className="row wrap grow" style={{ gap: 24 }}>
        <NavLink className="navl" to="/ranking">Ranking</NavLink>
        <NavLink className="navl" to="/setores">Tipos e setores</NavLink>
        <NavLink className="navl" to="/metodologia">Como calculamos</NavLink>
        <NavLink className="navl" to="/para-organizacoes">Para organizações</NavLink>
      </nav>
      <NavLink to="/guardadas" className={({ isActive }) => 'icon-btn' + (isActive ? ' on' : '')} aria-label="Guardadas">
        <Icon name="bookmark" size={18} />
      </NavLink>
      <NavLink to="/perfil" className={({ isActive }) => 'icon-btn' + (isActive ? ' on' : '')} aria-label={unread ? `Perfil, ${unread} mensagem nova` : 'Perfil'}>
        <Icon name="user" size={18} />
        {unread > 0 && <span className="badge">{unread}</span>}
      </NavLink>
      <Link to="/avaliar" className="btn btn-primary" style={{ height: 46, borderRadius: 14 }}>
        Avaliar onde trabalho
      </Link>
    </header>
  );
}

export function DesktopFooter() {
  return (
    <footer style={{ borderTop: '1px solid var(--line)', marginTop: 40 }}>
      <div className="container row wrap between" style={{ gap: 24, paddingTop: 32, paddingBottom: 40 }}>
        <div className="row" style={{ gap: 16 }}>
          <Logo height={40} />
          <span className="small muted">Avaliações anónimas de quem trabalha em pequenas organizações.</span>
        </div>
        <nav aria-label="Rodapé" className="row wrap" style={{ gap: 20 }}>
          <Link className="navl small" to="/setores">Tipos e setores</Link>
          <Link className="navl small" to="/metodologia">Como calculamos</Link>
          <Link className="navl small" to="/metodologia#privacidade">Privacidade</Link>
          <Link className="navl small" to="/para-organizacoes">Para organizações</Link>
          <Link className="navl small" to="/entrar">Entrar</Link>
        </nav>
      </div>
    </footer>
  );
}

export function BottomNav() {
  const { pathname } = useLocation();
  const { messages } = useStore();
  const unread = messages.filter((m) => !m.read).length;
  const cur = (p: string) => (p === '/' ? pathname === '/' : pathname.startsWith(p)) ? 'page' : undefined;
  return (
    <nav aria-label="Navegação principal" className="bottom-nav">
      <Link to="/" aria-current={cur('/')}>
        <Icon name="home" size={22} />
        Início
      </Link>
      <Link to="/ranking" aria-current={cur('/ranking')}>
        <Icon name="ranking" size={22} />
        Ranking
      </Link>
      <Link to="/avaliar" className="fab" aria-label="Avaliar onde trabalho">
        <Icon name="plus" size={24} stroke={2.2} />
      </Link>
      <Link to="/guardadas" aria-current={cur('/guardadas')}>
        <Icon name="bookmark" size={22} />
        Guardadas
      </Link>
      <Link to="/perfil" aria-current={cur('/perfil')}>
        <Icon name="user" size={22} />
        Perfil
        {unread > 0 && <span className="badge" style={{ right: 8 }}>{unread}</span>}
      </Link>
    </nav>
  );
}

/**
 * Estrutura comum:
 * - desktop: cabeçalho + conteúdo + rodapé (chrome='none' para ecrãs a ecrã inteiro)
 * - mobile: conteúdo + barra inferior nas páginas principais (nav)
 */
export function Shell({ children, nav = false, chrome = 'full' }: { children: ReactNode; nav?: boolean; chrome?: 'full' | 'header' | 'none' }) {
  const desktop = useIsDesktop();
  if (desktop) {
    return (
      <>
        {chrome !== 'none' && <DesktopHeader />}
        <main>{children}</main>
        {chrome === 'full' && <DesktopFooter />}
      </>
    );
  }
  return (
    <>
      <main>{children}</main>
      {nav && <BottomNav />}
    </>
  );
}
