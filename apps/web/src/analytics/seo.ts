import { apiMode } from '../api/http';
import { pageMeta } from './pages';
import { routeTemplate } from './privacy';

/** URLs reais (sem #) só em produção; a demo (GitHub Pages) usa # e não é indexada. */
export const browserRouting = import.meta.env.VITE_ROUTER === 'browser';

function meta(name: string): HTMLMetaElement {
  let el = document.head.querySelector<HTMLMetaElement>(`meta[name="${name}"]`);
  if (!el) {
    el = document.createElement('meta');
    el.name = name;
    document.head.appendChild(el);
  }
  return el;
}

function canonical(href: string | null) {
  let el = document.head.querySelector<HTMLLinkElement>('link[rel="canonical"]');
  if (!href) return el?.remove();
  if (!el) {
    el = document.createElement('link');
    el.rel = 'canonical';
    document.head.appendChild(el);
  }
  el.href = href;
}

/** Título, descrição, robots e canonical da página atual */
export function applyPageMeta(pathname: string, override?: { title?: string; description?: string }) {
  const m = pageMeta(routeTemplate(pathname));
  document.title = override?.title ?? m.title;
  const desc = override?.description ?? m.description;
  if (desc) meta('description').content = desc;
  const indexable = m.index && apiMode && browserRouting;
  meta('robots').content = indexable ? 'index,follow' : 'noindex,nofollow';
  canonical(indexable ? `${location.origin}${pathname.replace(/\/+$/, '') || '/'}` : null);
}

/** Dados estruturados (EmployerAggregateRating) para a página de uma organização com avaliações */
export function setOrgStructuredData(org: { name: string; score: number; reviewsCount: number } | null) {
  const id = 'pj-jsonld';
  document.getElementById(id)?.remove();
  if (!org || !org.reviewsCount || !apiMode || !browserRouting) return;
  const s = document.createElement('script');
  s.type = 'application/ld+json';
  s.id = id;
  s.text = JSON.stringify({
    '@context': 'https://schema.org',
    '@type': 'EmployerAggregateRating',
    itemReviewed: { '@type': 'Organization', name: org.name },
    ratingValue: org.score,
    ratingCount: org.reviewsCount,
    bestRating: 5,
    worstRating: 1,
  });
  document.head.appendChild(s);
}
