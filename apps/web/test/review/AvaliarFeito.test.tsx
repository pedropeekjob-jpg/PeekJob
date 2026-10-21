import { screen } from '@testing-library/react';
import { beforeEach, describe, expect, it } from 'vitest';
import AvaliarFeito from '../../src/pages/AvaliarFeito';
import { renderScreen, seedStore } from '../utils/render';

const SCORES = { salario: 3, equilibrio: 3, respeito: 4, ambiente: 4, lideranca: 4, estabilidade: 3, progressao: 3, proposito: 4 };
const mine = (flagged: boolean, orgId = 'padaria-ribeira') => ({ id: 'novo-1', orgId, scores: SCORES, avg: 3.5, recommend: true, tags: [], text: 'Texto.', when: 'agora', flagged });
const show = (viewport: 'mobile' | 'desktop') => renderScreen(<AvaliarFeito />, { route: '/avaliar/feito', path: '/avaliar/feito', viewport });

describe.each(['mobile', 'desktop'] as const)('Avaliação publicada (%s)', (viewport) => {
  const desktop = viewport === 'desktop';
  beforeEach(() => localStorage.clear());

  it('sem avaliação publicada: convite para avaliar', async () => {
    seedStore({ lastPublished: null });
    show(viewport);
    expect(await screen.findByText('Ainda não publicaste nenhuma avaliação')).toBeInTheDocument();
    // no computador o cabeçalho também tem "Avaliar onde trabalho"
    for (const a of screen.getAllByRole('link', { name: 'Avaliar onde trabalho' })) expect(a).toHaveAttribute('href', '/avaliar');
  });

  it('publicada: nota média, total da organização (mais esta) e ligações', async () => {
    seedStore({ lastPublished: 'novo-1', myReviews: [mine(false)] });
    show(viewport);
    expect(await screen.findByRole('heading', { level: 1, name: 'Publicado. Obrigado.' })).toBeInTheDocument();
    expect(screen.getByRole('img', { name: 'A tua nota média: 3,5 de 5' })).toBeInTheDocument();
    expect(screen.getByText(/Padaria Ribeira passa a ter 24 avaliações\./)).toBeInTheDocument();
    if (desktop) expect(screen.getByText(/Ninguém sabe que foste tu\./)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Ver na página da organização' })).toHaveAttribute('href', '/org/padaria-ribeira');
    expect(screen.getByRole('link', { name: 'Voltar ao início' })).toHaveAttribute('href', '/');
    expect(screen.queryByRole('region', { name: 'Apoio' })).not.toBeInTheDocument();
    expect(screen.queryByRole('link', { name: /mensage(m|ns) privada/ })).not.toBeInTheDocument();
  });

  it('por verificar: convite para confirmar agora (depois de publicar); verificada: diz que está', async () => {
    seedStore({ lastPublished: 'novo-1', myReviews: [mine(false)] });
    const { unmount } = show(viewport);
    const invite = await screen.findByRole('region', { name: 'Confirma que trabalhas lá' });
    expect(invite).toHaveTextContent(/selo Verificado/);
    expect(screen.getByRole('link', { name: 'Confirmar agora' })).toHaveAttribute('href', '/avaliar/verificar?org=padaria-ribeira');
    unmount();
    seedStore({ lastPublished: 'novo-1', myReviews: [{ ...mine(false), verified: true }] });
    show(viewport);
    expect(await screen.findByText('Avaliação verificada.')).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'Confirmar agora' })).not.toBeInTheDocument();
  });

  it('depois de publicar: passo 3 de 3 e convite para avaliar a entrevista e partilhar o salário', async () => {
    seedStore({ lastPublished: 'novo-1', myReviews: [mine(false)] });
    show(viewport);
    const more = await screen.findByRole('region', { name: 'Já agora, ajuda mais um bocadinho' });
    expect(more).toHaveTextContent(/Também é anónimo/);
    expect(screen.getByRole('link', { name: 'Avaliar a entrevista' })).toHaveAttribute('href', '/partilhar/entrevista?org=padaria-ribeira');
    expect(screen.getByRole('link', { name: 'Partilhar o salário' })).toHaveAttribute('href', '/partilhar/salario?org=padaria-ribeira');
    if (desktop) expect(screen.getByRole('list', { name: 'Passo 3 de 3' })).toBeInTheDocument();
    else expect(screen.getByRole('img', { name: 'Passo 3 de 3, concluído' })).toBeInTheDocument();
  });

  it('ver e esconder as 8 notas', async () => {
    seedStore({ lastPublished: 'novo-1', myReviews: [mine(false)] });
    const { user } = show(viewport);
    const toggle = await screen.findByRole('button', { name: /Ver as tuas 8 notas/ });
    await user.click(toggle);
    expect(toggle).toHaveAttribute('aria-expanded', 'true');
    expect(toggle).toHaveTextContent('Esconder as tuas notas');
    expect(screen.getByText('Salário justo: 3 de 5')).toBeInTheDocument();
    await user.click(toggle);
    expect(screen.queryByText('Salário justo: 3 de 5')).not.toBeInTheDocument();
  });

  it('relato grave com sessão: mensagem privada de apoio', async () => {
    seedStore({ lastPublished: 'novo-1', myReviews: [mine(true)], messages: [] });
    show(viewport);
    const link = await screen.findByRole('link', { name: /Tens 1 mensagem privada/ });
    expect(link).toHaveAttribute('href', '/apoio');
  });

  it('relato grave sem sessão: convite para entrar e ver ajuda já', async () => {
    seedStore({ user: null, lastPublished: 'novo-1', myReviews: [mine(true)] });
    show(viewport);
    const region = await screen.findByRole('region', { name: 'Apoio' });
    expect(region).toHaveTextContent('O que descreveste pode ser ilegal');
    expect(screen.getByRole('link', { name: 'Entrar' })).toHaveAttribute('href', '/entrar');
    expect(screen.getByRole('link', { name: /Ver onde pedir ajuda agora/ })).toHaveAttribute('href', '/apoio');
  });

  it('organização desconhecida: texto genérico e volta ao início', async () => {
    seedStore({ lastPublished: 'novo-1', myReviews: [mine(false, 'nao-existe')] });
    show(viewport);
    expect(await screen.findByText(/A organização passa a ter 1 avaliação\./)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Ver na página da organização' })).toHaveAttribute('href', '/');
  });

  it('aberto diretamente: fechar vai para o início (telemóvel)', async () => {
    if (desktop) return;
    seedStore({ lastPublished: 'novo-1', myReviews: [mine(false)] });
    const { user } = show(viewport);
    await user.click(await screen.findByRole('button', { name: 'Fechar' }));
    expect(screen.getByTestId('outra-rota')).toBeInTheDocument();
  });
});
