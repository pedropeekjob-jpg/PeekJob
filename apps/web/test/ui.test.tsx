import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router';
import { describe, expect, it, vi } from 'vitest';
import { Accordion, BackButton, Disclosure, Empty, MoreLink, MoreToggle, Steps, Switch, TopBar } from '../src/components/UI';

const inRouter = (ui: React.ReactElement, at = '/aqui') =>
  render(
    <MemoryRouter initialEntries={[at]}>
      <Routes>
        <Route path="/aqui" element={ui} />
        <Route path="*" element={<div data-testid="destino" />} />
      </Routes>
    </MemoryRouter>,
  );

describe('componentes de UI', () => {
  it('Disclosure: mostra o conteúdo ao abrir e troca o texto', async () => {
    const user = userEvent.setup();
    render(
      <Disclosure label="Ver mais" className="x">
        <p>conteúdo</p>
      </Disclosure>,
    );
    const b = screen.getByRole('button', { name: 'Ver mais' });
    expect(b).toHaveAttribute('aria-expanded', 'false');
    expect(screen.queryByText('conteúdo')).not.toBeInTheDocument();
    await user.click(b);
    expect(screen.getByText('conteúdo')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Mostrar menos' })).toHaveAttribute('aria-expanded', 'true');
  });

  it('Disclosure aberto por omissão com texto próprio para fechar', () => {
    render(
      <Disclosure label="Abrir" openLabel="Fechar" defaultOpen>
        <p>dentro</p>
      </Disclosure>,
    );
    expect(screen.getByText('dentro')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Fechar' })).toBeInTheDocument();
  });

  it('Accordion: só um aberto de cada vez; tocar no aberto fecha', async () => {
    const user = userEvent.setup();
    render(
      <Accordion
        items={[
          { title: 'Um', body: 'corpo um' },
          { title: 'Dois', body: 'corpo dois' },
        ]}
      />,
    );
    await user.click(screen.getByRole('button', { name: 'Um' }));
    expect(screen.getByText('corpo um')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Dois' }));
    expect(screen.queryByText('corpo um')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Dois' })).toHaveAttribute('aria-expanded', 'true');
    await user.click(screen.getByRole('button', { name: 'Dois' }));
    expect(screen.queryByText('corpo dois')).not.toBeInTheDocument();
  });

  it('Steps: rótulo por omissão ou próprio, e uma barra por passo', () => {
    const { container, rerender } = render(<Steps current={2} />);
    expect(screen.getByLabelText('Passo 2 de 3')).toBeInTheDocument();
    rerender(<Steps current={1} total={4} label="Início" />);
    expect(screen.getByLabelText('Início')).toBeInTheDocument();
    expect(container.querySelectorAll('[aria-label="Início"] > div > span')).toHaveLength(4);
  });

  it('TopBar: voltar para um destino, ou ação própria; título e conteúdo à direita', async () => {
    const user = userEvent.setup();
    const onBack = vi.fn();
    const { unmount } = inRouter(<TopBar onBack={onBack} title="Título" right={<b>dir</b>} />);
    expect(screen.getByText('Título')).toBeInTheDocument();
    expect(screen.getByText('dir')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Voltar' }));
    expect(onBack).toHaveBeenCalled();
    unmount();
    inRouter(<TopBar back="/perfil" />);
    await user.click(screen.getByRole('button', { name: 'Voltar' }));
    expect(screen.getByTestId('destino')).toBeInTheDocument();
  });

  it('Switch: alterna e mostra a explicação', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<Switch checked={false} onChange={onChange} label="Notificações" hint="Uma por semana" purple />);
    const sw = screen.getByRole('switch', { name: 'Notificações' });
    expect(sw).toHaveAccessibleDescription('Uma por semana');
    expect(sw).toHaveAttribute('aria-checked', 'false');
    await user.click(sw);
    expect(onChange).toHaveBeenCalledWith(true);
  });

  it('Empty, MoreLink, BackButton e MoreToggle', async () => {
    const user = userEvent.setup();
    const onToggle = vi.fn();
    inRouter(
      <>
        <Empty title="Nada aqui" body="Ainda." action={<button type="button">Agir</button>} />
        <MoreLink to="/ranking">Ver ranking</MoreLink>
        <MoreToggle open={false} onToggle={onToggle} label="Mais" openLabel="Menos" controls="lista" />
        <BackButton fallback="/inicio" />
      </>,
    );
    expect(screen.getByText('Nada aqui')).toBeInTheDocument();
    expect(screen.getByText('Ainda.')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Ver ranking' })).toHaveAttribute('href', '/ranking');
    const more = screen.getByRole('button', { name: 'Mais' });
    expect(more).toHaveAttribute('aria-controls', 'lista');
    await user.click(more);
    expect(onToggle).toHaveBeenCalled();
    await user.click(screen.getByRole('button', { name: 'Voltar' }));
    expect(screen.getByTestId('destino')).toBeInTheDocument();
  });
});
