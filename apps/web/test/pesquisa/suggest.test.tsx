import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { searchOrgs } from '../../src/api/orgs';
import { useSuggest } from '../../src/components/Suggest';
import { ORGS } from '../../src/data/orgs';
import { flatten, localSuggest, type Suggestion } from '../../src/features/search/suggest';

describe('sugestões (21/10)', () => {
  it('organizações, profissões, setores e sítios, sem acentos nem maiúsculas', () => {
    expect(localSuggest(ORGS, 'PADARIA').orgs[0]).toMatchObject({ id: 'padaria-ribeira', name: 'Padaria Ribeira' });
    expect(localSuggest(ORGS, 'pastel').roles).toEqual([{ label: 'Pastelaria', orgs: 1 }]);
    expect(localSuggest(ORGS, 'restauracao').sectors).toEqual(['Restauração']);
    expect(localSuggest(ORGS, 'port').places).toContain('Porto');
    expect(localSuggest(ORGS, 'p')).toEqual({ orgs: [], roles: [], sectors: [], places: [] });
  });

  it('a lista junta tudo pela ordem e só com os tipos pedidos', () => {
    const r = { orgs: [{ id: 'a', name: 'A', city: 'Porto' }], roles: [{ label: 'Balcão', orgs: 2 }], sectors: ['Saúde'], places: ['Braga'] };
    expect(flatten(r).map((s) => s.kind)).toEqual(['org', 'role', 'sector', 'place']);
    expect(flatten(r, ['org', 'place']).map((s) => s.label)).toEqual(['A', 'Braga']);
  });

  it('pesquisa por profissão: encontra e diz qual coincidiu', () => {
    const found = searchOrgs(ORGS, 'pastelaria');
    expect(found.map((o) => o.id)).toEqual(['padaria-ribeira']);
    expect(found[0].matchedRole).toBe('Pastelaria');
    // pelo nome não marca profissão
    expect(searchOrgs(ORGS, 'padaria ribeira')[0].matchedRole).toBeUndefined();
  });
});

const ITEMS: Suggestion[] = [
  { kind: 'org', id: 'padaria-ribeira', label: 'Padaria Ribeira', city: 'Porto', type: 'Empresa' },
  { kind: 'role', label: 'Pastelaria', orgs: 1 },
];
function Field({ onPick, onSubmit }: { onPick: (s: Suggestion) => void; onSubmit: () => void }) {
  const [q, setQ] = useState('');
  const s = useSuggest({ id: 'f', query: q, items: q ? ITEMS : [], onPick });
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        onSubmit();
      }}
    >
      <label htmlFor="f">Pesquisar</label>
      <input id="f" value={q} onChange={(e) => setQ(e.target.value)} {...s.inputProps} />
      {s.list}
    </form>
  );
}

describe('campo com sugestões (combobox)', () => {
  it('setas percorrem, Enter escolhe; Escape fecha; sem sugestão ativa, Enter pesquisa', async () => {
    const user = userEvent.setup();
    const onPick = vi.fn();
    const onSubmit = vi.fn();
    render(<Field onPick={onPick} onSubmit={onSubmit} />);
    const box = screen.getByRole('combobox', { name: 'Pesquisar' });
    await user.type(box, 'pa');
    expect(box).toHaveAttribute('aria-expanded', 'true');
    const options = screen.getAllByRole('option');
    expect(options.map((o) => o.textContent)).toEqual(['Padaria RibeiraEmpresa · Porto', 'PastelariaProfissão · em 1 organização']);
    await user.keyboard('{ArrowDown}{ArrowDown}');
    expect(box).toHaveAttribute('aria-activedescendant', options[1].id);
    expect(options[1]).toHaveAttribute('aria-selected', 'true');
    await user.keyboard('{Enter}');
    expect(onPick).toHaveBeenCalledWith(ITEMS[1]);
    expect(onSubmit).not.toHaveBeenCalled();
    expect(box).toHaveAttribute('aria-expanded', 'false');

    await user.type(box, 's');
    expect(box).toHaveAttribute('aria-expanded', 'true');
    await user.keyboard('{Escape}');
    expect(box).toHaveAttribute('aria-expanded', 'false');
    expect(box).toHaveValue('pas');
    await user.keyboard('{Enter}');
    expect(onSubmit).toHaveBeenCalledTimes(1);
  });

  it('com o rato: carregar numa sugestão escolhe-a', async () => {
    const user = userEvent.setup();
    const onPick = vi.fn();
    render(<Field onPick={onPick} onSubmit={vi.fn()} />);
    await user.type(screen.getByRole('combobox'), 'pa');
    await user.click(screen.getByRole('option', { name: /Padaria Ribeira/ }));
    expect(onPick).toHaveBeenCalledWith(ITEMS[0]);
  });
});
