import { screen, within } from '@testing-library/react';
import { beforeEach, describe, expect, it } from 'vitest';
import { useStore } from '../../src/lib/store';
import Perfil from '../../src/pages/Perfil';
import { renderScreen, seedStore } from '../utils/render';

function Who() {
  const { user } = useStore();
  return <div data-testid="who">{user?.email ?? 'ninguém'}</div>;
}
const show = (viewport: 'mobile' | 'desktop') => renderScreen(<Perfil />, { route: '/perfil', path: '/perfil', viewport, outside: <Who /> });
const message = (id: string, read: boolean) => ({ id, orgId: 'padaria-ribeira', kinds: ['assedio'], found: [], when: 'há 2 dias', read });

describe.each(['mobile', 'desktop'] as const)('Perfil (%s)', (viewport) => {
  const desktop = viewport === 'desktop';
  beforeEach(() => localStorage.clear());

  it('sem sessão: convite para entrar, explorar e repor a demonstração', async () => {
    seedStore({ user: null });
    const { user } = show(viewport);
    expect(await screen.findByRole('heading', { level: 1, name: 'A tua conta' })).toBeInTheDocument();
    expect(screen.getByText('Sem palavra-passe nem nome')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Entrar com email' })).toHaveAttribute('href', '/entrar');
    expect(screen.getByRole('link', { name: 'Continuar a explorar sem conta' })).toHaveAttribute('href', '/');
    await user.click(screen.getByRole('button', { name: /Repor dados de demonstração/ }));
    expect(screen.getByRole('status')).toHaveTextContent('Dados repostos: sessão, rascunho de exemplo e guardadas.');
    expect(screen.getByTestId('who')).toHaveTextContent('pessoa@gmail.com');
  });

  it('com sessão: atividade, definições e moderação (conta moderadora)', async () => {
    show(viewport);
    expect(await screen.findByRole('heading', { level: 1, name: 'A tua conta' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Mensagens/ })).toHaveAttribute('href', '/apoio');
    expect(screen.getByRole('link', { name: /Verificação/ })).toHaveAttribute('href', '/avaliar/verificar');
    expect(screen.getAllByRole('link', { name: /Como calculamos/ }).map((a) => a.getAttribute('href'))).toContain('/metodologia');
    expect(screen.getByRole('link', { name: /Privacidade e dados/ })).toHaveAttribute('href', '/perfil/dados');
    expect(screen.getByRole('link', { name: /Gerir a minha organização/ })).toHaveAttribute('href', '/painel');
    expect(screen.getByRole('link', { name: /Moderação/ })).toHaveAttribute('href', '/moderacao');
    expect(screen.getByText('Idioma')).toBeInTheDocument();
    if (desktop) {
      expect(screen.getByText('Exportar ou apagar')).toBeInTheDocument();
      // prioridades numeradas, com ligação para mudar
      expect(screen.getByRole('link', { name: 'Mudar' })).toHaveAttribute('href', '/preferencias');
    } else expect(screen.getByRole('link', { name: /O que valorizo/ })).toHaveTextContent(/e mais 2/);
  });

  it('as minhas avaliações ligam à organização', async () => {
    const { user } = show(viewport);
    await screen.findByRole('heading', { level: 1 });
    if (!desktop) {
      const toggle = screen.getByRole('button', { name: /As minhas avaliações/ });
      expect(toggle).toHaveTextContent('1');
      await user.click(toggle);
      expect(toggle).toHaveAttribute('aria-expanded', 'true');
    }
    const link = screen.getByRole('link', { name: /Café Vinha/ });
    expect(link).toHaveAttribute('href', '/org/cafe-vinha');
    expect(link).toHaveTextContent(/Publicada/);
    if (desktop) expect(within(link).getByRole('img', { name: 'A tua nota 3,6 de 5' })).toBeInTheDocument();
  });

  it('sem avaliações: diz que ainda não avaliou', async () => {
    seedStore({ myReviews: [] });
    const { user } = show(viewport);
    await screen.findByRole('heading', { level: 1 });
    if (!desktop) await user.click(screen.getByRole('button', { name: /As minhas avaliações/ }));
    expect(screen.getByText('Ainda não avaliaste nenhuma organização.')).toBeInTheDocument();
  });

  it('mensagens por ler aparecem com o número', async () => {
    seedStore({ messages: [message('m1', false), message('m2', false), message('m3', true)] });
    show(viewport);
    expect(await screen.findByLabelText('2 mensagens novas')).toHaveTextContent('2');
  });

  it('uma mensagem nova (singular); sem novas no telemóvel', async () => {
    seedStore({ messages: [message('m1', false)] });
    const { unmount } = show(viewport);
    expect(await screen.findByLabelText('1 mensagem nova')).toBeInTheDocument();
    unmount();
    seedStore({ messages: [message('m1', true)] });
    show(viewport);
    await screen.findByRole('heading', { level: 1 });
    if (desktop) expect(screen.getByText(/Onde pedir ajuda · há 2 dias/)).toBeInTheDocument();
    else expect(screen.getByText('Sem novas')).toBeInTheDocument();
  });

  it('conta sem papel de moderadora não vê a moderação; verificação mostra a organização', async () => {
    seedStore({ user: { email: 'ana@gmail.com' }, draft: { orgId: 'padaria-ribeira', locationId: null, scores: {}, recommend: null, tags: [], text: '', verified: 'email' }, prefs: ['salario'] });
    show(viewport);
    await screen.findByRole('heading', { level: 1 });
    expect(screen.queryByRole('link', { name: /Moderação/ })).not.toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Verificação/ })).toHaveTextContent('Padaria Ribeira');
    if (!desktop) expect(screen.getByRole('link', { name: /O que valorizo/ })).not.toHaveTextContent(/e mais/);
  });

  it('terminar sessão leva a entrar', async () => {
    const { user } = show(viewport);
    await user.click(await screen.findByRole('button', { name: /Terminar sessão/ }));
    expect(screen.getByTestId('who')).toHaveTextContent('ninguém');
    expect(screen.getByTestId('outra-rota')).toBeInTheDocument();
  });
});
