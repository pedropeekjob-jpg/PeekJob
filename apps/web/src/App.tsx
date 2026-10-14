import { Suspense, useEffect, useRef } from 'react';
import { BrowserRouter, HashRouter, Navigate, Route, Routes, useLocation } from 'react-router';
import { analytics, routeTemplate, setCurrentTemplate } from './analytics';
import { applyPageMeta, browserRouting } from './analytics/seo';
import { ConsentBanner } from './components/ConsentBanner';
import { EnvRibbon } from './components/EnvRibbon';
import { ErrorBoundary } from './components/ErrorBoundary';
import { SkipLink } from './components/SkipLink';
import { StoreProvider } from './lib/store';
import { LangRoot } from './i18n';
import Home from './pages/Home';
import { Pages } from './pages/lazy';
import { PageLoading } from './components/PageLoading';
import { FlowReturn } from './features/review/FlowReturn';

/**
 * Em cada mudança de ecrã: volta ao topo e põe o foco no título (o leitor de ecrã anuncia a página nova;
 * quem usa teclado continua a partir do conteúdo). Na primeira página não mexe no foco.
 */
function ScrollTop() {
  const { pathname } = useLocation();
  const first = useRef(true);
  useEffect(() => {
    window.scrollTo(0, 0);
    if (first.current) {
      first.current = false;
      return;
    }
    // espera pelo ecrã novo: dados que chegam a seguir, ou a página carregada a pedido (até ~3 s)
    let tries = 0;
    const t = setInterval(() => {
      const main = document.getElementById('conteudo');
      const loading = main?.getAttribute('aria-busy') === 'true';
      const h1 = document.querySelector<HTMLElement>('main h1');
      if ((loading || !h1) && ++tries < 50) return;
      clearInterval(t);
      const active = document.activeElement;
      // a pessoa já está a usar o ecrã novo: não lhe roubar o foco
      if (main && active && active !== main && main.contains(active)) return;
      const target = h1 ?? main;
      if (!target) return;
      if (!target.hasAttribute('tabindex')) target.setAttribute('tabindex', '-1');
      target.focus({ preventScroll: true });
    }, 60);
    return () => clearInterval(t);
  }, [pathname]);
  return null;
}

/** Em cada ecrã: título/robots/canonical (Search Console) e page_view (Analytics, se houver consentimento) */
function PageTracking() {
  const { pathname } = useLocation();
  useEffect(() => {
    setCurrentTemplate(() => routeTemplate(pathname));
    applyPageMeta(pathname);
    analytics.pageView(pathname);
  }, [pathname]);
  // Quem aceita a meio da visita: conta a página onde está
  useEffect(() => analytics.subscribe(() => analytics.pageView(pathname)), [pathname]);
  return null;
}

/** Erros de um ecrã ficam nesse ecrã: mudar de caminho volta a tentar */
function ScreenBoundary({ children }: { children: React.ReactNode }) {
  const { pathname } = useLocation();
  return <ErrorBoundary resetKey={pathname}>{children}</ErrorBoundary>;
}

/**
 * Produção (VITE_ROUTER=browser): URLs reais, indexáveis pelo Google.
 * Demo (GitHub Pages): HashRouter, funciona em qualquer alojamento estático sem configurar o servidor.
 */
const Router = browserRouting ? BrowserRouter : HashRouter;

export default function App() {
  return (
    <StoreProvider>
      <LangRoot>
      <Router>
        <SkipLink />
        <EnvRibbon />
        <ScrollTop />
        <PageTracking />
        <FlowReturn />
        <ConsentBanner />
        <ScreenBoundary>
        <Suspense fallback={<PageLoading />}>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/explorar" element={<Pages.Inicio />} />
          <Route path="/sobre" element={<Pages.Sobre />} />
          <Route path="/contacto" element={<Pages.Contacto />} />
          <Route path="/preferencias" element={<Pages.Preferencias />} />
          <Route path="/a-preparar" element={<Pages.APreparar />} />
          <Route path="/pesquisa" element={<Pages.Pesquisa />} />
          <Route path="/ranking" element={<Pages.Ranking />} />
          <Route path="/setores" element={<Pages.Setores />} />
          <Route path="/metodologia" element={<Pages.Metodologia />} />
          <Route path="/org/:id" element={<Pages.OrgPage tab="avaliacoes" />} />
          <Route path="/org/:id/entrevistas" element={<Pages.OrgPage tab="entrevistas" />} />
          <Route path="/org/:id/salarios" element={<Pages.OrgPage tab="salarios" />} />
          <Route path="/org/:id/denunciar/:reviewId" element={<Pages.Denunciar />} />
          <Route path="/avaliar" element={<Pages.AvaliarEscolher />} />
          <Route path="/avaliar/verificar" element={<Pages.AvaliarVerificar />} />
          <Route path="/avaliar/notas" element={<Pages.AvaliarNotas />} />
          {/* o comentário passou para o ecrã das notas: ligações antigas vão para lá */}
          <Route path="/avaliar/texto" element={<Navigate to="/avaliar/notas" replace />} />
          <Route path="/avaliar/feito" element={<Pages.AvaliarFeito />} />
          <Route path="/partilhar/:kind" element={<Pages.Partilhar />} />
          <Route path="/apoio" element={<Pages.Apoio />} />
          <Route path="/guardadas" element={<Pages.Guardadas />} />
          <Route path="/perfil" element={<Pages.Perfil />} />
          <Route path="/perfil/dados" element={<Pages.MeusDados />} />
          <Route path="/moderacao" element={<Pages.Moderacao />} />
          <Route path="/entrar" element={<Pages.Entrar />} />
          <Route path="/para-organizacoes" element={<Pages.ParaOrganizacoes />} />
          <Route path="/painel" element={<Pages.Painel />} />
          <Route path="*" element={<Pages.NotFound />} />
        </Routes>
        </Suspense>
        </ScreenBoundary>
      </Router>
      </LangRoot>
    </StoreProvider>
  );
}
