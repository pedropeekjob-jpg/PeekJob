import { screen, within } from '@testing-library/react';
import { useLocation } from 'react-router';
import { beforeEach, describe, expect, it } from 'vitest';
import { emptyJob, useStore } from '../../src/lib/store';
import AvaliarCargo from '../../src/pages/AvaliarCargo';
import { renderScreen, WithDraft } from '../utils/render';

function Probe() {
  const { draft } = useStore();
  const { pathname } = useLocation();
  return (
    <>
      <output data-testid="job">{JSON.stringify(draft.job)}</output>
      <output data-testid="where">{pathname}</output>
    </>
  );
}
const show = (viewport: 'mobile' | 'desktop', orgId = 'padaria-ribeira') =>
  renderScreen(
    <WithDraft orgId={orgId} patch={{ job: emptyJob() }}>
      <AvaliarCargo />
    </WithDraft>,
    { route: '/avaliar/cargo', path: '/avaliar/cargo', viewport, outside: <Probe /> },
  );
const job = () => JSON.parse(screen.getByTestId('job').textContent!);
const next = () => screen.getByRole('button', { name: /^Continuar/ });

describe.each(['mobile', 'desktop'] as const)('Avaliar · o teu trabalho lá (%s)', (viewport) => {
  beforeEach(() => localStorage.clear());

  it('pede o cargo e o período antes das notas, pela ordem dos campos', async () => {
    const { user } = show(viewport);
    expect(await screen.findByRole('heading', { level: 1, name: 'O teu trabalho lá' })).toBeInTheDocument();
    expect(screen.getByText(/Padaria Ribeira/)).toBeInTheDocument();
    await user.click(next());
    expect(screen.getByRole('alert')).toHaveTextContent('Escreve o teu cargo ou função.');
    // os cargos que já há nesta organização escolhem-se com um toque
    await user.click(within(screen.getByRole('group', { name: 'Cargos nesta organização' })).getByRole('button', { name: 'Pastelaria' }));
    expect(screen.getByRole('combobox', { name: 'Cargo ou função' })).toHaveValue('Pastelaria');
    await user.click(next());
    expect(screen.getByRole('alert')).toHaveTextContent('Diz se ainda trabalhas lá.');
    await user.click(screen.getByRole('button', { name: 'Já saí' }));
    await user.selectOptions(screen.getByRole('combobox', { name: 'Entrei em' }), '2019');
    await user.click(next());
    expect(screen.getByRole('alert')).toHaveTextContent('Escolhe o ano em que saíste.');
    // a saída só deixa escolher anos depois da entrada
    const to = screen.getByRole('combobox', { name: 'Saí em' });
    expect(within(to).queryByRole('option', { name: '2018' })).not.toBeInTheDocument();
    await user.selectOptions(to, '2021');
    await user.click(next());
    expect(await screen.findByTestId('outra-rota')).toBeInTheDocument();
    expect(screen.getByTestId('where')).toHaveTextContent('/avaliar/notas');
    expect(job()).toEqual({ role: 'Pastelaria', current: false, from: 2019, to: 2021 });
  });

  it('"ainda trabalho lá" só pede o ano de entrada e tira o de saída', async () => {
    const { user } = show(viewport);
    await user.type(await screen.findByRole('combobox', { name: 'Cargo ou função' }), 'Balcão');
    await user.click(screen.getByRole('button', { name: 'Já saí' }));
    await user.selectOptions(screen.getByRole('combobox', { name: 'Entrei em' }), '2020');
    await user.selectOptions(screen.getByRole('combobox', { name: 'Saí em' }), '2022');
    await user.click(screen.getByRole('button', { name: 'Sim, trabalho lá' }));
    expect(screen.getByRole('button', { name: 'Sim, trabalho lá' })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.queryByRole('combobox', { name: 'Saí em' })).not.toBeInTheDocument();
    expect(screen.getByRole('combobox', { name: 'Desde' })).toHaveValue('2020');
    expect(job()).toMatchObject({ current: true, to: null });
  });

  it('diz que em público só aparece o cargo e há quanto tempo', async () => {
    show(viewport);
    expect(await screen.findByText(/só aparece o cargo e há quanto tempo/)).toBeInTheDocument();
  });
});

describe('cargo e período: regras e textos', async () => {
  const { jobError, jobInput, periodText, tenureText } = await import('../../src/features/review/job');
  const full = { role: ' Balcão ', current: false, from: 2019, to: 2021 };

  it('completo vai para a API sem espaços; incompleto não vai', () => {
    expect(jobInput(full)).toEqual({ role: 'Balcão', current: false, from: 2019, to: 2021 });
    expect(jobInput({ ...full, current: true })).toEqual({ role: 'Balcão', current: true, from: 2019, to: null });
    expect(jobInput({ ...full, to: 2018 })).toBeNull();
    expect(jobError({ ...full, to: 2018 })).toBe('O ano de saída é antes do de entrada.');
  });

  it('em público: cargo e escalão; para a própria pessoa: os anos', () => {
    expect(tenureText({ role: 'Balcão', current: true, tenure: '1to3' })).toBe('trabalha lá · 1 a 3 anos');
    expect(tenureText({ role: 'Balcão', current: false, tenure: 'gt3' })).toBe('já saiu · mais de 3 anos');
    expect(periodText({ current: true, from: 2022, to: null })).toBe('desde 2022');
    expect(periodText({ current: false, from: 2019, to: 2021 })).toBe('2019 a 2021');
    expect(periodText({ current: false, from: 2020, to: 2020 })).toBe('2020');
  });
});
