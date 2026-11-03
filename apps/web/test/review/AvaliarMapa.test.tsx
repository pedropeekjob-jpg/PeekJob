import { screen, within } from '@testing-library/react';
import { useLocation } from 'react-router';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { MapPin } from '../../src/features/review/orgsMap';
import { useStore } from '../../src/lib/store';
import { renderScreen, WithoutDraft } from '../utils/render';

// O mapa real (Leaflet) não corre no jsdom: cada pino é um botão
vi.mock('../../src/features/review/OrgsMap', () => ({
  default: ({ pins, onSelect }: { pins: MapPin[]; onSelect: (p: MapPin) => void }) => (
    <div data-testid="orgs-map">
      {pins.map((p) => (
        <button key={`${p.orgId}:${p.locationId}`} type="button" onClick={() => onSelect(p)}>
          pino {p.name} · {p.place}
        </button>
      ))}
    </div>
  ),
}));
const { default: AvaliarEscolher } = await import('../../src/pages/AvaliarEscolher');

function DraftProbe() {
  const { draft } = useStore();
  const { pathname } = useLocation();
  return <output data-testid="draft">{`${pathname}|${draft.orgId ?? ''}|${draft.locationId ?? ''}`}</output>;
}
const show = (viewport: 'mobile' | 'desktop') =>
  renderScreen(<WithoutDraft><AvaliarEscolher /></WithoutDraft>, { route: '/avaliar', path: '/avaliar', viewport, outside: <DraftProbe /> });

describe.each(['mobile', 'desktop'] as const)('Avaliar · empresas avaliadas no mapa (%s)', (viewport) => {
  beforeEach(() => localStorage.clear());

  it('o mapa só abre a pedido (vem de outro site); a lista continua a ser o caminho principal', async () => {
    const { user } = show(viewport);
    expect(screen.queryByTestId('orgs-map')).not.toBeInTheDocument();
    expect(screen.getByText('O mapa vem do OpenStreetMap (outro site).')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Ver empresas avaliadas no mapa' }));
    const map = await screen.findByTestId('orgs-map');
    // nome individual não aparece (a morada pode ser a casa de alguém)
    expect(within(map).queryByRole('button', { name: /Ana Reis/ })).not.toBeInTheDocument();
    expect(within(map).getByRole('button', { name: /Lavandaria Sol/ })).toBeInTheDocument();
    expect(screen.getByRole('searchbox', { name: /Nome da organização/ })).toBeInTheDocument();
  });

  it('procurar pela morada deixa só esses pinos; tocar no pino e confirmar segue para o cargo', async () => {
    const { user } = show(viewport);
    await user.click(screen.getByRole('button', { name: 'Ver empresas avaliadas no mapa' }));
    await user.type(screen.getByRole('searchbox', { name: /Nome da organização/ }), 'Rua Brito Capelo');
    const map = await screen.findByTestId('orgs-map');
    expect(within(map).getAllByRole('button').map((b) => b.textContent)).toEqual(['pino Lavandaria Sol · Sede']);
    // a lista também encontra pela morada
    expect(screen.getAllByRole('button', { name: /Lavandaria Sol/ }).filter((b) => !map.contains(b))).toHaveLength(1);
    expect(screen.getByRole('status', { name: 'No mapa' })).toHaveTextContent('1 organização avaliada no mapa');
    await user.click(within(map).getByRole('button', { name: /Lavandaria Sol/ }));
    const card = screen.getByRole('group', { name: 'Lavandaria Sol' });
    expect(card).toHaveTextContent('Rua Brito Capelo, 90, Matosinhos');
    expect(card).toHaveTextContent('11 avaliações');
    await user.click(within(card).getByRole('button', { name: 'É aqui que trabalho' }));
    expect(screen.getByTestId('draft')).toHaveTextContent('/avaliar/cargo|lavandaria-sol|sede');
  });

  it('com vários locais, o pino escolhe o local certo', async () => {
    const { user } = show(viewport);
    await user.click(screen.getByRole('button', { name: 'Ver empresas avaliadas no mapa' }));
    await user.click(await screen.findByRole('button', { name: 'pino Padaria Ribeira · Fabrico · Campanhã' }));
    await user.click(screen.getByRole('button', { name: 'É aqui que trabalho' }));
    const places = await screen.findByRole('radiogroup', { name: 'Local de trabalho' });
    expect(within(places).getByRole('radio', { checked: true })).toHaveTextContent('Fabrico · Campanhã');
  });

  it('sem pinos para o que se escreveu: diz e deixa usar a lista', async () => {
    const { user } = show(viewport);
    await user.click(screen.getByRole('button', { name: 'Ver empresas avaliadas no mapa' }));
    await user.type(screen.getByRole('searchbox', { name: /Nome da organização/ }), 'zzzz nada');
    expect(await screen.findByRole('status', { name: 'No mapa' })).toHaveTextContent('Nenhuma organização avaliada no mapa para «zzzz nada».');
  });
});
