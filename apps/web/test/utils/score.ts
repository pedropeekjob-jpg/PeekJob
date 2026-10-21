import { fireEvent, screen } from '@testing-library/react';

/** Dá uma nota no slider de um critério (0 tira a nota, com o ×) */
export function setScore(label: string, n: number, index = 0) {
  if (!n) {
    fireEvent.click(screen.getAllByRole('button', { name: `Tirar a nota de ${label}` })[index]);
    return;
  }
  const slider = screen.getAllByRole('slider', { name: label })[index];
  // sem nota o slider está no 3: largar aí dá o 3 (não há mudança de valor)
  if (Number((slider as HTMLInputElement).value) === n) fireEvent.pointerUp(slider);
  else fireEvent.change(slider, { target: { value: String(n) } });
}
