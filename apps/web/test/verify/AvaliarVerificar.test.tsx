import { screen, within } from '@testing-library/react';
import { beforeEach, describe, expect, it } from 'vitest';
import { useStore } from '../../src/lib/store';
import AvaliarVerificar from '../../src/pages/AvaliarVerificar';
import { renderScreen, WithDraft } from '../utils/render';

function DraftProbe() {
  const { draft } = useStore();
  return <output data-testid="verified">{String(draft.verified ?? '')}</output>;
}
const show = (viewport: 'mobile' | 'desktop', patch = {}) =>
  renderScreen(
    <WithDraft patch={patch}>
      <AvaliarVerificar />
    </WithDraft>,
    { route: '/avaliar/verificar', path: '/avaliar/verificar', viewport, outside: <DraftProbe /> },
  );
const digits = () => screen.getAllByRole('textbox', { name: /Dígito \d de 6/ });

describe.each(['mobile', 'desktop'] as const)('Avaliar · verificar (%s)', (viewport) => {
  beforeEach(() => localStorage.clear());
  const confirmLabel = viewport === 'desktop' ? 'Confirmar e continuar' : 'Confirmar e começar';
  const sendCode = async (user: ReturnType<typeof show>['user'], email = 'ana@padaria.pt') => {
    await user.type(screen.getByRole('textbox', { name: /Email (do trabalho|da organização)/ }), email);
    await user.keyboard('{Enter}');
  };

  it('email inválido: explica; válido: passa ao código com 6 dígitos', async () => {
    const { user } = show(viewport);
    await sendCode(user, 'ana');
    expect(await screen.findByRole('alert')).toHaveTextContent(/Escreve um email válido/);
    await user.clear(screen.getByRole('textbox', { name: /Email/ }));
    await sendCode(user);
    expect(await screen.findByText('ana@padaria.pt')).toBeInTheDocument();
    expect(digits()).toHaveLength(6);
    expect(screen.getByText('Faltam 6 dígitos · expira em 10 min')).toBeInTheDocument();
  });

  it('código: escrever avança, colar preenche tudo, confirmar marca como verificado por email', async () => {
    const { user } = show(viewport);
    await sendCode(user);
    await user.type(digits()[0], '1');
    expect(digits()[1]).toHaveFocus();
    await user.click(digits()[0]);
    await user.paste('123456');
    expect(digits().map((d) => (d as HTMLInputElement).value).join('')).toBe('123456');
    expect(screen.getByText('Código completo.')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: confirmLabel }));
    expect(await screen.findByTestId('outra-rota')).toBeInTheDocument();
    expect(screen.getByTestId('verified')).toHaveTextContent('email');
  });

  it('código: setas e apagar movem entre dígitos', async () => {
    const { user } = show(viewport);
    await sendCode(user);
    await user.click(digits()[2]);
    await user.keyboard('{ArrowLeft}');
    expect(digits()[1]).toHaveFocus();
    await user.keyboard('{ArrowRight}{ArrowRight}');
    expect(digits()[3]).toHaveFocus();
    await user.keyboard('{Backspace}');
    expect(digits()[2]).toHaveFocus();
  });

  it('reenviar limpa o código; mudar email volta atrás', async () => {
    const { user } = show(viewport);
    await sendCode(user);
    await user.click(digits()[0]);
    await user.paste('12');
    await user.click(screen.getByRole('button', { name: 'Reenviar código' }));
    expect(screen.getByText(/Código novo enviado/)).toBeInTheDocument();
    expect(digits().every((d) => (d as HTMLInputElement).value === '')).toBe(true);
    await user.click(screen.getByRole('button', { name: 'Mudar email' }));
    expect(screen.getByRole('textbox', { name: /Email/ })).toHaveValue('ana@padaria.pt');
  });

  it('documento: escolher o ficheiro e continuar marca como verificado por documento', async () => {
    const { user } = show(viewport);
    await user.click(screen.getByRole('tab', { name: /Documento|Contrato ou recibo/ }));
    const panel = screen.getByRole('tabpanel');
    expect(within(panel).getByText(/Escolher foto ou PDF/)).toBeInTheDocument();
    await user.upload(within(panel).getByLabelText(/Escolher foto ou PDF/), new File(['%PDF'], 'recibo.pdf', { type: 'application/pdf' }));
    expect(within(panel).getByText('recibo.pdf')).toBeInTheDocument();
    expect(within(panel).getByRole('status')).toHaveTextContent(/Só lemos o NIF e a data/);
    await user.click(screen.getByRole('button', { name: /^Continuar/ }));
    expect(await screen.findByTestId('outra-rota')).toBeInTheDocument();
    expect(screen.getByTestId('verified')).toHaveTextContent('documento');
  });

  it('saltar a verificação', async () => {
    const { user } = show(viewport);
    await user.click(screen.getByRole('button', { name: /^(Saltar|Avaliar sem verificar)$/ }));
    expect(await screen.findByTestId('outra-rota')).toBeInTheDocument();
    expect(screen.getByTestId('verified')).toHaveTextContent('');
  });

  it('já verificado: diz como e deixa continuar', async () => {
    const { user } = show(viewport, { verified: 'documento' });
    expect(await screen.findByText(/Já confirmaste com documento/)).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: /^Continuar/ }));
    expect(await screen.findByTestId('outra-rota')).toBeInTheDocument();
  });
});
