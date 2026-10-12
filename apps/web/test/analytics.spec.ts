import { describe, expect, it, vi } from 'vitest';
import { createAnalytics, type ConsentStore } from '../src/analytics/core';
import { cleanSearchTerm, routeTemplate, scrubParams, textLengthBucket } from '../src/analytics/privacy';
import { pageMeta } from '../src/analytics/pages';

describe('Rotas → modelos (nunca ids nem parâmetros no Google)', () => {
  it.each([
    ['/', '/'],
    ['/ranking/', '/ranking'],
    ['/org/3f2a-9c', '/org/:id'],
    ['/org/3f2a-9c/salarios', '/org/:id/salarios'],
    ['/org/3f2a-9c/entrevistas', '/org/:id/entrevistas'],
    ['/org/3f2a-9c/denunciar/r1', '/org/:id/denunciar/:reviewId'],
    ['/avaliar/notas', '/avaliar/notas'],
    ['/entrar', '/entrar'],
    ['/qualquer-coisa', '/404'],
  ])('%s → %s', (path, tpl) => expect(routeTemplate(path)).toBe(tpl));
});

describe('Metadados das páginas', () => {
  it('páginas públicas são indexáveis e têm título próprio', () => {
    expect(pageMeta('/ranking')).toMatchObject({ index: true });
    expect(pageMeta('/ranking').title).toMatch(/Ranking/);
  });
  it('páginas pessoais e o fluxo de avaliar não são indexados', () => {
    for (const t of ['/avaliar', '/avaliar/notas', '/perfil', '/apoio', '/guardadas', '/entrar', '/painel', '/org/:id/denunciar/:reviewId'])
      expect(pageMeta(t).index).toBe(false);
  });
});

describe('Limpeza de dados pessoais', () => {
  it('remove campos proibidos', () => {
    const out = scrubParams({ email: 'a@b.pt', token: 'x', nif: '501234567', text: 'olá', org_id: '1', org_name: 'X', name: 'Ana', ok: 'sim' });
    expect(out).toEqual({ ok: 'sim' });
  });
  it('remove valores com aspeto de email, NIF ou token', () => {
    const out = scrubParams({ a: 'ana@gmail.com', b: 'NIF 501234567', c: 'Zx9'.repeat(12), d: 'pesquisa', n: 3, v: true });
    expect(out).toEqual({ d: 'pesquisa', n: 3, v: true });
  });
  it('termos de pesquisa: minúsculas, curtos, sem emails nem números longos', () => {
    expect(cleanSearchTerm('  Padaria da RIBEIRA ')).toBe('padaria da ribeira');
    expect(cleanSearchTerm('ana@empresa.pt')).toBeUndefined();
    expect(cleanSearchTerm('501234567')).toBeUndefined();
    expect(cleanSearchTerm('a')).toBeUndefined();
    expect(cleanSearchTerm('x'.repeat(80))).toHaveLength(50);
  });
  it('tamanho do texto vai por escalões (nunca o texto)', () => {
    expect(textLengthBucket(0)).toBe('0');
    expect(textLengthBucket(42)).toBe('1-99');
    expect(textLengthBucket(150)).toBe('100-299');
    expect(textLengthBucket(600)).toBe('300+');
  });
});

function setup(opts: { id?: string; stored?: 'granted' | 'denied' | null } = {}) {
  let value: string | null = opts.stored ?? null;
  const consent: ConsentStore = { get: () => value as never, set: (v) => (value = v) };
  const dataLayer: unknown[] = [];
  const loadScript = vi.fn();
  const clearCookies = vi.fn();
  const a = createAnalytics({ measurementId: opts.id, consent, dataLayer, loadScript, clearCookies, origin: 'https://peekjob.pt', appVersion: 'abc123', appMode: 'api' });
  const calls = () => dataLayer.map((x) => Array.from(x as ArrayLike<unknown>));
  const events = () => calls().filter((c) => c[0] === 'event');
  return { a, calls, events, loadScript, clearCookies, stored: () => value };
}

describe('Consentimento e envio', () => {
  it('sem ID configurado não faz nada nem pede consentimento', () => {
    const s = setup();
    expect(s.a.needsConsent()).toBe(false);
    s.a.track('search', { results_count: 1 });
    expect(s.calls()).toHaveLength(0);
  });

  it('com ID e sem resposta: pede consentimento e não carrega nada', () => {
    const s = setup({ id: 'G-TEST1' });
    expect(s.a.needsConsent()).toBe(true);
    s.a.track('search', { results_count: 1 });
    s.a.pageView('/org/123');
    expect(s.loadScript).not.toHaveBeenCalled();
    expect(s.calls()).toHaveLength(0);
  });

  it('ao aceitar: carrega o gtag uma vez, sem sinais de publicidade, e mede', () => {
    const s = setup({ id: 'G-TEST1' });
    s.a.grant();
    s.a.grant();
    expect(s.stored()).toBe('granted');
    expect(s.loadScript).toHaveBeenCalledTimes(1);
    expect(s.loadScript.mock.calls[0][0]).toContain('id=G-TEST1');
    const config = s.calls().find((c) => c[0] === 'config')!;
    expect(config[1]).toBe('G-TEST1');
    expect(config[2]).toMatchObject({ send_page_view: false, allow_google_signals: false, allow_ad_personalization_signals: false });
    const consent = s.calls().find((c) => c[0] === 'consent' && c[1] === 'default')!;
    expect(consent[2]).toMatchObject({ ad_storage: 'denied', ad_user_data: 'denied', ad_personalization: 'denied' });
    expect(s.calls().find((c) => c[0] === 'set' && c[1] === 'user_properties')![2]).toMatchObject({ app_version: 'abc123', app_mode: 'api' });
  });

  it('page_view vai com o modelo da rota, sem id nem token', () => {
    const s = setup({ id: 'G-TEST1', stored: 'granted' });
    s.a.pageView('/org/9f8e/salarios');
    s.a.pageView('/entrar');
    const [pv1, pv2] = s.events().filter((e) => e[1] === 'page_view');
    expect(pv1[2]).toMatchObject({ page_path: '/org/:id/salarios', page_location: 'https://peekjob.pt/org/:id/salarios' });
    expect(JSON.stringify(pv2)).not.toContain('token');
  });

  it('eventos passam pela limpeza', () => {
    const s = setup({ id: 'G-TEST1', stored: 'granted' });
    s.a.track('review_submit', { result: 'published', email: 'a@b.pt' } as never);
    expect(s.events().at(-1)).toEqual(['event', 'review_submit', { result: 'published' }]);
  });

  it('não repete page_view para a mesma rota seguida (StrictMode)', () => {
    const s = setup({ id: 'G-TEST1', stored: 'granted' });
    s.a.pageView('/ranking');
    s.a.pageView('/ranking');
    expect(s.events().filter((e) => e[1] === 'page_view')).toHaveLength(1);
  });

  it('recusar ou retirar o consentimento para a medição e apaga os cookies do GA', () => {
    const s = setup({ id: 'G-TEST1', stored: 'granted' });
    s.a.revoke();
    expect(s.stored()).toBe('denied');
    expect(s.clearCookies).toHaveBeenCalled();
    const n = s.calls().length;
    s.a.track('search', { results_count: 2 });
    expect(s.calls()).toHaveLength(n);
    expect(s.calls().some((c) => c[0] === 'consent' && c[1] === 'update' && (c[2] as Record<string, string>).analytics_storage === 'denied')).toBe(true);
  });
});
