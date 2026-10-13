import { screen, within } from '@testing-library/react';
import { useLocation } from 'react-router-dom';
import { beforeEach, describe, expect, it } from 'vitest';
import Preferencias from '../../src/pages/Preferencias';
import { renderScreen, seedStore } from '../utils/render';

function Where() {
  return <output data-testid="where">{useLocation().pathname}</output>;
}
const show = (viewport: 'mobile' | 'desktop') => renderScreen(<Preferencias />, { route: '/preferencias', path: '/preferencias', viewport, outside: <Where /> });
const where = () => screen.getByTestId('where').textContent;
const stored = () => JSON.parse(localStorage.getItem('peekjob-poc-v1') ?? '{}');
const group = () => screen.getByRole('group', { name: 'Escolhe 3 prioridades' });
const option = (name: RegExp) => within(group()).getByRole('button', { name });

describe.each(['mobile', 'desktop'] as const)('Preferências (%s)', (viewport) => {
  beforeEach(() => localStorage.clear());
  const desktop = viewport === 'desktop';
  const hint = (n: number) => (desktop ? `${n} de 3 · clica de novo para tirar` : `${n} de 3 · toca de novo para tirar`);

  it('começa com as prioridades guardadas, por ordem', () => {
    show(viewport);
    expect(screen.getByRole('heading', { level: 1, name: 'O que mais valorizas num trabalho?' })).toBeInTheDocument();
    expect(within(group()).getAllByRole('button')).toHaveLength(8);
    expect(option(/^Respeito e inclusão/)).toHaveAccessibleName(desktop ? 'Respeito e inclusão Direitos, diversidade, sem assédio , prioridade 1' : 'Respeito e inclusão , prioridade 1');
    expect(option(/^Salário justo/)).toHaveAttribute('aria-pressed', 'true');
    expect(option(/^Ambiente/)).toHaveAttribute('aria-pressed', 'false');
    expect(screen.getByRole('button', { name: 'Ver organizações para mim' })).toBeEnabled();
    if (desktop) {
      const chosen = screen.getByRole('list', { name: 'As tuas escolhas' });
      expect(within(chosen).getAllByRole('listitem').map((li) => li.textContent)).toEqual(['1Respeito e inclusão', '2Salário justo', '3Equilíbrio']);
      expect(screen.getByText(hint(3))).toBeInTheDocument();
    } else expect(screen.getByText('Respeito e inclusão · Salário justo · Equilíbrio')).toBeInTheDocument();
  });

  it('tocar de novo tira; no máximo 3; confirmar guarda e vai preparar', async () => {
    const { user } = show(viewport);
    await user.click(option(/^Respeito e inclusão/));
    expect(option(/^Respeito e inclusão/)).toHaveAttribute('aria-pressed', 'false');
    expect(screen.getByText(hint(2))).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Escolhe mais 1' })).toBeDisabled();
    if (desktop) expect(within(screen.getByRole('list', { name: 'As tuas escolhas' })).getAllByRole('listitem')[2].textContent).toBe('3Por escolher');
    await user.click(option(/^Propósito/));
    await user.click(option(/^Ambiente/)); // já há 3: ignorado
    expect(option(/^Ambiente/)).toHaveAttribute('aria-pressed', 'false');
    expect(option(/^Propósito/)).toHaveAccessibleName(desktop ? 'Propósito Trabalho com impacto , prioridade 3' : 'Propósito , prioridade 3');
    await user.click(screen.getByRole('button', { name: 'Ver organizações para mim' }));
    expect(stored().prefs).toEqual(['salario', 'equilibrio', 'proposito']);
    expect(where()).toBe('/a-preparar');
  });

  it('saltar acaba a apresentação sem mudar as prioridades', async () => {
    seedStore({ prefs: ['ambiente'] });
    const { user } = show(viewport);
    expect(screen.getByRole('button', { name: 'Escolhe mais 2' })).toBeDisabled();
    await user.click(screen.getByRole('button', { name: desktop ? 'Saltar por agora' : 'Saltar' }));
    expect(stored()).toMatchObject({ onboarded: true, prefs: ['ambiente'] });
    expect(where()).toBe('/explorar');
  });
});

describe('Preferências (computador): logótipo', () => {
  beforeEach(() => localStorage.clear());
  it('o logótipo também salta para explorar', async () => {
    const { user } = show('desktop');
    await user.click(screen.getByRole('link', { name: 'PeekJob, início' }));
    expect(where()).toBe('/explorar');
  });
});

describe('Preferências (telemóvel): dica no título', () => {
  beforeEach(() => localStorage.clear());
  it('cada opção explica o critério no title', () => {
    show('mobile');
    expect(option(/^Salário justo/)).toHaveAttribute('title', 'Pago a horas, sem surpresas');
  });
});
