/** Título e indexação por modelo de rota (Search Console e relatórios do GA com nomes legíveis) */
export interface PageMeta {
  title: string;
  description?: string;
  /** false → noindex (páginas pessoais e fluxo de avaliar) */
  index: boolean;
}

const BRAND = 'PeekJob';
const DEFAULT_DESC = 'Avaliações anónimas de quem trabalha em PME, associações, voluntariado e empresas em nome individual.';

const PAGES: Record<string, PageMeta> = {
  '/': { title: `${BRAND} · Como é trabalhar lá dentro`, description: DEFAULT_DESC, index: true },
  '/ranking': { title: `Ranking de organizações · ${BRAND}`, description: 'As organizações mais bem avaliadas por quem lá trabalha, ordenadas pelas tuas prioridades.', index: true },
  '/pesquisa': { title: `Pesquisar organizações · ${BRAND}`, description: DEFAULT_DESC, index: true },
  '/setores': { title: `Tipos e setores · ${BRAND}`, description: 'PME, associações, voluntariado e empresas em nome individual, por setor.', index: true },
  '/metodologia': { title: `Como calculamos · ${BRAND}`, description: 'Como a PeekJob calcula as notas e protege o anonimato de quem avalia.', index: true },
  '/para-organizacoes': { title: `Para organizações · ${BRAND}`, description: 'Responda às avaliações e mostre o que faz bem.', index: true },
  '/org/:id': { title: `Organização · ${BRAND}`, description: DEFAULT_DESC, index: true },
  '/org/:id/entrevistas': { title: `Entrevistas · ${BRAND}`, index: true },
  '/org/:id/salarios': { title: `Salários · ${BRAND}`, index: true },
  '/org/:id/denunciar/:reviewId': { title: `Denunciar avaliação · ${BRAND}`, index: false },
  '/preferencias': { title: `As tuas prioridades · ${BRAND}`, index: false },
  '/a-preparar': { title: `A preparar · ${BRAND}`, index: false },
  '/avaliar': { title: `Avaliar · escolher · ${BRAND}`, index: false },
  '/avaliar/verificar': { title: `Avaliar · verificar · ${BRAND}`, index: false },
  '/avaliar/notas': { title: `Avaliar · notas · ${BRAND}`, index: false },
  '/avaliar/texto': { title: `Avaliar · texto · ${BRAND}`, index: false },
  '/avaliar/feito': { title: `Avaliação publicada · ${BRAND}`, index: false },
  '/apoio': { title: `Apoio · ${BRAND}`, index: false },
  '/guardadas': { title: `Guardadas · ${BRAND}`, index: false },
  '/perfil': { title: `Perfil · ${BRAND}`, index: false },
  '/entrar': { title: `Entrar · ${BRAND}`, index: false },
  '/painel': { title: `Painel da organização · ${BRAND}`, index: false },
  '/404': { title: `Página não encontrada · ${BRAND}`, index: false },
};

export function pageMeta(template: string): PageMeta {
  return PAGES[template] ?? PAGES['/404'];
}
