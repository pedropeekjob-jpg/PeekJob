import { render, type RenderOptions } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { ReactElement } from 'react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { LangRoot } from '../../src/i18n';
import { StoreProvider } from '../../src/lib/store';

/** Largura simulada: 'mobile' (390 px) ou 'desktop' (1440 px). Afeta useIsDesktop (matchMedia). */
export function setViewport(kind: 'mobile' | 'desktop') {
  const width = kind === 'desktop' ? 1440 : 390;
  window.matchMedia = ((query: string) => {
    const min = /min-width:\s*(\d+)px/.exec(query);
    const matches = min ? width >= Number(min[1]) : /prefers-reduced-motion/.test(query);
    return { matches, media: query, onchange: null, addEventListener: () => {}, removeEventListener: () => {}, addListener: () => {}, removeListener: () => {}, dispatchEvent: () => false };
  }) as typeof window.matchMedia;
}

/**
 * Monta um ecrã com os mesmos providers da aplicação (loja em modo demonstração: dados de exemplo, sem rede).
 * `path` é a rota do ecrã (ex.: '/org/:id') e `route` o endereço inicial.
 */
export function renderScreen(ui: ReactElement, { route = '/', path = '*', viewport = 'mobile', ...opts }: { route?: string; path?: string; viewport?: 'mobile' | 'desktop' } & RenderOptions = {}) {
  setViewport(viewport);
  const user = userEvent.setup();
  const result = render(
    <StoreProvider>
      <LangRoot>
        <MemoryRouter initialEntries={[route]}>
          <Routes>
            <Route path={path} element={ui} />
            <Route path="*" element={<div data-testid="outra-rota" />} />
          </Routes>
        </MemoryRouter>
      </LangRoot>
    </StoreProvider>,
    opts,
  );
  return { user, ...result };
}
