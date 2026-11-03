import { screen, within } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { renderScreen } from '../utils/render';

// Notificação de conteúdo ilegal (Regulamento dos Serviços Digitais, art. 16.º), no modo API
vi.mock('../../src/api/http', async (orig) => ({ ...(await orig<typeof import('../../src/api/http')>()), apiMode: true }));
vi.mock('../../src/api/orgs', async (orig) => {
  const actual = await orig<typeof import('../../src/api/orgs')>();
  const { ORG_BY_ID } = await import('../../src/data/orgs');
  return { ...actual, useOrg: (id?: string) => (id ? ORG_BY_ID[id] : undefined) };
});
const api = vi.fn();
let user: { email: string } | null = null;
vi.mock('../../src/lib/store', async (orig) => {
  const actual = await orig<typeof import('../../src/lib/store')>();
  return { ...actual, useStore: () => ({ ...actual.useStore(), user, reportContent: api }) };
});
const { default: Denunciar } = await import('../../src/pages/Denunciar');

const PATH = '/org/:id/denunciar/:reviewId';
const show = (viewport: 'mobile' | 'desktop') => renderScreen(<Denunciar />, { route: '/org/padaria-ribeira/denunciar/r1', path: PATH, viewport });
const EXPLANATION = 'Acusa o gerente de roubar dinheiro aos clientes, o que é falso e é difamação.';

describe.each(['mobile', 'desktop'] as const)('Denunciar conteúdo ilegal (%s)', (viewport) => {
  beforeEach(() => {
    localStorage.clear();
    api.mockReset();
    api.mockResolvedValue({ ok: true, value: { reference: 'AB12CD34' } });
    user = null;
  });

  it('pede o que o artigo 16.º exige: fundamento, explicação, endereço, nome, email e boa-fé', async () => {
    const { user } = show(viewport);
    await user.click(await screen.findByRole('radio', { name: /Conteúdo ilegal/ }));
    const form = screen.getByRole('group', { name: /Notificação de conteúdo ilegal/ });
    expect(within(form).getByRole('combobox', { name: /Que lei é violada/ })).toBeInTheDocument();
    expect(within(form).getByRole('textbox', { name: /Porque é ilegal/ })).toBeInTheDocument();
    expect(within(form).getByRole('textbox', { name: /Endereço do conteúdo/ })).toHaveAttribute('readonly');
    expect(within(form).getByRole('textbox', { name: /Endereço do conteúdo/ })).toHaveValue(window.location.href);
    expect(within(form).getByRole('textbox', { name: /^Nome/ })).toBeRequired();
    expect(within(form).getByRole('textbox', { name: /^Email/ })).toBeRequired();
    expect(within(form).getByRole('checkbox', { name: /boa-fé/ })).not.toBeChecked();
  });

  it('não envia uma notificação incompleta e diz o que falta', async () => {
    const { user } = show(viewport);
    await user.click(await screen.findByRole('radio', { name: /Conteúdo ilegal/ }));
    await user.type(screen.getByRole('textbox', { name: /Porque é ilegal/ }), 'Não gosto desta avaliação.');
    await user.click(screen.getByRole('button', { name: 'Enviar denúncia' }));
    expect(api).not.toHaveBeenCalled();
    const alerts = screen.getAllByRole('alert').map((a) => a.textContent).join(' ');
    expect(alerts).toMatch(/Escolhe a lei/);
    expect(alerts).toMatch(/Explica com factos concretos/);
    expect(alerts).toMatch(/nome/);
    expect(alerts).toMatch(/email/);
    expect(alerts).toMatch(/boa-fé/);
  });

  it('envia a notificação completa e confirma a receção', async () => {
    const { user } = show(viewport);
    await user.click(await screen.findByRole('radio', { name: /Conteúdo ilegal/ }));
    await user.selectOptions(screen.getByRole('combobox', { name: /Que lei é violada/ }), 'difamacao');
    await user.type(screen.getByRole('textbox', { name: /Porque é ilegal/ }), EXPLANATION);
    await user.type(screen.getByRole('textbox', { name: /^Nome/ }), 'Rita Sousa');
    await user.type(screen.getByRole('textbox', { name: /^Email/ }), 'rita@exemplo.pt');
    await user.click(screen.getByRole('checkbox', { name: /boa-fé/ }));
    await user.click(screen.getByRole('button', { name: 'Enviar denúncia' }));

    expect(api).toHaveBeenCalledWith('review', 'r1', {
      reason: 'ilegal',
      legalGround: 'difamacao',
      details: EXPLANATION,
      contactName: 'Rita Sousa',
      contactEmail: 'rita@exemplo.pt',
      goodFaith: true,
    });
    const status = await screen.findByRole('status');
    expect(status).toHaveTextContent('Recebemos a tua denúncia.');
    expect(status).toHaveTextContent('Enviámos a confirmação para rita@exemplo.pt.');
    expect(within(status).getByText('Referência PJ-AB12CD34')).toBeInTheDocument();
  });

  it('com conta também pede o nome e o email (a notificação tem de identificar quem a faz)', async () => {
    user = { email: 'ana@x.pt' };
    const { user: u } = show(viewport);
    await u.click(await screen.findByRole('radio', { name: /Conteúdo ilegal/ }));
    expect(screen.getByRole('textbox', { name: /^Email/ })).toBeRequired();
  });

  it('abuso sexual de crianças: o nome e o email passam a opcionais', async () => {
    const { user } = show(viewport);
    await user.click(await screen.findByRole('radio', { name: /Conteúdo ilegal/ }));
    await user.selectOptions(screen.getByRole('combobox', { name: /Que lei é violada/ }), 'abuso_criancas');
    expect(screen.getByRole('textbox', { name: /^Nome/ })).not.toBeRequired();
    await user.type(screen.getByRole('textbox', { name: /Porque é ilegal/ }), EXPLANATION);
    await user.click(screen.getByRole('checkbox', { name: /boa-fé/ }));
    await user.click(screen.getByRole('button', { name: 'Enviar denúncia' }));
    expect(api).toHaveBeenCalledTimes(1);
  });
});
