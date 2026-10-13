import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { MapView } from '../../src/components/MapView';
import type { OrgLocation } from '../../src/data/orgs';

const locs: OrgLocation[] = [
  { id: 'a', label: 'Flores', address: 'Rua das Flores 1, Porto', lat: 41.14, lng: -8.61, mapX: 30, mapY: 40 },
  { id: 'b', label: 'Campanhã', address: 'Rua de Campanhã 2, Porto', lat: 41.15, lng: -8.58, mapX: 70, mapY: 60 },
];

describe('MapView', () => {
  it('só de ver: imagem com a morada do local ativo e ligação para o OpenStreetMap', () => {
    render(<MapView locations={locs} active="b" />);
    expect(screen.getByRole('img', { name: 'Mapa: Rua de Campanhã 2, Porto' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Abrir no mapa' })).toHaveAttribute('href', 'https://www.openstreetmap.org/?mlat=41.15&mlon=-8.58#map=17/41.15/-8.58');
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
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
});
