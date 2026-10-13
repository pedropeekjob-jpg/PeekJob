import { screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { renderScreen } from '../utils/render';

// Modo API: sem sessão pede para entrar; o servidor pode falhar
vi.mock('../../src/api/http', async (orig) => ({ ...(await orig<typeof import('../../src/api/http')>()), apiMode: true }));
const exportMyData = vi.fn();
const deleteAccount = vi.fn();
let user: { email: string } | null = null;
vi.mock('../../src/lib/store', async (orig) => {
  const actual = await orig<typeof import('../../src/lib/store')>();
  return { ...actual, useStore: () => ({ ...actual.useStore(), user, exportMyData, deleteAccount }) };
});

const { default: MeusDados } = await import('../../src/pages/MeusDados');
const show = (viewport: 'mobile' | 'desktop') => renderScreen(<MeusDados />, { route: '/perfil/dados', path: '/perfil/dados', viewport });

describe.each(['mobile', 'desktop'] as const)('Os teus dados, modo API (%s)', (viewport) => {
  beforeEach(() => {
    localStorage.clear();
    exportMyData.mockReset();
    deleteAccount.mockReset();
    user = { email: 'ana@gmail.com' };
  });

  it('sem sessão: convite para entrar', async () => {
    user = null;
    const { user: u } = show(viewport);
    expect(screen.getByText('Entra para descarregar ou apagar os teus dados.')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Descarregar' })).not.toBeInTheDocument();
    await u.click(screen.getByRole('button', { name: 'Entrar' }));
    expect(screen.getByTestId('outra-rota')).toBeInTheDocument();
  });

  it('enquanto descarrega, os botões ficam bloqueados; erro aparece', async () => {
    let resolve!: (v: unknown) => void;
    exportMyData.mockReturnValue(new Promise((r) => (resolve = r)));
    const { user: u } = show(viewport);
    await u.click(screen.getByRole('button', { name: 'Descarregar' }));
    expect(screen.getByRole('button', { name: 'A preparar…' })).toBeDisabled();
    resolve({ ok: false, message: 'Sem ligação.' });
    expect(await screen.findByRole('alert')).toHaveTextContent('Sem ligação.');
    expect(screen.getByRole('button', { name: 'Descarregar' })).toBeEnabled();
  });

  it('apagar: a apagar… e erro do servidor', async () => {
    let resolve!: (v: unknown) => void;
    deleteAccount.mockReturnValue(new Promise((r) => (resolve = r)));
    const { user: u } = show(viewport);
    await u.click(screen.getByRole('button', { name: 'Apagar a minha conta' }));
    await u.click(screen.getByRole('button', { name: 'Apagar definitivamente' }));
    expect(deleteAccount).toHaveBeenCalledWith(false);
    expect(screen.getByRole('button', { name: 'A apagar…' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Cancelar' })).toBeDisabled();
    resolve({ ok: false, message: 'Tenta de novo.' });
    expect(await screen.findByRole('alert')).toHaveTextContent('Tenta de novo.');
    expect(screen.queryByText('A tua conta foi apagada.')).not.toBeInTheDocument();
  });
});
