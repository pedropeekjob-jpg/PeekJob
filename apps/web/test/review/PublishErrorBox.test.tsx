import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router';
import { describe, expect, it, vi } from 'vitest';
import { PublishErrorBox } from '../../src/features/review/PublishErrorBox';

const inRouter = (ui: React.ReactElement) => render(<MemoryRouter>{ui}</MemoryRouter>);

describe('PublishErrorBox', () => {
  it('sem erro não mostra nada', () => {
    const { container } = inRouter(<PublishErrorBox error={null} onUseSuggestion={vi.fn()} />);
    expect(container).toBeEmptyDOMElement();
  });

  it('422: usar a versão sugerida', async () => {
    const use = vi.fn();
    inRouter(<PublishErrorBox error={{ message: 'Tira nomes.', suggestion: 'A chefia grita.' }} onUseSuggestion={use} />);
    await userEvent.click(screen.getByRole('button', { name: 'Usar a versão sugerida' }));
    expect(use).toHaveBeenCalledWith('A chefia grita.');
    expect(screen.queryByRole('link', { name: 'Entrar' })).not.toBeInTheDocument();
  });

  it('401: "Entrar" e depois voltar às notas', () => {
    inRouter(<PublishErrorBox error={{ message: 'Entra para publicar.', signIn: true }} onUseSuggestion={vi.fn()} />);
    expect(screen.getByRole('alert')).toHaveTextContent('Entra para publicar.');
    expect(screen.getByRole('link', { name: 'Entrar' })).toHaveAttribute('href', '/entrar?next=%2Favaliar%2Fnotas');
  });
});
