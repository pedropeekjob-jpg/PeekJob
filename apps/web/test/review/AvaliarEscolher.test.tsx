import { screen, within } from '@testing-library/react';
import { useLocation } from 'react-router-dom';
import { beforeEach, describe, expect, it } from 'vitest';
import AvaliarEscolher from '../../src/pages/AvaliarEscolher';
import { useStore } from '../../src/lib/store';
import { renderScreen, WithoutDraft } from '../utils/render';

/** Mostra o rascunho para confirmar o que ficou escolhido */
function DraftProbe() {
  const { draft } = useStore();
  const { pathname } = useLocation();
  return (
    <>
      <output data-testid="draft">{`${draft.orgId ?? ''}|${draft.locationId ?? ''}`}</output>
      <output data-testid="where">{pathname}</output>
    </>
  );
}
const show = (viewport: 'mobile' | 'desktop', route = '/avaliar') =>
  renderScreen(<WithoutDraft><AvaliarEscolher /></WithoutDraft>, { route, path: '/avaliar', viewport, outside: <DraftProbe /> });

describe.each(['mobile', 'desktop'] as const)('Avaliar · escolher organização (%s)', (viewport) => {
  beforeEach(() => localStorage.clear());

  it('procura, escolhe a organização e o local (vários), e continua para as notas', async () => {
    const { user } = show(viewport);
    await user.type(screen.getByRole('searchbox', { name: /Nome da organização/ }), 'padaria');
    await user.click(await screen.findByRole('button', { name: /Padaria Ribeira/ }));
    const places = await screen.findByRole('radiogroup', { name: 'Local de trabalho' });
    const radios = within(places).getAllByRole('radio');
    expect(radios.length).toBeGreaterThan(1);
    expect(radios[0]).toHaveAttribute('aria-checked', 'true');
    await user.click(radios[1]);
    expect(radios[1]).toHaveAttribute('aria-checked', 'true');
    await user.click(screen.getByRole('button', { name: /^Continuar/ }));
    expect(await screen.findByTestId('outra-rota')).toBeInTheDocument();
    expect(screen.getByTestId('where')).toHaveTextContent('/avaliar/notas');
    expect(screen.getByTestId('draft').textContent).toMatch(/^padaria-ribeira\|.+/);
  });

  it('sem resultados: explica e deixa adicionar', async () => {
    const { user } = show(viewport);
    await user.type(screen.getByRole('searchbox', { name: /Nome da organização/ }), 'zzzz nada');
    expect(await screen.findByText(/Não encontrámos «zzzz nada»/)).toBeInTheDocument();
  });

  it('adicionar: valida nome, localidade e NIF; nome individual exige NIF', async () => {
    const { user } = show(viewport);
    await user.type(screen.getByRole('searchbox', { name: /Nome da organização/ }), 'Horta da Sé');
    await user.click(screen.getByRole('button', { name: /Adicionar organização que não está cá|Não encontras/ }));
    expect(screen.getByRole('textbox', { name: 'Nome' })).toHaveValue('Horta da Sé');
    const submit = () => user.click(screen.getByRole('button', { name: /Adicionar e continuar/ }));
    await submit();
    expect(screen.getByRole('alert')).toHaveTextContent('Escreve a localidade.');
    await user.type(screen.getByRole('textbox', { name: /localidade/i }), 'Porto');
    await user.type(screen.getByRole('textbox', { name: /NIF/ }), '123');
    await submit();
    expect(screen.getByRole('alert')).toHaveTextContent('O NIF não é válido.');
    await user.clear(screen.getByRole('textbox', { name: /NIF/ }));
    await user.selectOptions(screen.getByRole('combobox', { name: 'Tipo' }), 'Nome individual');
    await submit();
    expect(screen.getByRole('alert')).toHaveTextContent(/o NIF é obrigatório/);
    await user.type(screen.getByRole('textbox', { name: /NIF/ }), '200000004');
    await submit();
    expect(await screen.findByTestId('outra-rota')).toBeInTheDocument();
    expect(screen.getByTestId('draft').textContent).toMatch(/^nova-horta-da-se\|sede$/);
  });

  it('nome em falta', async () => {
    const { user } = show(viewport);
    await user.click(screen.getByRole('button', { name: /Adicionar organização que não está cá|Não encontras/ }));
    await user.click(screen.getByRole('button', { name: /Adicionar e continuar/ }));
    expect(screen.getByRole('alert')).toHaveTextContent('Escreve o nome da organização.');
    await user.click(screen.getByRole('button', { name: 'Voltar à pesquisa' }));
    expect(screen.getByRole('searchbox', { name: /Nome da organização/ })).toBeInTheDocument();
  });

  it('organização com um só local: escolher leva logo às notas (sem perguntar o local)', async () => {
    const { user } = show(viewport);
    await user.type(screen.getByRole('searchbox', { name: /Nome da organização/ }), 'oficina sete');
    await user.click(await screen.findByRole('button', { name: /Oficina Sete/ }));
    expect(await screen.findByTestId('outra-rota')).toBeInTheDocument();
    expect(screen.getByTestId('where')).toHaveTextContent('/avaliar/notas');
    expect(screen.getByTestId('draft').textContent).toMatch(/^oficina-sete\|.+/);
  });

  it('?q= (vindo da página inicial): a pesquisa já vem escrita', async () => {
    show(viewport, '/avaliar?q=padaria');
    expect(screen.getByRole('searchbox', { name: /Nome da organização/ })).toHaveValue('padaria');
    expect(await screen.findByRole('button', { name: /Padaria Ribeira/ })).toBeInTheDocument();
  });

  it('?org= com um só local: começa logo nas notas', async () => {
    show(viewport, '/avaliar?org=oficina-sete');
    expect(await screen.findByTestId('outra-rota')).toBeInTheDocument();
    expect(screen.getByTestId('where')).toHaveTextContent('/avaliar/notas');
    expect(screen.getByTestId('draft').textContent).toMatch(/^oficina-sete\|/);
  });

  it('pré-seleção por ?org=: abre logo a escolha do local', async () => {
    show(viewport, '/avaliar?org=padaria-ribeira');
    expect(await screen.findByRole('radiogroup', { name: 'Local de trabalho' })).toBeInTheDocument();
  });
});

describe('Avaliar · escolher organização (telemóvel): trocar de organização', () => {
  beforeEach(() => localStorage.clear());
  it('na escolha do local há "Escolher outra organização", que volta à pesquisa', async () => {
    const { user } = show('mobile', '/avaliar?org=padaria-ribeira');
    await user.click(await screen.findByRole('button', { name: 'Escolher outra organização' }));
    expect(screen.getByRole('searchbox', { name: /Nome da organização/ })).toBeInTheDocument();
  });
});
