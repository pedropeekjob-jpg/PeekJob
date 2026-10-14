import { act, fireEvent, screen, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import Metodologia from '../../src/pages/Metodologia';
import { renderScreen, seedStore } from '../utils/render';

const show = (viewport: 'mobile' | 'desktop', route = '/metodologia') => renderScreen(<Metodologia />, { route, path: '/metodologia', viewport });
const demo = () => screen.getByRole('region', { name: 'Experimenta' });

describe.each(['mobile', 'desktop'] as const)('Metodologia (%s)', (viewport) => {
  beforeEach(() => localStorage.clear());
  afterEach(() => vi.useRealTimers());

  it('título e fórmula pública', async () => {
    show(viewport);
    expect(await screen.findByRole('heading', { level: 1, name: 'A nota não está à venda.' })).toBeInTheDocument();
    expect(screen.getAllByText('nota = (C × m + Σ notas) ÷ (C + n)').length).toBe(1);
  });

  it('experimenta: com 3 avaliações boas a nota ajustada é 4,1 e 38% já é real', async () => {
    show(viewport);
    await screen.findByRole('heading', { level: 1 });
    expect(within(demo()).getByRole('img', { name: 'Nota ajustada 4,1 de 5 com 3 avaliações' })).toBeInTheDocument();
    expect(within(demo()).getByText('Nota visível · fora do ranking')).toBeInTheDocument();
    expect(within(demo()).getByText(/38% da nota já é real\./)).toBeInTheDocument();
    expect(within(demo()).getByText('Neutro 3,8 → média real 4,6')).toBeInTheDocument();
  });

  it('atalhos, cursor e avaliações más', async () => {
    const { user } = show(viewport);
    await screen.findByRole('heading', { level: 1 });
    const d = demo();
    await user.click(within(d).getByRole('button', { name: '0' }));
    expect(within(d).getByRole('button', { name: '0' })).toHaveAttribute('aria-pressed', 'true');
    expect(within(d).getByRole('img', { name: 'Nota ajustada 3,8 de 5 com 0 avaliações, ainda não publicada' })).toBeInTheDocument();
    expect(within(d).getByText('Ainda sem nota · faltam 3')).toBeInTheDocument();
    fireEvent.change(within(d).getByLabelText(/Número de avaliações/), { target: { value: '1' } });
    expect(within(d).getByText('1 avaliação').tagName).toBe('STRONG');
    await user.click(within(d).getByRole('button', { name: '5' }));
    expect(within(d).getByText('Nota visível · no ranking')).toBeInTheDocument();
    await user.click(within(d).getByRole('button', { name: 'Más · 2,4' }));
    expect(within(d).getByRole('img', { name: 'Nota ajustada 3,1 de 5 com 5 avaliações' })).toBeInTheDocument();
  });

  it('regras: abre uma de cada vez', async () => {
    const { user } = show(viewport);
    const rules = (await screen.findByRole('heading', { name: 'As regras, sem letra pequena' })).closest('section')!;
    const min = within(rules).getByRole('button', { name: 'Mínimo de 3 avaliações' });
    await user.click(min);
    expect(min).toHaveAttribute('aria-expanded', 'true');
    expect(within(rules).getByText(/Com 5, entra no ranking\./)).toBeInTheDocument();
    await user.click(within(rules).getByRole('button', { name: 'Moderação com critério' }));
    expect(min).toHaveAttribute('aria-expanded', 'false');
    expect(within(rules).getByText(/críticas duras, quando descrevem factos\./)).toBeInTheDocument();
    // o direito de contestar está nas regras públicas (DSA art. 20.º)
    expect(within(rules).getByText(/pode contestá-la durante 6 meses/)).toBeInTheDocument();
    await user.click(within(rules).getByRole('button', { name: 'Moderação com critério' }));
    expect(within(rules).queryByText(/críticas duras/)).not.toBeInTheDocument();
  });

  it('% para ti: pesos 3, 2 e 1, contas por critério e troca de organização de exemplo', async () => {
    const { user } = show(viewport);
    const rules = (await screen.findByRole('heading', { name: 'As regras, sem letra pequena' })).closest('section')!;
    await user.click(within(rules).getByRole('button', { name: /Como nasce a tua/ }));
    expect(within(rules).getByText('As tuas 3 prioridades valem 3, 2 e 1. Só tu vês esta %.')).toBeInTheDocument();
    const lines = within(rules).getAllByRole('img');
    expect(lines).toHaveLength(3);
    expect(lines[0]).toHaveAccessibleName(/vezes peso 3 dá/);
    const before = within(rules).getByText(/% para ti$/).textContent;
    await user.click(within(rules).getByRole('button', { name: 'Norte Logística' }));
    expect(within(rules).getByRole('button', { name: 'Norte Logística' })).toHaveAttribute('aria-pressed', 'true');
    expect(within(rules).getByText(/% para ti$/).textContent).not.toBe(before);
    expect(within(rules).getByRole('link', { name: /Mudar prioridades/ })).toHaveAttribute('href', '/preferencias');
  });

  it('% para ti: critério que não se aplica e sem prioridades', async () => {
    seedStore({ prefs: ['salario'] });
    const { user, unmount } = show(viewport);
    const rules = (await screen.findByRole('heading', { name: 'As regras, sem letra pequena' })).closest('section')!;
    await user.click(within(rules).getByRole('button', { name: /Como nasce a tua/ }));
    expect(within(rules).getByText('As tuas 1 prioridades valem 3. Só tu vês esta %.')).toBeInTheDocument();
    unmount();
    seedStore({ prefs: [] });
    const second = show(viewport);
    const r2 = (await screen.findByRole('heading', { name: 'As regras, sem letra pequena' })).closest('section')!;
    await second.user.click(within(r2).getByRole('button', { name: /Como nasce a tua/ }));
    expect(within(r2).getByText('Ainda não escolheste prioridades.')).toBeInTheDocument();
  });

  it('respeito e inclusão: contactos de apoio e 112', async () => {
    show(viewport);
    const resp = (await screen.findByRole('heading', { name: 'Respeito e inclusão tem lugar próprio.' })).closest('section')!;
    expect(within(resp).getByRole('img', { name: 'Exemplo: Respeito e inclusão 4,8 de 5' })).toBeInTheDocument();
    expect(within(resp).getByText('112')).toBeInTheDocument();
    expect(within(resp).getAllByRole('link').some((a) => a.getAttribute('href')?.startsWith('tel:'))).toBe(true);
    expect(within(resp).getAllByRole('link').some((a) => a.getAttribute('href')?.startsWith('mailto:'))).toBe(true);
    expect(within(resp).getByRole('link', { name: /Página de apoio/ })).toHaveAttribute('href', '/apoio');
  });

  it('privacidade: âncora do rodapé faz scroll até à secção', async () => {
    vi.useFakeTimers();
    const scroll = vi.fn();
    Element.prototype.scrollIntoView = scroll;
    show(viewport, '/metodologia#privacidade');
    expect(screen.getByRole('heading', { name: 'Privacidade e RGPD' })).toBeInTheDocument();
    act(() => vi.advanceTimersByTime(100));
    expect(scroll).toHaveBeenCalledWith({ behavior: 'smooth', block: 'start' });
    expect(screen.getByRole('link', { name: /Exportar ou apagar os meus dados/ })).toHaveAttribute('href', '/perfil/dados');
  });
});
