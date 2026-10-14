import { screen, within } from '@testing-library/react';
import { beforeEach, describe, expect, it } from 'vitest';
import { DesktopHeader, MobileHomeHeader, SiteFooter } from '../../src/components/Layout';
import { renderScreen } from '../utils/render';

const links = (nav: HTMLElement) => within(nav).getAllByRole('link').map((a) => [a.textContent, a.getAttribute('href')]);

describe('cabeçalho e rodapé', () => {
  beforeEach(() => localStorage.clear());

  it('computador: o menu principal começa por Explorar (a lista de organizações a um clique de qualquer ecrã)', () => {
    renderScreen(<DesktopHeader />, { viewport: 'desktop' });
    expect(links(screen.getByRole('navigation', { name: 'Principal' }))).toEqual([
      ['Explorar', '/explorar'],
      ['Ranking', '/ranking'],
      ['Sobre', '/sobre'],
    ]);
  });

  it('página inicial (telemóvel): o mesmo menu', () => {
    renderScreen(<MobileHomeHeader />);
    expect(links(screen.getByRole('navigation', { name: 'Principal' })).map(([t]) => t)).toEqual(['Explorar', 'Ranking', 'Sobre']);
  });

  it('o Contacto passa para o rodapé', () => {
    renderScreen(<SiteFooter />, { viewport: 'desktop' });
    expect(within(screen.getByRole('navigation', { name: 'Rodapé' })).getByRole('link', { name: 'Contacto' })).toHaveAttribute('href', '/contacto');
  });
});
