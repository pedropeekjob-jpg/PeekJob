import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

// Modo API: o NIF é confirmado no registo europeu (VIES)
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
const { NifField } = await import('../../src/components/NifField');

const show = (value: string, required = false, onOfficial = vi.fn()) => render(<NifField value={value} onChange={() => {}} required={required} onOfficial={onOfficial} />);
const help = () => screen.getByText((_, el) => el?.id === 'nnif-ajuda');

describe('NifField', () => {
  beforeEach(() => {
    calls.length = 0;
    impl = async () => ({});
  });

  it('sem NIF: explica para que serve; rótulo opcional ou obrigatório', () => {
    const { rerender } = show('');
    expect(screen.getByLabelText('NIF (opcional)')).toHaveAttribute('aria-describedby', 'nnif-ajuda');
    expect(help()).toHaveTextContent('Com o NIF confirmamos a organização mais depressa.');
    rerender(<NifField value="" onChange={() => {}} required onOfficial={() => {}} />);
    expect(screen.getByLabelText('NIF')).toBeInTheDocument();
  });

  it('NIF inválido: aviso e campo marcado', () => {
    show('123456780');
    expect(screen.getByLabelText('NIF (opcional)')).toHaveAttribute('aria-invalid', 'true');
    expect(help()).toHaveTextContent('Este NIF não é válido. Confirma os 9 dígitos.');
    expect(calls).toEqual([]);
  });

  it('válido e registado: nome oficial e botão para o usar', async () => {
    impl = async () => ({ nif: '500000000', status: 'valid', name: 'PADARIA RIBEIRA LDA', address: 'RUA X 1, 4000-123 PORTO', kind: null });
    const onOfficial = vi.fn();
    show('500 000 000', false, onOfficial);
    expect(help()).toHaveTextContent('A confirmar no registo europeu…');
    const use = await screen.findByRole('button', { name: 'Usar o nome e a localidade oficiais' }, { timeout: 2000 });
    expect(help()).toHaveTextContent('Registada como PADARIA RIBEIRA LDA');
    expect(calls).toEqual(['/orgs/nif/500000000']);
    use.click();
    expect(onOfficial).toHaveBeenCalledWith({ name: 'PADARIA RIBEIRA LDA', city: 'Porto' });
  });

  it('válido sem nome (pessoa): só a confirmação', async () => {
    impl = async () => ({ nif: '500000000', status: 'valid', name: null, address: null, kind: null });
    show('500000000');
    expect(await screen.findByText('NIF confirmado no registo europeu.', undefined, { timeout: 2000 })).toBeInTheDocument();
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
  });

  it.each([
    ['invalid', 'Não aparece no registo europeu de IVA (é normal em associações). Confirmamos depois.'],
    ['unavailable', 'Não conseguimos confirmar agora. Confirmamos depois.'],
  ])('registo responde %s', async (status, text) => {
    impl = async () => ({ nif: '500000000', status, name: null, address: null, kind: null });
    show('500000000');
    expect(await screen.findByText(text, undefined, { timeout: 2000 })).toBeInTheDocument();
  });

  it('erro (ex.: sem sessão): fica só "NIF válido"', async () => {
    impl = async () => {
      throw new Error('401');
    };
    show('500000000');
    expect(await screen.findByText('NIF válido.', undefined, { timeout: 2000 })).toBeInTheDocument();
  });
});
