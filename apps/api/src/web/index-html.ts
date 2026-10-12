type Env = Record<string, string | undefined>;

const GA_ID = /^G-[A-Z0-9]{4,20}$/;
const GSC_TOKEN = /^[A-Za-z0-9_-]{10,100}$/;

/**
 * Injeta no index.html, no arranque e sem rebuild:
 * - a verificação do Google Search Console (GSC_VERIFICATION, método "etiqueta HTML");
 * - o ID do Google Analytics (GA_MEASUREMENT_ID), lido pela web em window.__PJ__.
 * Valores com formato inválido são ignorados (nada de HTML arbitrário vindo do ambiente).
 */
export function renderIndex(template: string, env: Env = process.env): string {
  const head: string[] = [];
  const gsc = env.GSC_VERIFICATION?.trim();
  if (gsc && GSC_TOKEN.test(gsc)) head.push(`<meta name="google-site-verification" content="${gsc}">`);
  const ga = env.GA_MEASUREMENT_ID?.trim();
  if (ga && GA_ID.test(ga)) head.push(`<script>window.__PJ__=${JSON.stringify({ gaId: ga })}</script>`);
  const html = head.join('');
  return template.includes('<!--pj:head-->') ? template.replace('<!--pj:head-->', html) : template.replace('</head>', `${html}</head>`);
}
