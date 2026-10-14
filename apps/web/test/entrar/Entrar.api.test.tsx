import { screen } from '@testing-library/react';
import { useLocation } from 'react-router';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { renderScreen } from '../utils/render';

// Modo API: o link chega por email e o servidor pode recusar o pedido
vi.mock('../../src/api/http', async (orig) => ({ ...(await orig<typeof import('../../src/api/http')>()), apiMode: true }));
const requestLink = vi.fn();
const verifyLink = vi.fn();
vi.mock('../../src/lib/store', async (orig) => {
  const actual = await orig<typeof import('../../src/lib/store')>();
  return { ...actual, useStore: () => ({ ...actual.useStore(), requestLink, verifyLink, onboarded: false }) };
});

const { default: Entrar } = await import('../../src/pages/Entrar');
/** Onde se está (para ver para onde se segue depois de entrar) */
function Where() {
  const { pathname, search } = useLocation();
  return <span data-testid="onde">{pathname + search}</span>;
}
const show = (viewport: 'mobile' | 'desktop', route = '/entrar') => renderScreen(<Entrar />, { route, path: '/entrar', viewport, outside: <Where /> });

describe.each(['mobile', 'desktop'] as const)('Entrar, modo API (%s)', (viewport) => {
  beforeEach(() => {
    localStorage.clear();
    requestLink.mockReset();
    verifyLink.mockReset();
  });

  it('pede o link ao servidor e diz para abrir o email (sem botão de "abri o link")', async () => {
    requestLink.mockResolvedValue({ ok: true });
    const { user } = show(viewport);
    const input = await screen.findByLabelText('O teu email');
    await user.clear(input);
    await user.type(input, ' ana@gmail.com');
    await user.click(screen.getByRole('button', { name: 'Receber link de acesso' }));
    expect(requestLink).toHaveBeenCalledWith('ana@gmail.com');
    expect(await screen.findByText('Abre o link nesse email para entrar. Podes fechar esta página.')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Abri o link · continuar' })).not.toBeInTheDocument();
  });

  it('erro do servidor aparece no campo', async () => {
    requestLink.mockResolvedValue({ ok: false, message: 'Demasiados pedidos. Tenta daqui a pouco.' });
    const { user } = show(viewport);
    const input = await screen.findByLabelText('O teu email');
    await user.clear(input);
    await user.type(input, 'ana@gmail.com');
    await user.click(screen.getByRole('button', { name: 'Receber link de acesso' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Demasiados pedidos. Tenta daqui a pouco.');
  });

  it('link do email válido: entra e segue (preferências na primeira vez)', async () => {
    verifyLink.mockResolvedValue({ ok: true });
    show(viewport, '/entrar?token=abc');
    expect(screen.getByRole('status')).toHaveTextContent('A entrar…');
    expect(await screen.findByTestId('outra-rota')).toBeInTheDocument();
    expect(verifyLink).toHaveBeenCalledTimes(1);
    expect(verifyLink).toHaveBeenCalledWith('abc');
  });

  it('link expirado: explica e deixa pedir outro', async () => {
    verifyLink.mockResolvedValue({ ok: false, message: 'expirado' });
    const { user } = show(viewport, '/entrar?token=velho');
    expect(await screen.findByRole('heading', { level: 1, name: 'Este link já não funciona.' })).toBeInTheDocument();
    await user.click(screen.getByRole('link', { name: 'Pedir um novo link' }));
    expect(await screen.findByLabelText('O teu email')).toBeInTheDocument();
  });

  it('a meio de avaliar ("Entra para publicar"): o link do email volta às notas, não às preferências', async () => {
    requestLink.mockResolvedValue({ ok: true });
    verifyLink.mockResolvedValue({ ok: true });
    const first = show(viewport, '/entrar?next=%2Favaliar%2Fnotas');
    const input = await screen.findByLabelText('O teu email');
    await first.user.clear(input);
    await first.user.type(input, 'ana@gmail.com');
    await first.user.click(screen.getByRole('button', { name: 'Receber link de acesso' }));
    await screen.findByText('Abre o link nesse email para entrar. Podes fechar esta página.');
    first.unmount();
    // o link abre noutro separador, sem o destino no endereço
    show(viewport, '/entrar?token=abc');
    await vi.waitFor(() => expect(screen.getByTestId('onde')).toHaveTextContent('/avaliar/notas'));
  });

  it('destino inseguro no endereço é ignorado', async () => {
    requestLink.mockResolvedValue({ ok: true });
    verifyLink.mockResolvedValue({ ok: true });
    const first = show(viewport, '/entrar?next=%2F%2Fmau.pt');
    const input = await screen.findByLabelText('O teu email');
    await first.user.clear(input);
    await first.user.type(input, 'ana@gmail.com');
    await first.user.click(screen.getByRole('button', { name: 'Receber link de acesso' }));
    await screen.findByText('Abre o link nesse email para entrar. Podes fechar esta página.');
    first.unmount();
    show(viewport, '/entrar?token=abc');
    await vi.waitFor(() => expect(screen.getByTestId('onde')).toHaveTextContent('/preferencias'));
  });
});
