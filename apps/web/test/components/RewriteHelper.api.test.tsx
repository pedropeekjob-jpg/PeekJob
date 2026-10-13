import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

// função simples (não vi.fn): as rejeições de um vi.fn assíncrono falham o teste neste runner
let impl: (path: string) => Promise<unknown> = async () => ({});
const calls: string[] = [];
vi.mock('../../src/api/http', async (orig) => ({
  ...(await orig<typeof import('../../src/api/http')>()),
  apiMode: true,
  api: (path: string) => {
    calls.push(path);
    return impl(path);
  },
}));
const { ApiError } = await import('../../src/api/http');
const { RewriteHelper } = await import('../../src/components/RewriteHelper');
const RUDE = 'O chefe é um idiota e grita com toda a gente o dia inteiro.';

describe('RewriteHelper (modo API)', () => {
  beforeEach(() => {
    calls.length = 0;
    impl = async () => ({});
  });

  it('proposta da IA: pode pedir outra versão; escrever mais apaga a proposta', async () => {
    impl = async () => ({ text: 'O chefe grita com a equipa.', source: 'ai' });
    const user = userEvent.setup();
    const { rerender } = render(<RewriteHelper text={RUDE} onUse={() => {}} />);
    await user.click(screen.getByRole('button', { name: 'Reescrever com IA' }));
    expect(await screen.findByText('O chefe grita com a equipa.')).toBeInTheDocument();
    expect(screen.getByText(/^Escrita por IA/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Outra versão' })).toBeInTheDocument();
    rerender(<RewriteHelper text={`${RUDE} Mais.`} onUse={() => {}} />);
    expect(screen.queryByText('O chefe grita com a equipa.')).not.toBeInTheDocument();
  });

  it.each([
    [429, 'Pediste muitas versões seguidas. Tenta daqui a uns minutos.'],
    [500, 'Não foi possível reescrever agora. Podes editar o texto à mão.'],
  ])('erro %s', async (status, text) => {
    impl = async () => {
      throw new ApiError(status, null);
    };
    const user = userEvent.setup();
    render(<RewriteHelper text={RUDE} onUse={() => {}} />);
    await user.click(screen.getByRole('button', { name: 'Reescrever com IA' }));
    expect(await screen.findByText(text)).toBeInTheDocument();
  });
});
