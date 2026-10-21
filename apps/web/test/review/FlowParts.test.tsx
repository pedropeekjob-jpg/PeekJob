import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState } from 'react';
import { MemoryRouter } from 'react-router';
import { describe, expect, it, vi } from 'vitest';
import { REVIEW_TAGS } from '../../src/data/content';
import { DeskSteps, FlowHead, LockLine, MiniSteps, NotesGrid, RecommendButtons, ScoreRow, TagPicker } from '../../src/features/review/FlowParts';

const inRouter = (ui: React.ReactElement) => render(<MemoryRouter>{ui}</MemoryRouter>);

function Score({ desktop = false }: { desktop?: boolean }) {
  const [v, setV] = useState(0);
  return <ScoreRow k="salario" value={v} onPick={(_k, n) => setV(n)} desktop={desktop} />;
}

describe('partes do fluxo de avaliar', () => {
  it.each([false, true])('nota: um só Tab por critério e setas/Home/End mudam a nota (computador: %s)', async (desktop) => {
    const user = userEvent.setup();
    render(<Score desktop={desktop} />);
    const radios = screen.getAllByRole('radio');
    expect(radios.map((r) => r.tabIndex)).toEqual([0, -1, -1, -1, -1]);
    await user.click(radios[2]);
    expect(radios[2]).toHaveAttribute('aria-checked', 'true');
    expect(radios.map((r) => r.tabIndex)).toEqual([-1, -1, 0, -1, -1]);
    await user.keyboard('{ArrowRight}');
    expect(radios[3]).toHaveAttribute('aria-checked', 'true');
    expect(radios[3]).toHaveFocus();
    await user.keyboard('{End}{ArrowUp}');
    expect(radios[4]).toHaveAttribute('aria-checked', 'true');
    await user.keyboard('{Home}{ArrowDown}{ArrowLeft}');
    expect(radios[0]).toHaveAttribute('aria-checked', 'true');
    expect(radios[0]).toHaveFocus();
    await user.keyboard('a'); // outras teclas não mudam nada
    expect(radios[0]).toHaveAttribute('aria-checked', 'true');
    await user.click(radios[0]); // tocar na escolhida tira-a
    expect(screen.queryByRole('radio', { checked: true })).not.toBeInTheDocument();
    expect(screen.getByRole('radiogroup', { name: 'Salário justo' })).toBeInTheDocument();
    expect(radios[1]).toHaveAccessibleName('Salário justo, 2 de 5');
  });

  it('recomendar: sim/não e tocar de novo tira', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    const { rerender } = render(<RecommendButtons value={null} onChange={onChange} />);
    await user.click(screen.getByRole('button', { name: 'Sim' }));
    expect(onChange).toHaveBeenLastCalledWith(true);
    rerender(<RecommendButtons value desktop onChange={onChange} />);
    expect(screen.getByRole('button', { name: 'Sim' })).toHaveAttribute('aria-pressed', 'true');
    await user.click(screen.getByRole('button', { name: 'Sim' }));
    expect(onChange).toHaveBeenLastCalledWith(null);
    await user.click(screen.getByRole('button', { name: 'Não' }));
    expect(onChange).toHaveBeenLastCalledWith(false);
  });

  it.each([false, true])('etiquetas: as visíveis, as escolhidas e "+N" que mostra todas (computador: %s)', async (desktop) => {
    const user = userEvent.setup();
    const onToggle = vi.fn();
    render(<TagPicker tags={['Sem contrato']} onToggle={onToggle} visible={3} badFirst desktop={desktop} />);
    const group = screen.getByRole('group', { name: 'O que se destaca?' });
    const names = () => within(group).getAllByRole('button', { pressed: undefined }).filter((b) => b.hasAttribute('aria-pressed')).map((b) => b.textContent);
    expect(names()).toEqual(['Salário em atraso', 'Horas extra não pagas', 'Sem contrato']);
    expect(within(group).getByRole('button', { name: 'Sem contrato' })).toHaveAttribute('aria-pressed', 'true');
    const total = 4 + REVIEW_TAGS.filter((t) => !['Salário em atraso', 'Horas extra não pagas', 'Sem contrato', 'Discriminação'].includes(t)).length;
    const more = within(group).getByRole('button', { name: `Ver mais ${total - 3} etiquetas` });
    expect(more).toHaveTextContent(`+${total - 3}`);
    await user.click(more);
    expect(names()).toHaveLength(total);
    expect(within(group).getByRole('button', { name: 'Mostrar menos etiquetas' })).toHaveAttribute('aria-expanded', 'true');
    await user.click(within(group).getByRole('button', { name: 'Discriminação' }));
    expect(onToggle).toHaveBeenCalledWith('Discriminação');
    await user.click(within(group).getByRole('button', { name: 'Mostrar menos etiquetas' }));
    expect(names()).toHaveLength(3);
  });

  it('etiquetas sem as más primeiro e sem nada escondido: sem "+N"', () => {
    render(<TagPicker tags={[]} onToggle={() => {}} visible={99} />);
    expect(screen.queryByRole('button', { name: /^Ver mais/ })).not.toBeInTheDocument();
    expect(screen.getAllByRole('button')[0]).toHaveTextContent(REVIEW_TAGS[0]);
  });

  it('passos no computador: feitos são botões (voltar a esse passo), o atual marcado', async () => {
    const onChange = vi.fn();
    inRouter(<DeskSteps current={2} onChange={onChange} right={<span>direita</span>} />);
    const steps = screen.getByRole('list', { name: 'Passo 2 de 3' });
    await userEvent.click(within(steps).getByRole('button', { name: 'Passo 1, Organização, feito' }));
    expect(onChange).toHaveBeenCalledTimes(1);
    expect(within(steps).getAllByRole('button')).toHaveLength(1);
    expect(within(steps).getAllByRole('listitem')[1]).toHaveAttribute('aria-current', 'step');
    expect(screen.getByText('direita')).toBeInTheDocument();
  });

  it('passos no computador: no primeiro, nenhum é botão', () => {
    inRouter(<DeskSteps current={1} />);
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
    expect(screen.getAllByRole('listitem').map((li) => li.textContent)).toEqual(['1Organização', '2Avaliação', '3Publicação']);
  });

  it('passos no computador: depois de publicar, os feitos já não são botões', () => {
    inRouter(<DeskSteps current={3} />);
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
    expect(screen.getAllByRole('listitem').map((li) => li.textContent)).toEqual(['Feito:Organização', 'Feito:Avaliação', '3Publicação']);
  });

  it('passos no telemóvel, cabeçalho, cadeado e grelha das notas', async () => {
    const user = userEvent.setup();
    const onClick = vi.fn();
    render(
      <>
        <MiniSteps current={2} done />
        <MiniSteps current={1} />
        <FlowHead icon="close" label="Fechar" onClick={onClick} right={<b>x</b>} />
        <LockLine center>Publicação anónima</LockLine>
        <NotesGrid scores={{ salario: 4, respeito: 0 }} />
        <NotesGrid scores={{}} desktop />
      </>,
    );
    expect(screen.getByRole('img', { name: 'Passo 2 de 3, concluído' })).toHaveTextContent('2/3');
    expect(screen.getByRole('img', { name: 'Passo 1 de 3' })).toHaveTextContent('1/3');
    await user.click(screen.getByRole('button', { name: 'Fechar' }));
    expect(onClick).toHaveBeenCalled();
    expect(screen.getByText('Publicação anónima')).toBeInTheDocument();
    expect(screen.getByText('Salário justo: 4 de 5')).toBeInTheDocument();
    expect(screen.getAllByText('Respeito e inclusão: sem nota')).toHaveLength(2);
  });
});
