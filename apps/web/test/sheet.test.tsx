import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState } from 'react';
import { describe, expect, it } from 'vitest';
import { Sheet } from '../src/components/UI';

function Harness() {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button type="button" onClick={() => setOpen(true)}>
        Abrir filtros
      </button>
      <Sheet open={open} onClose={() => setOpen(false)} title="Filtros" footer={<button type="button">Aplicar</button>}>
        <p>Conteúdo</p>
      </Sheet>
    </>
  );
}

describe('Sheet (folha / diálogo)', () => {
  it('abre como diálogo modal com título, conteúdo e rodapé; o foco entra no diálogo', async () => {
    const user = userEvent.setup();
    render(<Harness />);
    await user.click(screen.getByRole('button', { name: 'Abrir filtros' }));
    const dialog = screen.getByRole('dialog', { name: 'Filtros' });
    expect(dialog).toHaveAttribute('aria-modal', 'true');
    expect(screen.getByText('Conteúdo')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Aplicar' })).toBeInTheDocument();
    expect(dialog.contains(document.activeElement)).toBe(true);
    expect(document.body.style.overflow).toBe('hidden');
  });

  it.each([
    ['Escape', async (u: ReturnType<typeof userEvent.setup>) => u.keyboard('{Escape}')],
    ['botão fechar', async (u: ReturnType<typeof userEvent.setup>) => u.click(screen.getByRole('button', { name: 'Fechar' }))],
    ['fundo', async (u: ReturnType<typeof userEvent.setup>) => u.click(document.querySelector('[data-sheet-backdrop]')!)],
  ])('fecha com %s e devolve o foco a quem a abriu', async (_n, close) => {
    const user = userEvent.setup();
    render(<Harness />);
    const opener = screen.getByRole('button', { name: 'Abrir filtros' });
    await user.click(opener);
    await close(user);
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(opener).toHaveFocus();
    expect(document.body.style.overflow).toBe('');
  });

  it('clicar dentro do diálogo não fecha', async () => {
    const user = userEvent.setup();
    render(<Harness />);
    await user.click(screen.getByRole('button', { name: 'Abrir filtros' }));
    await user.click(screen.getByText('Conteúdo'));
    expect(screen.getByRole('dialog')).toBeInTheDocument();
  });
});
