import { screen } from '@testing-library/react';
import { beforeEach, describe, expect, it } from 'vitest';
import { useStore } from '../../src/lib/store';
import Entrar from '../../src/pages/Entrar';
import { renderScreen } from '../utils/render';

function Who() {
  const { user } = useStore();
  return <div data-testid="who">{user?.email ?? ''}</div>;
}
const show = (viewport: 'mobile' | 'desktop') => renderScreen(<Entrar />, { route: '/entrar', path: '/entrar', viewport, outside: <Who /> });

describe.each(['mobile', 'desktop'] as const)('Entrar, demonstração (%s)', (viewport) => {
  beforeEach(() => localStorage.clear());

  it('email inválido: mensagem ligada ao campo', async () => {
    const { user } = show(viewport);
    const input = await screen.findByLabelText('O teu email');
    await user.clear(input);
    await user.type(input, 'ana@');
    await user.click(screen.getByRole('button', { name: 'Receber link de acesso' }));
    expect(screen.getByRole('alert')).toHaveTextContent('Escreve um email válido, por exemplo nome@gmail.com.');
    expect(input).toHaveAttribute('aria-invalid', 'true');
    expect(input).toHaveAttribute('aria-describedby', 'le-err');
  });

  it('enviar link, voltar a outro email, e "abri o link" entra e segue para as preferências', async () => {
    const { user } = show(viewport);
    const input = await screen.findByLabelText('O teu email');
    await user.clear(input);
    await user.type(input, '  ana@gmail.com ');
    await user.click(screen.getByRole('button', { name: 'Receber link de acesso' }));
    expect(screen.getByRole('heading', { level: 1, name: 'Vê o teu email.' })).toBeInTheDocument();
    expect(screen.getByRole('status')).toHaveTextContent(/ana@gmail\.com\. (Válido|Vale) 15 minutos\./);
    await user.click(screen.getByRole('button', { name: 'Usar outro email' }));
    expect(screen.getByLabelText('O teu email')).toHaveValue('ana@gmail.com');
    await user.click(screen.getByRole('button', { name: 'Receber link de acesso' }));
    await user.click(screen.getByRole('button', { name: 'Abri o link · continuar' }));
    expect(screen.getByTestId('who')).toHaveTextContent('ana@gmail.com');
    expect(screen.getByTestId('outra-rota')).toBeInTheDocument();
  });

  it('logo leva ao início e há caminho sem conta', async () => {
    show(viewport);
    expect(await screen.findByRole('link', { name: 'PeekJob, início' })).toHaveAttribute('href', '/');
    expect(screen.getByRole('link', { name: 'Explorar sem conta' })).toHaveAttribute('href', '/');
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent(viewport === 'desktop' ? 'Entrar' : 'Como é trabalhar lá dentro, contado por quem sabe.');
  });
});
