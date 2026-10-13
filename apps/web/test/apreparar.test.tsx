import { act, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import APreparar from '../src/pages/APreparar';
import { renderScreen } from './utils/render';

describe('A preparar (depois das prioridades)', () => {
  beforeEach(() => {
    localStorage.clear();
  });
  afterEach(() => vi.useRealTimers());

  it('mostra as prioridades por ordem e o botão para avançar', async () => {
    const { user } = renderScreen(<APreparar />, { route: '/a-preparar', path: '/a-preparar' });
    const list = screen.getByRole('list', { name: 'As tuas prioridades' });
    expect(list.querySelectorAll('li')).toHaveLength(3);
    expect(list).toHaveTextContent(/Respeito/);
    await user.click(screen.getByRole('button', { name: 'Continuar' }));
    expect(screen.getByTestId('outra-rota')).toBeInTheDocument();
  });

  it('avança sozinho ao fim de 5 segundos', () => {
    vi.useFakeTimers();
    renderScreen(<APreparar />, { route: '/a-preparar', path: '/a-preparar' });
    expect(screen.queryByTestId('outra-rota')).not.toBeInTheDocument();
    act(() => vi.advanceTimersByTime(5000));
    expect(screen.getByTestId('outra-rota')).toBeInTheDocument();
  });

  it('o ecrã não é um botão gigante (só o botão avança)', () => {
    renderScreen(<APreparar />, { route: '/a-preparar', path: '/a-preparar' });
    expect(document.querySelector('[onclick], div[style*="cursor: pointer"]')).toBeNull();
  });
});
