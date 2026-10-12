import { useEffect } from 'react';
import { HashRouter, Route, Routes, useLocation } from 'react-router-dom';
import { StoreProvider } from './lib/store';
import Inicio from './pages/Inicio';
import Preferencias from './pages/Preferencias';
import APreparar from './pages/APreparar';
import Pesquisa from './pages/Pesquisa';
import Ranking from './pages/Ranking';
import Setores from './pages/Setores';
import Metodologia from './pages/Metodologia';
import OrgPage from './pages/OrgPage';
import Denunciar from './pages/Denunciar';
import AvaliarEscolher from './pages/AvaliarEscolher';
import AvaliarVerificar from './pages/AvaliarVerificar';
import AvaliarNotas from './pages/AvaliarNotas';
import AvaliarTexto from './pages/AvaliarTexto';
import AvaliarFeito from './pages/AvaliarFeito';
import Apoio from './pages/Apoio';
import Guardadas from './pages/Guardadas';
import Perfil from './pages/Perfil';
import Entrar from './pages/Entrar';
import ParaOrganizacoes from './pages/ParaOrganizacoes';
import Painel from './pages/Painel';
import NotFound from './pages/NotFound';

/** Volta ao topo em cada mudança de ecrã (excepto âncoras) */
function ScrollTop() {
  const { pathname } = useLocation();
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);
  return null;
}

// HashRouter: funciona em qualquer alojamento estático (link de demonstração) sem configurar o servidor.
export default function App() {
  return (
    <StoreProvider>
      <HashRouter>
        <ScrollTop />
        <Routes>
          <Route path="/" element={<Inicio />} />
          <Route path="/preferencias" element={<Preferencias />} />
          <Route path="/a-preparar" element={<APreparar />} />
          <Route path="/pesquisa" element={<Pesquisa />} />
          <Route path="/ranking" element={<Ranking />} />
          <Route path="/setores" element={<Setores />} />
          <Route path="/metodologia" element={<Metodologia />} />
          <Route path="/org/:id" element={<OrgPage tab="avaliacoes" />} />
          <Route path="/org/:id/entrevistas" element={<OrgPage tab="entrevistas" />} />
          <Route path="/org/:id/salarios" element={<OrgPage tab="salarios" />} />
          <Route path="/org/:id/denunciar/:reviewId" element={<Denunciar />} />
          <Route path="/avaliar" element={<AvaliarEscolher />} />
          <Route path="/avaliar/verificar" element={<AvaliarVerificar />} />
          <Route path="/avaliar/notas" element={<AvaliarNotas />} />
          <Route path="/avaliar/texto" element={<AvaliarTexto />} />
          <Route path="/avaliar/feito" element={<AvaliarFeito />} />
          <Route path="/apoio" element={<Apoio />} />
          <Route path="/guardadas" element={<Guardadas />} />
          <Route path="/perfil" element={<Perfil />} />
          <Route path="/entrar" element={<Entrar />} />
          <Route path="/para-organizacoes" element={<ParaOrganizacoes />} />
          <Route path="/painel" element={<Painel />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </HashRouter>
    </StoreProvider>
  );
}
