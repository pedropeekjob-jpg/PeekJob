import { tr } from '../i18n';

/** Título e indexação por modelo de rota (Search Console e relatórios do GA com nomes legíveis) */
export interface PageMeta {
  title: string;
  description?: string;
  /** false → noindex (páginas pessoais e fluxo de avaliar) */
  index: boolean;
}

const BRAND = 'PeekJob';
const DEFAULT_DESC = () => tr('Avaliações anónimas de quem trabalha em PME, associações, voluntariado e empresas em nome individual.', 'Anonymous reviews from people who work at small businesses, associations, volunteer groups and sole traders.');

/** Títulos curtos (21/10): o termo que se pesquisa primeiro ("avaliações de empresas"), a marca no fim */
const PAGES = (): Record<string, PageMeta> => ({
  '/': { title: tr(`Avaliações anónimas de empresas · ${BRAND}`, `Anonymous company reviews · ${BRAND}`), description: DEFAULT_DESC(), index: true },
  '/ranking': { title: tr(`Ranking de empresas · ${BRAND}`, `Company ranking · ${BRAND}`), description: tr('As organizações mais bem avaliadas por quem lá trabalha, ordenadas pelas tuas prioridades.', 'The organisations rated best by the people who work there, ordered by your priorities.'), index: true },
  '/pesquisa': { title: tr(`Pesquisar empresas · ${BRAND}`, `Search companies · ${BRAND}`), description: DEFAULT_DESC(), index: true },
  '/setores': { title: tr(`Empresas por setor · ${BRAND}`, `Companies by sector · ${BRAND}`), description: tr('PME, associações, voluntariado e empresas em nome individual, por setor.', 'Small businesses, associations, volunteering and sole traders, by sector.'), index: true },
  '/metodologia': { title: tr(`Como calculamos · ${BRAND}`, `How we score · ${BRAND}`), description: tr('Como a PeekJob calcula as notas e protege o anonimato de quem avalia.', 'How PeekJob calculates scores and protects reviewers’ anonymity.'), index: true },
  '/para-organizacoes': { title: tr(`Para empresas · ${BRAND}`, `For employers · ${BRAND}`), description: tr('Responda às avaliações e mostre o que faz bem.', 'Reply to reviews and show what you do well.'), index: true },
  '/explorar': { title: tr(`Empresas e associações · ${BRAND}`, `Companies and associations · ${BRAND}`), description: DEFAULT_DESC(), index: true },
  '/sobre': { title: tr(`Sobre · ${BRAND}`, `About · ${BRAND}`), description: tr('Porque existe a PeekJob: dar voz a quem trabalha em pequenas organizações, com anonimato, respeito e direitos humanos.', 'Why PeekJob exists: giving a voice to people who work at small organisations, with anonymity, respect and human rights.'), index: true },
  '/contacto': { title: tr(`Contacto · ${BRAND}`, `Contact · ${BRAND}`), description: tr('Fala com a equipa da PeekJob.', 'Get in touch with the PeekJob team.'), index: true },
  '/org/:id': { title: tr(`Organização · ${BRAND}`, `Organisation · ${BRAND}`), description: DEFAULT_DESC(), index: true },
  '/org/:id/entrevistas': { title: tr(`Entrevistas · ${BRAND}`, `Interviews · ${BRAND}`), index: true },
  '/org/:id/salarios': { title: tr(`Salários · ${BRAND}`, `Salaries · ${BRAND}`), index: true },
  '/org/:id/denunciar/:reviewId': { title: tr(`Denunciar avaliação · ${BRAND}`, `Report review · ${BRAND}`), index: false },
  '/preferencias': { title: tr(`As tuas prioridades · ${BRAND}`, `Your priorities · ${BRAND}`), index: false },
  '/a-preparar': { title: tr(`A preparar · ${BRAND}`, `Getting ready · ${BRAND}`), index: false },
  '/avaliar': { title: tr(`Avaliar · ${BRAND}`, `Review · ${BRAND}`), index: false },
  '/avaliar/verificar': { title: tr(`Verificar · ${BRAND}`, `Verify · ${BRAND}`), index: false },
  '/avaliar/notas': { title: tr(`Notas · ${BRAND}`, `Scores · ${BRAND}`), index: false },
  '/avaliar/texto': { title: tr(`Avaliar · texto · ${BRAND}`, `Review · text · ${BRAND}`), index: false },
  '/avaliar/feito': { title: tr(`Publicada · ${BRAND}`, `Published · ${BRAND}`), index: false },
  '/apoio': { title: tr(`Apoio · ${BRAND}`, `Support · ${BRAND}`), index: false },
  '/guardadas': { title: tr(`Guardadas · ${BRAND}`, `Saved · ${BRAND}`), index: false },
  '/perfil': { title: tr(`Perfil · ${BRAND}`, `Profile · ${BRAND}`), index: false },
  '/perfil/dados': { title: tr(`Os teus dados · ${BRAND}`, `Your data · ${BRAND}`), index: false },
  '/moderacao': { title: tr(`Moderação · ${BRAND}`, `Moderation · ${BRAND}`), index: false },
  '/entrar': { title: tr(`Entrar · ${BRAND}`, `Sign in · ${BRAND}`), index: false },
  '/painel': { title: tr(`Painel · ${BRAND}`, `Dashboard · ${BRAND}`), index: false },
  '/404': { title: tr(`Página não encontrada · ${BRAND}`, `Page not found · ${BRAND}`), index: false },
});

export function pageMeta(template: string): PageMeta {
  const p = PAGES();
  return p[template] ?? p['/404'];
}
