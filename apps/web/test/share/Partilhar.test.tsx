import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes, useNavigate, useParams } from 'react-router';
import { beforeEach, describe, expect, it } from 'vitest';
import { FlowReturn } from '../../src/features/review/FlowReturn';
import { LangRoot } from '../../src/i18n';
import { StoreProvider } from '../../src/lib/store';
import Partilhar from '../../src/pages/Partilhar';
import { setViewport } from '../utils/render';

/** A página da organização a fingir: mostra o separador e o que lá está */
function Org() {
  const { tab } = useParams();
  const nav = useNavigate();
  return (
    <>
      <h1>org {tab}</h1>
      <button type="button" onClick={() => nav(-1)}>
        voltar do browser
      </button>
    </>
  );
}

function show(viewport: 'mobile' | 'desktop', path: string, from = '/org/padaria-ribeira/salarios') {
  setViewport(viewport);
  const user = userEvent.setup();
  render(
    <StoreProvider>
      <LangRoot>
        <MemoryRouter initialEntries={['/pesquisa', from, path]} initialIndex={2}>
          <Routes>
            <Route path="/pesquisa" element={<h1>lista</h1>} />
            <Route path="/org/:id/:tab" element={<Org />} />
            <Route path="/partilhar/:kind" element={<Partilhar />} />
          </Routes>
          <FlowReturn />
        </MemoryRouter>
      </LangRoot>
    </StoreProvider>,
  );
  return user;
}

describe.each(['mobile', 'desktop'] as const)('Partilhar (%s)', (viewport) => {
  beforeEach(() => localStorage.clear());

  it('salário: função e valor chegam; partilhado, "Ver na página" volta ao separador dos salários e o voltar seguinte à lista', async () => {
    const user = show(viewport, '/partilhar/salario?org=padaria-ribeira');
    expect(screen.getByRole('heading', { level: 1, name: 'O teu salário na Padaria Ribeira' })).toBeInTheDocument();
    const submit = screen.getByRole('button', { name: 'Partilhar salário' });
    expect(submit).toBeDisabled();
    await user.type(screen.getByLabelText('Função'), 'Balcão');
    await user.type(screen.getByLabelText('Salário bruto por mês'), '50');
    expect(screen.getByText(/Escreve o salário bruto mensal/)).toBeInTheDocument();
    expect(submit).toBeDisabled();
    await user.clear(screen.getByLabelText('Salário bruto por mês'));
    await user.type(screen.getByLabelText('Salário bruto por mês'), '1.000');
    await user.click(screen.getByRole('button', { name: 'Sim' }));
    expect(screen.getByRole('button', { name: 'Sim' })).toHaveAttribute('aria-pressed', 'true');
    await user.click(submit);
    expect(await screen.findByRole('heading', { level: 1, name: 'Partilhado. Obrigado.' })).toBeInTheDocument();
    await user.click(screen.getByRole('link', { name: 'Ver na página da organização' }));
    expect(await screen.findByRole('heading', { level: 1, name: 'org salarios' })).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'voltar do browser' }));
    expect(await screen.findByRole('heading', { level: 1, name: 'lista' })).toBeInTheDocument();
  });

  it('entrevista: só se partilha com o essencial; oferta implica resposta; uma por organização', async () => {
    const user = show(viewport, '/partilhar/entrevista?org=padaria-ribeira', '/org/padaria-ribeira/entrevistas');
    const submit = screen.getByRole('button', { name: 'Partilhar entrevista' });
    await user.type(screen.getByLabelText('Função'), 'Pastelaria');
    await user.click(screen.getByRole('button', { name: 'Correu bem' }));
    await user.click(screen.getByRole('button', { name: 'Dia de experiência' }));
    expect(submit).toBeDisabled();
    const offer = screen.getByRole('group', { name: 'Fizeram-te uma oferta?' });
    await user.click(screen.getAllByRole('button', { name: 'Sim' }).find((b) => offer.contains(b))!);
    expect(screen.queryByRole('group', { name: 'Deram resposta?' })).not.toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Dificuldade 3 de 5' }));
    await user.type(screen.getByLabelText(/Como foi o processo/), 'Explicaram tudo.');
    expect(submit).toBeEnabled();
    await user.click(submit);
    expect(await screen.findByRole('heading', { level: 1, name: 'Partilhado. Obrigado.' })).toBeInTheDocument();
  });

  it('entrevista: nomes ou insultos no comentário não deixam partilhar', async () => {
    const user = show(viewport, '/partilhar/entrevista?org=padaria-ribeira', '/org/padaria-ribeira/entrevistas');
    await user.type(screen.getByLabelText('Função'), 'Balcão');
    await user.click(screen.getByRole('button', { name: 'Correu mal' }));
    await user.click(screen.getByRole('button', { name: 'Conversa' }));
    const offer = screen.getByRole('group', { name: 'Fizeram-te uma oferta?' });
    await user.click(screen.getAllByRole('button', { name: 'Não' }).find((b) => offer.contains(b))!);
    expect(screen.getByRole('group', { name: 'Deram resposta?' })).toBeInTheDocument();
    await user.type(screen.getByLabelText(/Como foi o processo/), 'O Ricardo é um idiota.');
    expect(screen.getByRole('button', { name: 'Partilhar entrevista' })).toBeDisabled();
    expect(screen.getByText('Sem nomes nem insultos: descreve o que aconteceu.')).toBeInTheDocument();
  });

  it('fechar volta à organização', async () => {
    const user = show(viewport, '/partilhar/salario?org=padaria-ribeira');
    await user.click(screen.getByRole('button', { name: /^(Fechar|Cancelar)/ }));
    expect(await screen.findByRole('heading', { level: 1, name: 'org salarios' })).toBeInTheDocument();
  });

  it('organização que não existe ou tipo desconhecido', () => {
    show(viewport, '/partilhar/salario?org=nao-existe');
    expect(screen.getByRole('heading', { name: 'Não encontrámos esta organização.' })).toBeInTheDocument();
  });
});

describe('Partilhar: segunda entrevista na mesma organização', () => {
  beforeEach(() => localStorage.clear());
  it('diz que já foi partilhada', async () => {
    const fill = async (user: ReturnType<typeof userEvent.setup>) => {
      await user.type(screen.getByLabelText('Função'), 'Balcão');
      await user.click(screen.getByRole('button', { name: 'Correu bem' }));
      await user.click(screen.getByRole('button', { name: 'Conversa' }));
      const offer = screen.getByRole('group', { name: 'Fizeram-te uma oferta?' });
      await user.click(screen.getAllByRole('button', { name: 'Não' }).find((b) => offer.contains(b))!);
      await user.click(screen.getByRole('button', { name: 'Partilhar entrevista' }));
    };
    let user = show('mobile', '/partilhar/entrevista?org=padaria-ribeira');
    await fill(user);
    await screen.findByRole('heading', { level: 1, name: 'Partilhado. Obrigado.' });
    cleanup();
    user = show('mobile', '/partilhar/entrevista?org=padaria-ribeira');
    await fill(user);
    expect(await screen.findByRole('alert')).toHaveTextContent('Já partilhaste uma entrevista nesta organização.');
  });
});
