import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { OrgLocation } from '../../src/data/orgs';

// O mapa real (Leaflet) não corre no jsdom: aqui interessa quando aparece e com que dados
vi.mock('../../src/components/RealMap', () => ({
  default: ({ locations, active }: { locations: OrgLocation[]; active?: string | null }) => (
    <div data-testid="real-map">
      {locations.map((l) => l.id).join(',')}|{active ?? ''}
    </div>
  ),
}));
const { MapView } = await import('../../src/components/MapView');
const { mapPoints, tilesConfig } = await import('../../src/components/map');

const locs: OrgLocation[] = [
  { id: 'a', label: 'Flores', address: 'Rua das Flores 1, Porto', lat: 41.14, lng: -8.61, mapX: 30, mapY: 40 },
  { id: 'b', label: 'Campanhã', address: 'Rua de Campanhã 2, Porto', lat: 41.15, lng: -8.58, mapX: 70, mapY: 60 },
];
const noCoords: OrgLocation[] = [{ id: 'x', label: 'Sede', address: 'Rua Nova 3, Braga', lat: 0, lng: 0, mapX: 50, mapY: 50 }];

describe('MapView', () => {
  beforeEach(() => localStorage.clear());

  it('só de ver: imagem com a morada do local ativo e ligação para o OpenStreetMap', () => {
    render(<MapView locations={locs} active="b" />);
    expect(screen.getByRole('img', { name: 'Mapa: Rua de Campanhã 2, Porto' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Abrir no mapa' })).toHaveAttribute('href', 'https://www.openstreetmap.org/?mlat=41.15&mlon=-8.58#map=17/41.15/-8.58');
    expect(screen.getAllByRole('button').map((b) => b.textContent?.trim())).toEqual(['Ver no mapa']);
  });

  it('para escolher: cada local é um botão (rato, Enter e espaço); sem ligação se pedido', async () => {
    const user = userEvent.setup();
    const onPick = vi.fn();
    render(<MapView locations={locs} onPick={onPick} showLink={false} />);
    expect(screen.getByRole('group', { name: 'Mapa: Rua das Flores 1, Porto' })).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Escolher Campanhã' }));
    expect(onPick).toHaveBeenLastCalledWith('b');
    screen.getByRole('button', { name: 'Escolher Flores' }).focus();
    await user.keyboard('{Enter}');
    expect(onPick).toHaveBeenLastCalledWith('a');
    await user.keyboard(' ');
    expect(onPick).toHaveBeenCalledTimes(3);
    expect(screen.queryByRole('link')).not.toBeInTheDocument();
  });

  it('mapa real só depois de a pessoa pedir (carrega de outro site); fica lembrado neste browser', async () => {
    const user = userEvent.setup();
    const { unmount } = render(<MapView locations={locs} active="b" />);
    expect(screen.queryByTestId('real-map')).not.toBeInTheDocument();
    expect(screen.getByText(/O mapa vem do OpenStreetMap/)).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Ver no mapa' }));
    expect(await screen.findByTestId('real-map')).toHaveTextContent('a,b|b');
    unmount();
    render(<MapView locations={locs} />);
    expect(await screen.findByTestId('real-map')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Ver no mapa' })).not.toBeInTheDocument();
  });

  it('sem coordenadas (ex.: organização adicionada à mão): só a ilustração, sem "Ver no mapa"', () => {
    render(<MapView locations={noCoords} />);
    expect(screen.queryByRole('button', { name: 'Ver no mapa' })).not.toBeInTheDocument();
    expect(screen.getByRole('img', { name: 'Mapa: Rua Nova 3, Braga' })).toBeInTheDocument();
  });
});

describe('mapa: dados', () => {
  it('pontos: só os locais com coordenadas', () => {
    expect(mapPoints([...locs, ...noCoords]).map((p) => p.id)).toEqual(['a', 'b']);
  });

  it('mosaicos: os da configuração do servidor, ou o OpenStreetMap', () => {
    expect(tilesConfig(undefined)).toEqual({ url: 'https://tile.openstreetmap.org/{z}/{x}/{y}.png', attribution: '© OpenStreetMap' });
    expect(tilesConfig({ tiles: { url: 'https://t.pt/{z}/{x}/{y}.png', attribution: '© T' } })).toEqual({ url: 'https://t.pt/{z}/{x}/{y}.png', attribution: '© T' });
  });
});
