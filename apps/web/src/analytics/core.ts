import { pageMeta } from './pages';
import { routeTemplate, scrubParams, type Params } from './privacy';

/**
 * Google Analytics 4 com consentimento (modo básico do Consent Mode):
 * nada é carregado nem enviado antes de a pessoa aceitar. Sem publicidade nem Google Signals.
 */

export type ConsentValue = 'granted' | 'denied' | null;
export interface ConsentStore {
  get(): ConsentValue;
  set(v: 'granted' | 'denied'): void;
}

/** Catálogo de eventos: só estes nomes e parâmetros (ver docs/09-medicao.md) */
export interface EventMap {
  prefs_saved: { priorities_count: number; top_priority?: string };
  search: { context: 'pesquisa' | 'avaliar'; search_term?: string; results_count: number; type_filter?: string };
  select_org: { source: string; position?: number; org_type?: string };
  cta_click: { cta: string; area?: string };
  nav_click: { item: string; area: string };
  login_link_requested: { result: string };
  login: { method: 'magic_link'; result: string };
  review_org_created: { org_type: string; result: 'created' | 'existing' | string };
  verification: { method: 'email' | 'document'; step: 'code_sent' | 'confirmed' | 'skipped' | string };
  review_submit: { result: string; verified?: boolean; criteria_count?: number; tags_count?: number; text_length?: string; org_type?: string };
  review_rewrite: { step: 'requested' | 'accepted' | 'dismissed' | 'failed'; trigger: 'blocked' | 'tone' | 'manual'; source?: 'ai' | 'rules' };
  save_org: { saved: boolean; source?: string };
  mark_helpful: { helpful: boolean };
  web_vitals: { metric_name: string; value: number; rating: string; page_path: string };
}
export type EventName = keyof EventMap;

export interface AnalyticsOptions {
  measurementId?: string;
  consent: ConsentStore;
  dataLayer: unknown[];
  loadScript: (src: string) => void;
  clearCookies: () => void;
  origin: string;
  appVersion: string;
  appMode: 'api' | 'demo';
  lang: string;
  onBoot?: () => void;
}

export function createAnalytics(o: AnalyticsOptions) {
  const id = o.measurementId && /^G-[A-Z0-9]+$/.test(o.measurementId) ? o.measurementId : undefined;
  let booted = false;
  let lastPath: string | null = null;
  const listeners = new Set<() => void>();

  // gtag.js precisa de objetos `arguments` (não de arrays)
  // eslint-disable-next-line prefer-rest-params
  function gtag(..._args: unknown[]) { o.dataLayer.push(arguments); }

  const granted = () => !!id && o.consent.get() === 'granted';
  const emit = () => listeners.forEach((f) => f());

  function boot() {
    if (booted || !id) return;
    booted = true;
    gtag('consent', 'default', { analytics_storage: 'granted', ad_storage: 'denied', ad_user_data: 'denied', ad_personalization: 'denied' });
    gtag('js', new Date());
    gtag('config', id, { send_page_view: false, allow_google_signals: false, allow_ad_personalization_signals: false });
    gtag('set', 'user_properties', { app_version: o.appVersion, app_mode: o.appMode, ui_lang: o.lang });
    o.loadScript(`https://www.googletagmanager.com/gtag/js?id=${id}`);
    o.onBoot?.();
  }

  if (granted()) boot();

  const api = {
    enabled: () => granted(),
    needsConsent: () => !!id && o.consent.get() === null,
    consent: () => o.consent.get(),
    configured: () => !!id,
    subscribe(fn: () => void) {
      listeners.add(fn);
      return () => void listeners.delete(fn);
    },
    grant() {
      o.consent.set('granted');
      boot();
      if (booted) gtag('consent', 'update', { analytics_storage: 'granted' });
      emit();
    },
    deny() {
      o.consent.set('denied');
      emit();
    },
    revoke() {
      if (booted) gtag('consent', 'update', { analytics_storage: 'denied' });
      o.consent.set('denied');
      o.clearCookies();
      lastPath = null;
      emit();
    },
    track<K extends EventName>(name: K, params: EventMap[K]) {
      if (!granted()) return;
      gtag('event', name, scrubParams(params as unknown as Params));
    },
    setUserProperty(key: string, value: string) {
      if (granted()) gtag('set', 'user_properties', { [key]: value });
    },
    /** page_view com o modelo da rota (sem ids, parâmetros nem tokens) */
    pageView(pathname: string) {
      if (!granted()) return;
      // Evita duplicados (StrictMode); duas organizações seguidas contam como duas páginas.
      if (pathname === lastPath) return;
      lastPath = pathname;
      const template = routeTemplate(pathname);
      gtag('event', 'page_view', { page_path: template, page_location: `${o.origin}${template}`, page_title: pageMeta(template).title });
    },
  };
  return api;
}

export type Analytics = ReturnType<typeof createAnalytics>;
