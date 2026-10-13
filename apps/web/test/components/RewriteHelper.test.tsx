import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { RewriteHelper } from '../../src/components/RewriteHelper';

const LONG_CALM = 'A equipa é simpática e os horários são cumpridos quase sempre.';
const RUDE = 'O chefe é um idiota e grita com toda a gente o dia inteiro.';

describe('RewriteHelper (demonstração: só regras)', () => {
  it('texto curto e calmo: nada', () => {
    const { container } = render(<RewriteHelper text="Curto." onUse={() => {}} />);
    expect(container).toBeEmptyDOMElement();
  });

  it('texto longo e calmo: ligação discreta para rever o tom', async () => {
    const user = userEvent.setup();
    render(<RewriteHelper text={LONG_CALM} onUse={() => {}} />);
    await user.click(screen.getByRole('button', { name: 'Rever o tom com IA' }));
    expect(await screen.findByText('Proposta', undefined, { timeout: 2000 })).toBeInTheDocument();
  });

  it.each([false, true])('insulto: aviso, proposta sem IA, usar ou manter (computador: %s)', async (desktop) => {
    const user = userEvent.setup();
    const onUse = vi.fn();
    render(<RewriteHelper text={RUDE} onUse={onUse} desktop={desktop} />);
    expect(screen.getByRole('alert')).toHaveTextContent('Sem nomes nem insultos');
    await user.click(screen.getByRole('button', { name: 'Reescrever com IA' }));
    expect(screen.getByRole('button', { name: 'A reescrever…' })).toBeDisabled();
    expect(await screen.findByText('Proposta', undefined, { timeout: 2000 })).toBeInTheDocument();
    expect(screen.getByText(/^Sugestão automática \(sem IA\)/)).toBeInTheDocument();
    // proposta das regras: sem botão "outra versão"
    expect(screen.queryByRole('button', { name: 'Outra versão' })).not.toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Usar esta versão' }));
    expect(onUse).toHaveBeenCalledWith(expect.not.stringContaining('idiota'));
  });

  it('manter o meu texto fecha a proposta', async () => {
    const user = userEvent.setup();
    render(<RewriteHelper text={RUDE} onUse={() => {}} />);
    await user.click(screen.getByRole('button', { name: 'Reescrever com IA' }));
    await user.click(await screen.findByRole('button', { name: 'Manter o meu texto' }, { timeout: 2000 }));
    expect(screen.queryByText('Proposta')).not.toBeInTheDocument();
  });
});
