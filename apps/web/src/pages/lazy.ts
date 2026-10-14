import { lazyPage } from '../lib/lazyPage';

/**
 * Páginas carregadas a pedido (cada uma num ficheiro próprio). A página inicial fica no ficheiro principal:
 * é a primeira que quase toda a gente vê.
 */
export const Pages = {
  Inicio: lazyPage(() => import('./Inicio')),
  Sobre: lazyPage(() => import('./Sobre')),
  Contacto: lazyPage(() => import('./Contacto')),
  Preferencias: lazyPage(() => import('./Preferencias')),
  APreparar: lazyPage(() => import('./APreparar')),
  Pesquisa: lazyPage(() => import('./Pesquisa')),
  Ranking: lazyPage(() => import('./Ranking')),
  Setores: lazyPage(() => import('./Setores')),
  Metodologia: lazyPage(() => import('./Metodologia')),
  OrgPage: lazyPage(() => import('./OrgPage')),
  Denunciar: lazyPage(() => import('./Denunciar')),
  AvaliarEscolher: lazyPage(() => import('./AvaliarEscolher')),
  AvaliarVerificar: lazyPage(() => import('./AvaliarVerificar')),
  AvaliarNotas: lazyPage(() => import('./AvaliarNotas')),
  AvaliarFeito: lazyPage(() => import('./AvaliarFeito')),
  Apoio: lazyPage(() => import('./Apoio')),
  Guardadas: lazyPage(() => import('./Guardadas')),
  Perfil: lazyPage(() => import('./Perfil')),
  MeusDados: lazyPage(() => import('./MeusDados')),
  Moderacao: lazyPage(() => import('./Moderacao')),
  Entrar: lazyPage(() => import('./Entrar')),
  ParaOrganizacoes: lazyPage(() => import('./ParaOrganizacoes')),
  Painel: lazyPage(() => import('./Painel')),
  Partilhar: lazyPage(() => import('./Partilhar')),
  NotFound: lazyPage(() => import('./NotFound')),
};

/** Pré-carrega as páginas a seguir a uma intenção clara (sem efeito se já estiverem carregadas) */
export function preload(...names: (keyof typeof Pages)[]) {
  for (const n of names) void Pages[n].preload().catch(() => undefined);
}
