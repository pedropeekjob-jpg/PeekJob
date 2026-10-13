import { act, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';

let consent: { configured: boolean; value: 'granted' | 'denied' | null } = { configured: true, value: null };
const analytics = { grant: vi.fn(), deny: vi.fn(), revoke: vi.fn(), configured: () => consent.configured };
vi.mock('../../src/analytics', () => ({ analytics, useAnalyticsConsent: () => consent }));
const { ConsentBanner, AnalyticsSwitch, openConsent } = await import('../../src/components/ConsentBanner');

const show = () =>
  render(
    <MemoryRouter>
      <ConsentBanner />
      <AnalyticsSwitch />
    </MemoryRouter>,
  );

describe('ConsentBanner', () => {
  beforeEach(() => {
    consent = { configured: true, value: null };
    Object.values(analytics).forEach((f) => 'mockReset' in f && (f as ReturnType<typeof vi.fn>).mockReset());
    analytics.configured = () => consent.configured;
  });

  it('sem escolha: pergunta; recusar é tão fácil como aceitar', async () => {
    const user = userEvent.setup();
    show();
    const dialog = screen.getByRole('dialog', { name: 'Ajudas-nos a melhorar a PeekJob?' });
    expect(screen.getByRole('link', { name: 'Saber mais' })).toHaveAttribute('href', '/metodologia#privacidade');
    await user.click(screen.getByRole('button', { name: 'Recusar' }));
    expect(analytics.deny).toHaveBeenCalled();
    expect(dialog).toBeInTheDocument(); // a escolha chega pelo hook (aqui fixo)
    await user.click(screen.getByRole('button', { name: 'Aceitar' }));
    expect(analytics.grant).toHaveBeenCalled();
  });

  it('com escolha feita: escondido até ser reaberto; recusar depois de aceitar revoga', async () => {
    const user = userEvent.setup();
    consent = { configured: true, value: 'granted' };
    show();
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    act(() => openConsent());
    await user.click(screen.getByRole('button', { name: 'Recusar' }));
    expect(analytics.revoke).toHaveBeenCalled();
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    // interruptor do perfil
    await user.click(screen.getByRole('switch', { name: /^Estatísticas de utilização/ }));
    expect(analytics.revoke).toHaveBeenCalledTimes(2);
  });

  it('sem Analytics configurado: nada', () => {
    consent = { configured: false, value: null };
    const { container } = show();
    expect(container).toBeEmptyDOMElement();
  });
});
