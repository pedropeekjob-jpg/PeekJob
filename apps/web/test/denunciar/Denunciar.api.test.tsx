import { screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { renderScreen } from '../utils/render';

// Modo API: a denúncia vai para o servidor; sem conta pode deixar contacto para saber a decisão
vi.mock('../../src/api/http', async (orig) => ({ ...(await orig<typeof import('../../src/api/http')>()), apiMode: true }));
vi.mock('../../src/api/orgs', async (orig) => {
  const actual = await orig<typeof import('../../src/api/orgs')>();
  const { ORG_BY_ID } = await import('../../src/data/orgs');
  return { ...actual, useOrg: (id?: string) => (id ? ORG_BY_ID[id] : undefined) };
});
const reportReview = vi.fn();
let user: { email: string } | null = null;
vi.mock('../../src/lib/store', async (orig) => {
  const actual = await orig<typeof import('../../src/lib/store')>();
  return { ...actual, useStore: () => ({ ...actual.useStore(), user, reportReview }) };
});
const { default: Denunciar } = await import('../../src/pages/Denunciar');
const show = (viewport: 'mobile' | 'desktop') => renderScreen(<Denunciar />, { route: '/org/padaria-ribeira/denunciar/r1', path: '/org/:id/denunciar/:reviewId', viewport });

describe.each(['mobile', 'desktop'] as const)('Denunciar, modo API (%s)', (viewport) => {
  beforeEach(() => {
    localStorage.clear();
    reportReview.mockReset();
    user = null;
  });

  it('sem conta: contacto opcional enviado com a denúncia; a referência vem do servidor', async () => {
    reportReview.mockResolvedValue({ ok: true, value: { reference: 'D-77' } });
    const { user: u } = show(viewport);
    await u.click(await screen.findByRole('radio', { name: /Parece falsa/ }));
    await u.type(screen.getByPlaceholderText('Nome'), ' Ana ');
    await u.type(screen.getByPlaceholderText('Email'), 'ana@x.pt');
    await u.click(screen.getByRole('button', { name: 'Enviar denúncia' }));
    expect(reportReview).toHaveBeenCalledWith('r1', { reason: 'falso', details: '', contactName: 'Ana', contactEmail: 'ana@x.pt' });
    expect(await screen.findByText('Referência PJ-D-77')).toBeInTheDocument();
    expect(screen.getByRole('status')).toHaveTextContent('Recebes a decisão por email.');
  });

  it('com conta: sem campos de contacto; denúncia repetida e email inválido explicam o erro', async () => {
    user = { email: 'ana@x.pt' };
    reportReview.mockResolvedValueOnce({ ok: false, status: 409, message: 'x' }).mockResolvedValueOnce({ ok: false, status: 400, message: 'x' }).mockResolvedValueOnce({ ok: false, status: 500, message: 'Falhou.' });
    const { user: u } = show(viewport);
    await u.click(await screen.findByRole('radio', { name: /Dados privados/ }));
    expect(screen.queryByPlaceholderText('Email')).not.toBeInTheDocument();
    const send = screen.getByRole('button', { name: 'Enviar denúncia' });
    await u.click(send);
    expect(await screen.findByRole('alert')).toHaveTextContent('Já denunciaste esta avaliação. A moderação está a analisar.');
    await u.click(send);
    expect(await screen.findByText('Verifica o email (ou deixa-o em branco).')).toBeInTheDocument();
    await u.click(send);
    expect(await screen.findByText('Falhou.')).toBeInTheDocument();
    expect(reportReview).toHaveBeenCalledWith('r1', { reason: 'privado', details: '', contactName: undefined, contactEmail: undefined });
  });

  it('sem conta e sem email: não promete resposta por email', async () => {
    reportReview.mockResolvedValue({ ok: true, value: { reference: 'D-1' } });
    const { user: u } = show(viewport);
    await u.click(await screen.findByRole('radio', { name: /Outro motivo/ }));
    await u.click(screen.getByRole('button', { name: 'Enviar denúncia' }));
    const status = await screen.findByRole('status');
    expect(status).not.toHaveTextContent('Recebes a decisão por email.');
    expect(status).not.toHaveTextContent('mensagens');
  });
});
