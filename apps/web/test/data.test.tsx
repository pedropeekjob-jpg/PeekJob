import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it } from 'vitest';
import { CriterionRow, Dots, MatchPill, OrgCard, OrgRow, Ring, Trend } from '../src/components/Data';
import { ORG_BY_ID } from '../src/data/orgs';

const padaria = ORG_BY_ID['padaria-ribeira'];

describe('componentes de dados', () => {
  it('Ring: nota de 0 a 5, percentagem, sem nota ou rótulo próprio', () => {
    render(
      <>
        <Ring value={4.4} />
        <Ring value={72.4} pct />
        <Ring value={0} muted />
        <Ring value={3} label="A" ariaLabel="Nota A" />
      </>,
    );
    expect(screen.getByRole('img', { name: 'Nota 4,4 de 5' })).toHaveTextContent('4,4');
    expect(screen.getByRole('img', { name: '72%' })).toHaveTextContent('72%');
    expect(screen.getByRole('img', { name: 'Ainda sem nota' })).toHaveTextContent('—');
    expect(screen.getByRole('img', { name: 'Nota A' })).toHaveTextContent('A');
  });

  it('Dots: 5 bolinhas decorativas', () => {
    const { container } = render(
      <>
        <Dots value={3.5} />
        <Dots value={null} />
      </>,
    );
    const groups = container.querySelectorAll(':scope > span[aria-hidden="true"]');
    expect(groups).toHaveLength(2);
    groups.forEach((g) => expect(g.children).toHaveLength(5));
  });

  it('CriterionRow: nome curto, prioridade e valor (— sem nota)', () => {
    render(
      <>
        <CriterionRow k="salario" value={4.2} priority={1} />
        <CriterionRow k="ambiente" value={null} />
      </>,
    );
    expect(screen.getByTitle('Prioridade 1')).toHaveTextContent('1');
    expect(screen.getByText('Salário')).toBeInTheDocument();
    expect(screen.getByText('4,2')).toBeInTheDocument();
    expect(screen.getByText('Ambiente').parentElement).toHaveTextContent('Ambiente—');
  });

  it('MatchPill e Trend', () => {
    render(
      <>
        <MatchPill value={88} />
        <MatchPill value={70} large />
        <Trend v="novo" />
        <Trend v={0} />
        <Trend v={2} />
        <Trend v={-3} />
      </>,
    );
    expect(screen.getByText('88% para ti')).toHaveClass('pill', 'pill-match');
    expect(screen.getByText('70% para ti')).toBeInTheDocument();
    expect(screen.getByText('novo')).toBeInTheDocument();
    expect(screen.getByText('—')).toBeInTheDocument();
    expect(screen.getByText('▲ 2')).toBeInTheDocument();
    expect(screen.getByText('▼ 3')).toBeInTheDocument();
  });

  it('OrgRow e OrgCard: ligação para a organização com dados para medir', () => {
    render(
      <MemoryRouter>
        <OrgRow org={padaria} match={91} />
        <OrgRow org={{ ...padaria, id: 'x', reviewsCount: 0 }} to="/outro" meta="Meta" right={<b>dir</b>} />
        <OrgCard org={padaria} match={77} />
      </MemoryRouter>,
    );
    const [row, other, card] = screen.getAllByRole('link');
    expect(row).toHaveAttribute('href', '/org/padaria-ribeira');
    expect(row).toHaveAttribute('data-ev', 'select_org');
    expect(row).toHaveAttribute('data-ev-match', '91');
    expect(row).toHaveTextContent('Padaria RibeiraPME · Porto91%');
    expect(other).toHaveAttribute('href', '/outro');
    expect(other).toHaveTextContent('Meta');
    expect(other).toHaveTextContent('dir');
    expect(screen.getByRole('img', { name: 'Ainda sem nota' })).toBeInTheDocument();
    expect(card).toHaveTextContent('Padaria RibeiraPME · Porto77%');
    expect(card).toHaveAttribute('data-ev-org-type', 'PME');
  });
});
