import { fireEvent, screen } from '@testing-library/react';

/** Dá uma nota nas bolinhas de um critério (0 tira a nota: tocar de novo na escolhida) */
export function setScore(label: string, n: number, index = 0) {
  const group = screen.getAllByRole('radiogroup', { name: label })[index];
  const radios = Array.from(group.querySelectorAll<HTMLElement>('[role="radio"]'));
  const target = n ? radios[n - 1] : radios.find((r) => r.getAttribute('aria-checked') === 'true');
  if (target) fireEvent.click(target);
}

/** A nota escolhida num critério, como o leitor de ecrã a lê ("4 de 5, Bom"), ou "Sem nota" */
export function scoreText(label: string, index = 0) {
  const group = screen.getAllByRole('radiogroup', { name: label })[index];
  const on = group.querySelector('[role="radio"][aria-checked="true"]');
  return on ? (on.getAttribute('aria-label') ?? '').replace(`${label}, `, '') : 'Sem nota';
}
