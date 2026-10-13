import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { BigRing, CritLine, critLineAria, PrioMark } from '../src/components/Score';

describe('BigRing', () => {
  it('passa tamanho, espessura e ângulo em variáveis CSS (nota de 0 a 5 ou percentagem)', () => {
    render(
      <BigRing value={50} pct size={92} ariaLabel="metade">
        50%
      </BigRing>,
    );
    const ring = screen.getByRole('img', { name: 'metade' });
    expect(ring.style.getPropertyValue('--size')).toBe('92px');
    expect(ring.style.getPropertyValue('--t')).toBe('9px'); // 10 % do tamanho, por omissão
    expect(ring.style.getPropertyValue('--deg')).toBe('180deg');
    expect(ring.hasAttribute('data-muted')).toBe(false);
  });

  it('sem nota fica apagado e aceita uma classe para posicionar', () => {
    render(
      <BigRing value={0} size={96} thickness={6} muted ariaLabel="sem nota" className="por-cima">
        ?
      </BigRing>,
    );
    const ring = screen.getByRole('img', { name: 'sem nota' });
    expect(ring.hasAttribute('data-muted')).toBe(true);
    expect(ring.className).toContain('por-cima');
    expect(ring.style.getPropertyValue('--t')).toBe('6px');
  });
});

describe('PrioMark', () => {
  it('mostra o número com a cor do critério', () => {
    const { container } = render(<PrioMark n={2} color="red" />);
    const mark = container.querySelector('span')!;
    expect(mark.textContent).toBe('2');
    expect(mark.title).toBe('Prioridade 2');
    expect(mark.style.getPropertyValue('--c')).toBe('red');
  });
});

describe('CritLine', () => {
  it('lê nome, nota e prioridade; marca negrito, borda e altura', () => {
    render(<CritLine k="salario" value={3.8} priority={1} bold border minHeight={44} />);
    const line = screen.getByRole('group', { name: 'Salário justo 3,8 de 5, a tua prioridade 1' });
    expect(line.hasAttribute('data-border')).toBe(true);
    expect(line.hasAttribute('data-delta')).toBe(false);
    expect(line.style.getPropertyValue('--min-h')).toBe('44px');
    expect(line.textContent).toContain('3,8');
  });

  it('sem dados mostra um traço; com variação mostra subida, descida ou igual', () => {
    const { rerender } = render(<CritLine k="ambiente" value={null} delta={0.2} muted />);
    expect(screen.getByRole('group').textContent).toContain('—');
    expect(screen.getByText('▲ 0,2').dataset.trend).toBe('up');
    rerender(<CritLine k="ambiente" value={4} delta={-0.3} />);
    expect(screen.getByText('▼ 0,3').dataset.trend).toBe('down');
    rerender(<CritLine k="ambiente" value={4} delta={0} />);
    expect(screen.getByText('= 0,0').dataset.trend).toBe('flat');
  });

  it('texto para leitores de ecrã', () => {
    expect(critLineAria('ambiente', null)).toMatch(/sem dados$/);
    expect(critLineAria('ambiente', 4, undefined, 0.1)).toMatch(/, subiu 0,1 esta semana$/);
    expect(critLineAria('ambiente', 4, undefined, -0.1)).toMatch(/, desceu 0,1 esta semana$/);
    expect(critLineAria('ambiente', 4, undefined, 0)).toMatch(/, igual esta semana$/);
  });
});
