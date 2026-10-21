import { screen, within } from '@testing-library/react';
import { beforeEach, describe, expect, it } from 'vitest';
import { DesktopHeader, inReviewFlow, MobileHomeHeader, SiteFooter } from '../../src/components/Layout';
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

  it('computador: o botão "Avaliar onde trabalho" não aparece a meio de uma avaliação', () => {
    const { unmount } = renderScreen(<DesktopHeader />, { viewport: 'desktop', route: '/explorar' });
    expect(screen.getByRole('link', { name: 'Avaliar onde trabalho' })).toHaveAttribute('href', '/avaliar');
    unmount();
    renderScreen(<DesktopHeader />, { viewport: 'desktop', route: '/avaliar/notas' });
    expect(screen.queryByRole('link', { name: 'Avaliar onde trabalho' })).not.toBeInTheDocument();
  });

  it('ecrãs do fluxo de avaliar e de partilhar', () => {
    expect(['/avaliar', '/avaliar/notas', '/avaliar/feito', '/avaliar/verificar', '/partilhar/salario'].every(inReviewFlow)).toBe(true);
    expect(['/', '/avaliarx', '/org/x', '/apoio'].some(inReviewFlow)).toBe(false);
  });

  it('página inicial (telemóvel): o mesmo menu', () => {
    renderScreen(<MobileHomeHeader />);
    expect(links(screen.getByRole('navigation', { name: 'Principal' })).map(([t]) => t)).toEqual(['Explorar', 'Ranking', 'Sobre']);
  });

  it('rodapé: aviso de que a PeekJob não trata irregularidades', () => {
    renderScreen(<SiteFooter />, { viewport: 'desktop' });
    expect(screen.getByText(/^A PeekJob não trata nem resolve irregularidades\. Se algo puder ser ilegal/)).toBeInTheDocument();
  });

  it('o Contacto passa para o rodapé', () => {
    renderScreen(<SiteFooter />, { viewport: 'desktop' });
    expect(within(screen.getByRole('navigation', { name: 'Rodapé' })).getByRole('link', { name: 'Contacto' })).toHaveAttribute('href', '/contacto');
  });
});
