import { screen } from '@testing-library/react';
import { beforeEach, describe, expect, it } from 'vitest';
import Sobre from '../src/pages/Sobre';
import { renderScreen } from './utils/render';

describe('Sobre', () => {
  beforeEach(() => localStorage.clear());
  it('mostra o título e as duas portas (explorar e avaliar)', () => {
    renderScreen(<Sobre />, { route: '/sobre' });
    expect(screen.getByRole('heading', { level: 1, name: /Damos voz/ })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Espreita/ })).toHaveAttribute('href', '/explorar');
  });
});
