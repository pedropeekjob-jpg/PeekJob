import { act, fireEvent, screen, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import Guardadas from '../../src/pages/Guardadas';
import { renderScreen, seedStore } from '../utils/render';

const show = (viewport: 'mobile' | 'desktop') => renderScreen(<Guardadas />, { route: '/guardadas', path: '/guardadas', viewport });
const names = () => screen.getAllByRole('article').map((a) => within(a).getByRole('link').textContent);

describe.each(['mobile', 'desktop'] as const)('Guardadas (%s)', (viewport) => {
  const desktop = viewport === 'desktop';
  beforeEach(() => localStorage.clear());
  afterEach(() => vi.useRealTimers());

  it('lista as guardadas com a mudança desde que guardou', async () => {
    show(viewport);
    expect(await screen.findByRole('heading', { level: 1, name: 'Guardadas' })).toBeInTheDocument();
    expect(screen.getAllByRole('article')).toHaveLength(4);
    expect(screen.getByText(/4 organizações · [aA]visamos-te quando algo muda\./)).toBeInTheDocument();
    // subida no respeito (texto curto no telemóvel), subida geral e descida
    expect(screen.getByLabelText(/^Respeito e inclusão subiu para \d,\d$/)).toHaveTextContent(desktop ? /▲ Respeito e inclusão subiu para/ : /▲ Respeito subiu para/);
    expect(screen.getAllByLabelText(/^Subiu \d,\d desde que guardaste$/).length).toBeGreaterThan(0);
    expect(screen.getByLabelText(/^Desceu 0,4 desde que guardaste$/)).toHaveTextContent('▼ 0,4 desde que guardaste');
    const link = screen.getAllByRole('article')[0].querySelector('a')!;
    expect(link.getAttribute('href')).toMatch(/^\/org\//);
    expect(link).toHaveTextContent(/\d+%/);
  });

  it('nova no ranking e sem mudanças', async () => {
    seedStore({ saved: ['estudio-lume', 'oficina-sete'] });
    show(viewport);
    expect(await screen.findByText('Nova no ranking')).toBeInTheDocument();
    expect(screen.getByText('Sem mudanças desde que guardaste')).toBeInTheDocument();
  });

  it('deixar de guardar mostra "desfazer", que repõe', async () => {
    const { user } = show(viewport);
    await user.click(await screen.findByRole('button', { name: 'Deixar de guardar Padaria Ribeira' }));
    expect(names()).not.toContain(expect.stringContaining('Padaria Ribeira'));
    expect(screen.getAllByRole('article')).toHaveLength(3);
    expect(screen.getByRole('status')).toHaveTextContent('Deixaste de guardar Padaria Ribeira.');
    await user.click(screen.getByRole('button', { name: 'Desfazer' }));
    expect(screen.getAllByRole('article')).toHaveLength(4);
    expect(screen.queryByRole('status')).not.toBeInTheDocument();
  });

  it('o aviso desaparece sozinho ao fim de 8 segundos', async () => {
    vi.useFakeTimers();
    show(viewport);
    fireEvent.click(screen.getByRole('button', { name: 'Deixar de guardar Padaria Ribeira' }));
    expect(screen.getByRole('status')).toBeInTheDocument();
    act(() => vi.advanceTimersByTime(7900));
    expect(screen.getByRole('status')).toBeInTheDocument();
    act(() => vi.advanceTimersByTime(200));
    expect(screen.queryByRole('status')).not.toBeInTheDocument();
  });

  it('sem guardadas: convite para o ranking', async () => {
    seedStore({ saved: [] });
    show(viewport);
    expect(await screen.findByText(desktop ? 'Ainda não guardaste nenhuma organização' : 'Ainda não guardaste nenhuma')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Ver o ranking' })).toHaveAttribute('href', '/ranking');
    expect(screen.queryByRole('article')).not.toBeInTheDocument();
  });

  it('descobrir mais leva ao ranking', async () => {
    show(viewport);
    expect(await screen.findByRole('link', { name: desktop ? /Descobrir mais/ : /Descobrir mais organizações/ })).toHaveAttribute('href', '/ranking');
  });
});
