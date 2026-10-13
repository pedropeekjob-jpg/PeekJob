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

const PAGES = (): Record<string, PageMeta> => ({
  '/': { title: tr(`${BRAND} · Como é trabalhar lá dentro`, `${BRAND} · What it’s really like to work there`), description: DEFAULT_DESC(), index: true },
  '/ranking': { title: tr(`Ranking de organizações · ${BRAND}`, `Organisation ranking · ${BRAND}`), description: tr('As organizações mais bem avaliadas por quem lá trabalha, ordenadas pelas tuas prioridades.', 'The organisations rated best by the people who work there, ordered by your priorities.'), index: true },
  '/pesquisa': { title: tr(`Pesquisar organizações · ${BRAND}`, `Search organisations · ${BRAND}`), description: DEFAULT_DESC(), index: true },
  '/setores': { title: tr(`Tipos e setores · ${BRAND}`, `Types and sectors · ${BRAND}`), description: tr('PME, associações, voluntariado e empresas em nome individual, por setor.', 'Small businesses, associations, volunteering and sole traders, by sector.'), index: true },
  '/metodologia': { title: tr(`Como calculamos · ${BRAND}`, `How we score · ${BRAND}`), description: tr('Como a PeekJob calcula as notas e protege o anonimato de quem avalia.', 'How PeekJob calculates scores and protects reviewers’ anonymity.'), index: true },
  '/para-organizacoes': { title: tr(`Para organizações · ${BRAND}`, `For organisations · ${BRAND}`), description: tr('Responda às avaliações e mostre o que faz bem.', 'Reply to reviews and show what you do well.'), index: true },
  '/explorar': { title: tr(`Explorar organizações · ${BRAND}`, `Explore organisations · ${BRAND}`), description: DEFAULT_DESC(), index: true },
  '/sobre': { title: tr(`Sobre a PeekJob · ${BRAND}`, `About PeekJob · ${BRAND}`), description: tr('Porque existe a PeekJob: dar voz a quem trabalha em pequenas organizações, com anonimato, respeito e direitos humanos.', 'Why PeekJob exists: giving a voice to people who work at small organisations, with anonymity, respect and human rights.'), index: true },
  '/contacto': { title: tr(`Contacto · ${BRAND}`, `Contact · ${BRAND}`), description: tr('Fala com a equipa da PeekJob.', 'Get in touch with the PeekJob team.'), index: true },
  '/org/:id': { title: tr(`Organização · ${BRAND}`, `Organisation · ${BRAND}`), description: DEFAULT_DESC(), index: true },
  '/org/:id/entrevistas': { title: tr(`Entrevistas · ${BRAND}`, `Interviews · ${BRAND}`), index: true },
  '/org/:id/salarios': { title: tr(`Salários · ${BRAND}`, `Salaries · ${BRAND}`), index: true },
  '/org/:id/denunciar/:reviewId': { title: tr(`Denunciar avaliação · ${BRAND}`, `Report review · ${BRAND}`), index: false },
  '/preferencias': { title: tr(`As tuas prioridades · ${BRAND}`, `Your priorities · ${BRAND}`), index: false },
  '/a-preparar': { title: tr(`A preparar · ${BRAND}`, `Getting ready · ${BRAND}`), index: false },
  '/avaliar': { title: tr(`Avaliar · escolher · ${BRAND}`, `Review · choose · ${BRAND}`), index: false },
  '/avaliar/verificar': { title: tr(`Avaliar · verificar · ${BRAND}`, `Review · verify · ${BRAND}`), index: false },
  '/avaliar/notas': { title: tr(`Avaliar · notas · ${BRAND}`, `Review · scores · ${BRAND}`), index: false },
  '/avaliar/texto': { title: tr(`Avaliar · texto · ${BRAND}`, `Review · text · ${BRAND}`), index: false },
  '/avaliar/feito': { title: tr(`Avaliação publicada · ${BRAND}`, `Review published · ${BRAND}`), index: false },
  '/apoio': { title: tr(`Apoio · ${BRAND}`, `Support · ${BRAND}`), index: false },
  '/guardadas': { title: tr(`Guardadas · ${BRAND}`, `Saved · ${BRAND}`), index: false },
  '/perfil': { title: tr(`Perfil · ${BRAND}`, `Profile · ${BRAND}`), index: false },
  '/perfil/dados': { title: tr(`Os teus dados · ${BRAND}`, `Your data · ${BRAND}`), index: false },
  '/moderacao': { title: tr(`Moderação · ${BRAND}`, `Moderation · ${BRAND}`), index: false },
  '/entrar': { title: tr(`Entrar · ${BRAND}`, `Sign in · ${BRAND}`), index: false },
  '/painel': { title: tr(`Painel da organização · ${BRAND}`, `Organisation dashboard · ${BRAND}`), index: false },
  '/404': { title: tr(`Página não encontrada · ${BRAND}`, `Page not found · ${BRAND}`), index: false },
});

export function pageMeta(template: string): PageMeta {
  const p = PAGES();
  return p[template] ?? p['/404'];
}
