/**
 * Rotas da web (URLs reais, sem #). Partilhadas entre a web (medição, metadados)
 * e a API (que serve a web e responde 404 a caminhos que não existem).
 */
export const STATIC_WEB_ROUTES = [
  '/', '/explorar', '/sobre', '/contacto', '/preferencias', '/a-preparar', '/pesquisa', '/ranking', '/setores', '/metodologia',
  '/avaliar', '/avaliar/verificar', '/avaliar/notas', '/avaliar/texto', '/avaliar/feito',
  '/apoio', '/guardadas', '/perfil', '/perfil/dados', '/entrar', '/para-organizacoes', '/painel',
] as const;

const STATIC = new Set<string>(STATIC_WEB_ROUTES);

/** Caminho real → modelo da rota (ex.: /org/3f2a/salarios → /org/:id/salarios); '/404' se não existir */
export function routeTemplate(pathname: string): string {
  const p = pathname.split(/[?#]/)[0].replace(/\/+$/, '') || '/';
  if (STATIC.has(p)) return p;
  const org = p.match(/^\/org\/[^/]+(\/(entrevistas|salarios)|\/denunciar\/[^/]+)?$/);
  if (org) {
    if (!org[1]) return '/org/:id';
    return org[1].startsWith('/denunciar') ? '/org/:id/denunciar/:reviewId' : `/org/:id${org[1]}`;
  }
  return '/404';
}

/** Páginas que não devem ser rastreadas pelos motores de pesquisa (pessoais ou do fluxo de avaliar) */
export const PRIVATE_WEB_PREFIXES = ['/avaliar', '/perfil', '/apoio', '/guardadas', '/entrar', '/painel', '/preferencias', '/a-preparar'] as const;

/** Páginas públicas fixas para o sitemap */
export const SITEMAP_STATIC = ['/', '/explorar', '/ranking', '/sobre', '/contacto', '/setores', '/metodologia', '/para-organizacoes'] as const;
