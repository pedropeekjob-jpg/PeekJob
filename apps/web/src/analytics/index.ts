import { useSyncExternalStore } from 'react';
import { apiMode } from '../api/http';
import { getLang, subscribeLang } from '../i18n';
import { createAnalytics, type ConsentStore, type ConsentValue } from './core';

export type { EventMap, EventName } from './core';
export { cleanSearchTerm, routeTemplate, textLengthBucket } from './privacy';

/**
 * Configuração em tempo de execução: a API injeta window.__PJ__ no index.html (GA_MEASUREMENT_ID).
 * Em desenvolvimento/demo pode vir de VITE_GA_ID.
 */
declare global {
  interface Window {
    __PJ__?: { gaId?: string; env?: 'uat' };
    dataLayer?: unknown[];
  }
}

const KEY = 'peekjob-consent-analytics';
const consent: ConsentStore = {
  get: () => {
    try {
      const v = localStorage.getItem(KEY);
      return v === 'granted' || v === 'denied' ? v : null;
    } catch {
      return null;
    }
  },
  set: (v) => {
    try {
      localStorage.setItem(KEY, v);
    } catch {
      /* sem storage: vale só nesta visita */
    }
  },
};

function clearGaCookies() {
  const host = location.hostname;
  const domains = ['', host, `.${host}`, `.${host.split('.').slice(-2).join('.')}`];
  for (const c of document.cookie.split(';')) {
    const name = c.split('=')[0].trim();
    if (!name.startsWith('_ga')) continue;
    for (const d of domains) document.cookie = `${name}=; Max-Age=0; path=/${d ? `; domain=${d}` : ''}`;
  }
}

function loadScript(src: string) {
  const s = document.createElement('script');
  s.async = true;
  s.src = src;
  document.head.appendChild(s);
}

/** Core Web Vitals (LCP, INP, CLS) por modelo de rota: base para decidir onde refatorar */
async function startWebVitals() {
  const { onCLS, onINP, onLCP } = await import('web-vitals');
  const send = (m: { name: string; value: number; rating: string }) =>
    analytics.track('web_vitals', {
      metric_name: m.name,
      value: Math.round(m.name === 'CLS' ? m.value * 1000 : m.value),
      rating: m.rating,
      page_path: routeTemplateNow(),
    });
  onCLS(send);
  onINP(send);
  onLCP(send);
}

let routeTemplateNow = () => '/';
export function setCurrentTemplate(fn: () => string) {
  routeTemplateNow = fn;
}

window.dataLayer = window.dataLayer || [];

export const analytics = createAnalytics({
  measurementId: window.__PJ__?.gaId ?? (import.meta.env.VITE_GA_ID as string | undefined),
  consent,
  dataLayer: window.dataLayer,
  loadScript,
  clearCookies: clearGaCookies,
  origin: location.origin,
  appVersion: (import.meta.env.VITE_APP_VERSION as string | undefined) ?? 'dev',
  appMode: apiMode ? 'api' : 'demo',
  lang: getLang(),
  onBoot: () => void startWebVitals().catch(() => undefined),
});

export const track = analytics.track;

// Idioma da interface como propriedade do utilizador (comparar PT e EN nos relatórios)
subscribeLang(() => analytics.setUserProperty('ui_lang', getLang()));

/** Estado do consentimento para os componentes (banner, Perfil) */
export function useAnalyticsConsent(): { configured: boolean; value: ConsentValue } {
  const value = useSyncExternalStore(analytics.subscribe, analytics.consent, analytics.consent);
  return { configured: analytics.configured(), value };
}

/**
 * Cliques em elementos marcados no HTML, sem código por componente:
 *   <a data-ev="select_org" data-ev-source="ranking" data-ev-position="3">
 * Permite medir CTAs e navegação para decisões de layout e de marca.
 */
export function installClickTracking() {
  document.addEventListener(
    'click',
    (e) => {
      const el = (e.target as Element | null)?.closest?.('[data-ev]') as HTMLElement | null;
      if (!el) return;
      const name = el.dataset.ev as Parameters<typeof track>[0];
      const params: Record<string, string | number> = {};
      for (const [k, v] of Object.entries(el.dataset)) {
        if (!k.startsWith('ev') || k === 'ev' || v === undefined) continue;
        const key = k.slice(2).replace(/^./, (c) => c.toLowerCase()).replace(/[A-Z]/g, (c) => `_${c.toLowerCase()}`);
        params[key] = /^\d+$/.test(v) ? Number(v) : v;
      }
      // Origem do clique = página onde está (ex.: select_org a partir de /ranking)
      if (params.source === undefined && (name === 'select_org' || name === 'cta_click')) params.source = routeTemplateNow();
      track(name, params as never);
    },
    { capture: true },
  );
}
