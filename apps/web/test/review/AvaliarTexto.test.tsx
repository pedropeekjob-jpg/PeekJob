import { screen } from '@testing-library/react';
import { beforeEach, describe, expect, it } from 'vitest';
import AvaliarTexto from '../../src/pages/AvaliarTexto';
import { renderScreen, WithDraft } from '../utils/render';

const show = (patch = {}) =>
  renderScreen(
    <WithDraft patch={{ scores: { ambiente: 3 }, ...patch }}>
      <AvaliarTexto />
    </WithDraft>,
    { route: '/avaliar/texto', path: '/avaliar/texto' },
  );

describe('Avaliar · passo 2 (texto, telemóvel)', () => {
  beforeEach(() => localStorage.clear());

  it('mostra o título, as etiquetas e o contador', async () => {
    show();
    expect(await screen.findByRole('heading', { level: 1, name: /Conta como é/ })).toBeInTheDocument();
    expect(screen.getAllByRole('group', { name: /O que se destaca/ })[0]).toBeInTheDocument();
    expect(screen.getByText('0/600')).toBeInTheDocument();
  });

  it('texto com insulto: aviso, botão bloqueado e reescrita que substitui o texto', async () => {
    const { user } = show();
    await user.type(await screen.findByRole('textbox', { name: /A tua experiência/ }), 'O Ricardo é um idiota.');
    expect(screen.getByText('Sem nomes nem insultos')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Corrige a frase para publicar/ })).toBeDisabled();
    await user.click(screen.getByRole('button', { name: /Reescrever com IA/ }));
    await user.click(await screen.findByRole('button', { name: 'Usar esta versão' }));
    expect((screen.getByRole('textbox', { name: /A tua experiência/ }) as HTMLTextAreaElement).value).not.toMatch(/Ricardo|idiota/);
    expect(screen.getByRole('button', { name: /Publicar avaliação/ })).toBeEnabled();
  });

  it('possível ilegalidade: cartão de apoio com ligação para pedir ajuda', async () => {
    const { user } = show();
    await user.type(await screen.findByRole('textbox', { name: /A tua experiência/ }), 'O salário chega sempre atrasado.');
    expect(screen.getByText('Isto pode ser uma ilegalidade')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Pedir ajuda' })).toHaveAttribute('href', '/apoio');
  });

  it('texto limpo: "Tudo certo" e publicar leva a "feito"', async () => {
    const { user } = show();
    await user.type(await screen.findByRole('textbox', { name: /A tua experiência/ }), 'Equipa unida.');
    expect(screen.getByText('Tudo certo para publicar.')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: /Publicar avaliação/ }));
    expect(await screen.findByTestId('outra-rota')).toBeInTheDocument();
  });

  it('sem notas: avisa e liga às notas', async () => {
    show({ scores: {} });
    expect(await screen.findByText(/Falta pelo menos uma nota/)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Voltar às notas' })).toHaveAttribute('href', '/avaliar/notas');
  });
});
