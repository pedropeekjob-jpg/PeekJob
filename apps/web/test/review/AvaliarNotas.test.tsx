import { screen, within } from '@testing-library/react';
import { beforeEach, describe, expect, it } from 'vitest';
import AvaliarNotas from '../../src/pages/AvaliarNotas';
import { renderScreen, WithDraft } from '../utils/render';

const show = (viewport: 'mobile' | 'desktop', patch = {}) =>
  renderScreen(
    <WithDraft patch={{ scores: {}, ...patch }}>
      <AvaliarNotas />
    </WithDraft>,
    { route: '/avaliar/notas', path: '/avaliar/notas', viewport },
  );

describe('Avaliar · notas e publicar (telemóvel, passo 2 de 3)', () => {
  beforeEach(() => localStorage.clear());

  it('8 critérios; publicar só com pelo menos uma nota; contador; publica dali, sem passo extra', async () => {
    const { user } = show('mobile');
    expect(await screen.findByRole('heading', { level: 1, name: /Dá uma nota de 1 a 5/ })).toBeInTheDocument();
    expect(screen.getByRole('img', { name: 'Passo 2 de 3' })).toBeInTheDocument();
    expect(screen.getAllByRole('radiogroup')).toHaveLength(8);
    expect(screen.getByRole('button', { name: /Dá pelo menos uma nota/ })).toBeDisabled();
    await user.click(screen.getByRole('radio', { name: 'Ambiente, 4 de 5' }));
    expect(screen.getByRole('radio', { name: 'Ambiente, 4 de 5' })).toHaveAttribute('aria-checked', 'true');
    const publish = screen.getByRole('button', { name: /Publicar avaliação/ });
    expect(publish).toHaveTextContent('1/8');
    await user.click(publish);
    expect(await screen.findByTestId('outra-rota')).toBeInTheDocument();
  });

  it('comentário opcional: fechado por omissão; abre com etiquetas e contador', async () => {
    const { user } = show('mobile', { scores: { ambiente: 3 } });
    const toggle = await screen.findByRole('button', { name: /Contar como é \(opcional\)/ });
    expect(toggle).toHaveAttribute('aria-expanded', 'false');
    expect(screen.queryByRole('textbox')).not.toBeInTheDocument();
    await user.click(toggle);
    expect(screen.getByRole('group', { name: /O que se destaca/ })).toBeInTheDocument();
    expect(screen.getByText('0/600')).toBeInTheDocument();
  });

  it('comentário já escrito: aparece aberto', async () => {
    show('mobile', { scores: { ambiente: 3 }, text: 'Equipa unida.' });
    expect(await screen.findByRole('textbox', { name: /A tua experiência/ })).toHaveValue('Equipa unida.');
    expect(screen.getByText('Tudo certo para publicar.')).toBeInTheDocument();
  });

  it('texto com insulto: aviso, botão bloqueado e reescrita que substitui o texto', async () => {
    const { user } = show('mobile', { scores: { ambiente: 3 } });
    await user.click(await screen.findByRole('button', { name: /Contar como é/ }));
    await user.type(screen.getByRole('textbox', { name: /A tua experiência/ }), 'O Ricardo é um idiota.');
    expect(screen.getByText('Sem nomes nem insultos')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Corrige a frase para publicar/ })).toBeDisabled();
    await user.click(screen.getByRole('button', { name: /Reescrever com IA/ }));
    await user.click(await screen.findByRole('button', { name: 'Usar esta versão' }));
    expect((screen.getByRole('textbox', { name: /A tua experiência/ }) as HTMLTextAreaElement).value).not.toMatch(/Ricardo|idiota/);
    expect(screen.getByRole('button', { name: /Publicar avaliação/ })).toBeEnabled();
  });

  it('possível ilegalidade: cartão de apoio sem botão que tire a pessoa do fluxo', async () => {
    const { user } = show('mobile', { scores: { ambiente: 3 } });
    await user.click(await screen.findByRole('button', { name: /Contar como é/ }));
    await user.type(screen.getByRole('textbox', { name: /A tua experiência/ }), 'O salário chega sempre atrasado.');
    expect(screen.getByText('Isto pode ser uma ilegalidade')).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'Pedir ajuda' })).not.toBeInTheDocument();
    expect(screen.getByText(/Depois de publicares, mostramos-te onde pedir ajuda/)).toBeInTheDocument();
  });

  it('clicar na nota escolhida tira-a', async () => {
    const { user } = show('mobile', { scores: { ambiente: 4 } });
    await user.click(await screen.findByRole('radio', { name: 'Ambiente, 4 de 5' }));
    expect(screen.getByRole('radio', { name: 'Ambiente, 4 de 5' })).toHaveAttribute('aria-checked', 'false');
  });

  it('ajuda por critério abre e fecha', async () => {
    const { user } = show('mobile');
    const help = await screen.findByRole('button', { name: 'O que conta em Ambiente' });
    await user.click(help);
    expect(help).toHaveAttribute('aria-expanded', 'true');
  });

  it('recomendar a um amigo', async () => {
    const { user } = show('mobile');
    const group = await screen.findByRole('group', { name: /Recomendavas a um amigo/ });
    await user.click(within(group).getByRole('button', { name: /^Sim/ }));
    expect(within(group).getByRole('button', { name: /^Sim/ })).toHaveAttribute('aria-pressed', 'true');
  });
});

describe('Avaliar · notas e texto (computador, ecrã único)', () => {
  beforeEach(() => localStorage.clear());

  it('notas, nota média e publicar', async () => {
    const { user } = show('desktop');
    expect(await screen.findByRole('heading', { level: 1, name: /Como é trabalhar lá/ })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Dá pelo menos uma nota/ })).toBeDisabled();
    await user.click(screen.getByRole('radio', { name: 'Salário justo, 5 de 5' }));
    expect(screen.getByRole('img', { name: 'Nota média 5,0 de 5' })).toBeInTheDocument();
    expect(screen.getByText(/1 de 8 notas/)).toBeInTheDocument();
    await user.type(screen.getByRole('textbox', { name: /A tua experiência/ }), 'Equipa unida.');
    expect(screen.getByText('Tudo certo para publicar.')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Publicar avaliação' }));
    expect(await screen.findByTestId('outra-rota')).toBeInTheDocument();
  });

  it('possível ilegalidade: cartão com o que foi encontrado', async () => {
    const { user } = show('desktop', { scores: { ambiente: 2 } });
    await user.type(await screen.findByRole('textbox', { name: /A tua experiência/ }), 'O salário chega sempre atrasado.');
    const alert = screen.getByRole('status', { name: 'Apoio' });
    expect(alert).toHaveTextContent(/Salário em atraso: pode ser incumprimento salarial/);
    expect(within(alert).queryByRole('link')).not.toBeInTheDocument();
  });

  it('insulto bloqueia o botão', async () => {
    const { user } = show('desktop', { scores: { ambiente: 2 } });
    await user.type(await screen.findByRole('textbox', { name: /A tua experiência/ }), 'O Ricardo é idiota.');
    expect(screen.getByRole('button', { name: /Corrige a frase para publicar/ })).toBeDisabled();
  });
});
