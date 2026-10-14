import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { describe, expect, it, vi } from 'vitest';

const reportError = vi.fn();
vi.mock('../../src/lib/monitoring', () => ({ reportError }));
const { ErrorBoundary } = await import('../../src/components/ErrorBoundary');

function Boom(): never {
  throw new Error('falhou');
}

describe('ErrorBoundary', () => {
  it('mostra uma página de erro, reporta e limpa ao mudar de ecrã', () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    const { rerender } = render(
      <MemoryRouter>
        <ErrorBoundary resetKey="/a">
          <Boom />
        </ErrorBoundary>
      </MemoryRouter>,
    );
    expect(screen.getByRole('alert')).toHaveTextContent('Algo correu mal neste ecrã');
    expect(screen.getByRole('button', { name: 'Tentar outra vez' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Voltar ao início' })).toHaveAttribute('href', '/');
    expect(reportError).toHaveBeenCalledWith(expect.any(Error), expect.any(String));
    rerender(
      <MemoryRouter>
        <ErrorBoundary resetKey="/b">
          <p>ok</p>
        </ErrorBoundary>
      </MemoryRouter>,
    );
    expect(screen.getByText('ok')).toBeInTheDocument();
  });
});
