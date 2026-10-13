import { appEnv } from '../common/config';

type Env = Record<string, string | undefined>;

const GA_ID = /^G-[A-Z0-9]{4,20}$/;
const GSC_TOKEN = /^[A-Za-z0-9_-]{10,100}$/;

/** Configuração da web em tempo de execução (window.__PJ__): ID do Analytics e ambiente. Servida em /pj-config.js. */
export function configScript(env: Env = process.env): string {
  const cfg: { gaId?: string; env?: 'uat' } = {};
  const ga = env.GA_MEASUREMENT_ID?.trim();
  if (ga && GA_ID.test(ga)) cfg.gaId = ga;
  // Na UAT a web mostra a faixa "ambiente de testes"
  if (appEnv(env) === 'uat') cfg.env = 'uat';
  return `window.__PJ__=${JSON.stringify(cfg)};`;
}

/**
 * Prepara o index.html, sem rebuild:
 * - a verificação do Google Search Console (GSC_VERIFICATION, método "etiqueta HTML");
 * - o script /pj-config.js com o ID do Google Analytics (sem scripts inline, por causa da CSP).
 * Valores com formato inválido são ignorados (nada de HTML arbitrário vindo do ambiente).
 */
export function renderIndex(template: string, env: Env = process.env, lang: 'pt' | 'en' = 'pt'): string {
  const head: string[] = [];
  const gsc = env.GSC_VERIFICATION?.trim();
  if (gsc && GSC_TOKEN.test(gsc)) head.push(`<meta name="google-site-verification" content="${gsc}">`);
  // script clássico (não módulo): corre antes da aplicação
  head.push('<script src="/pj-config.js"></script>');
  const html = head.join('');
  if (lang === 'en') template = template.replace(/<html lang="[^"]*"/, '<html lang="en-GB"');
  return template.includes('<!--pj:head-->') ? template.replace('<!--pj:head-->', html) : template.replace('</head>', `${html}</head>`);
}
