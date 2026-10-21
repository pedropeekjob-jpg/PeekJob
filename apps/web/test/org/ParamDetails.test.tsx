import { render, screen, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { ORG_BY_ID } from '../../src/data/orgs';
import { ExtrasSummary } from '../../src/features/org/Criteria';
import { ReviewDetails } from '../../src/features/org/Reviews';

describe('página da organização: parâmetros e comentários (21/10)', () => {
  it('comentários por critério com a nota, e respostas aos parâmetros (Sim/Não ou de 1 a 5)', () => {
    render(
      <ReviewDetails
        r={{ scores: { ambiente: 4 }, extras: { gorjetas: false, folgas_escala: 2 }, comments: { ambiente: 'Entreajuda.', gorjetas: 'Ficam para a casa.' } }}
      />,
    );
    const items = screen.getAllByRole('term').map((t) => t.textContent);
    expect(items).toEqual(['Ambiente · 4 de 5', 'Gorjetas para a equipa · Não', 'Folgas e escalas · 2 de 5']);
    expect(screen.getByText('Entreajuda.')).toBeInTheDocument();
    expect(screen.getByText('Ficam para a casa.')).toBeInTheDocument();
  });

  it('sem comentários nem parâmetros não mostra nada', () => {
    const { container } = render(<ReviewDetails r={{ scores: { ambiente: 4 }, extras: {}, comments: {} }} />);
    expect(container).toBeEmptyDOMElement();
  });

  it('resumo "No dia a dia": % de sim e média, com o nº de respostas', () => {
    const org = { ...ORG_BY_ID['padaria-ribeira'], extras: [{ key: 'gorjetas' as const, n: 3, yesPct: 67 }, { key: 'folgas_escala' as const, n: 4, avg: 3.5 }] };
    render(<ExtrasSummary org={org} />);
    const section = screen.getByRole('heading', { name: 'No dia a dia' }).closest('section')!;
    const rows = within(section).getAllByRole('listitem').map((li) => li.textContent);
    expect(rows).toEqual(['Gorjetas para a equipa67% dizem que sim · 3 respostas', 'Folgas e escalas3,5 de 5 · 4 respostas']);
  });

  it('comissões: a opção de cada avaliação e, no resumo, as escolhidas da mais à menos', () => {
    render(<ReviewDetails r={{ scores: {}, extras: { comissoes: 'base_comissao' }, comments: {} }} />);
    expect(screen.getByRole('term')).toHaveTextContent('Como te pagam · Base + comissão');
    const org = { ...ORG_BY_ID['padaria-ribeira'], extras: [{ key: 'comissoes' as const, n: 3, choices: [{ value: 'so_ordenado', pct: 0 }, { value: 'base_comissao', pct: 33 }, { value: 'so_comissao', pct: 67 }] }] };
    render(<ExtrasSummary org={org} />);
    expect(screen.getByRole('listitem')).toHaveTextContent('Como te pagamSó comissão 67% · Base + comissão 33% · 3 respostas');
  });

  it('sem respostas suficientes não há resumo', () => {
    const { container } = render(<ExtrasSummary org={{ ...ORG_BY_ID['padaria-ribeira'], extras: [] }} />);
    expect(container).toBeEmptyDOMElement();
  });
});
