import { screen, within } from '@testing-library/react';
import { beforeEach, describe, expect, it } from 'vitest';
import { useStore } from '../../src/lib/store';
import Apoio from '../../src/pages/Apoio';
import { renderScreen, seedStore } from '../utils/render';

function Unread() {
  const { messages } = useStore();
  return <div data-testid="unread">{messages.filter((m) => !m.read).length}</div>;
}
const show = (viewport: 'mobile' | 'desktop') => renderScreen(<Apoio />, { route: '/apoio', path: '/apoio', viewport, outside: <Unread /> });
const support = { id: 's1', orgId: 'padaria-ribeira', kinds: ['assédio moral', 'salário em atraso'], found: ['grita'], when: 'há 2 dias', read: false, type: 'support' };
const notice = (id: string, decision: string, note = '', orgName?: string, appeal: unknown = null) => ({ id, orgId: 'x', kinds: [], found: [], when: 'ontem', read: false, type: 'moderation', orgName, details: { decision, note }, appeal });

describe.each(['mobile', 'desktop'] as const)('Apoio (%s)', (viewport) => {
  const desktop = viewport === 'desktop';
  beforeEach(() => localStorage.clear());

  it('sem mensagem: texto geral, entidades com telefone, site e email, e o 112', async () => {
    show(viewport);
    expect(await screen.findByRole('heading', { level: 1, name: 'Não tens de passar por isto sozinho/a.' })).toBeInTheDocument();
    expect(screen.getByText(/^Se algo no teu trabalho pode ser ilegal/)).toBeInTheDocument();
    expect(screen.getByText('Só tu vês esta mensagem')).toBeInTheDocument();
    expect(screen.getAllByRole('article').length).toBeGreaterThanOrEqual(3);
    const call = screen.getAllByRole('link', { name: /^Ligar para / });
    expect(call.length).toBeGreaterThan(0);
    expect(call[0].getAttribute('href')).toMatch(/^tel:/);
    expect(screen.getAllByRole('link').some((a) => a.getAttribute('href')?.startsWith('mailto:'))).toBe(true);
    const emergency = screen.getAllByRole('link').find((a) => a.getAttribute('href') === 'tel:112')!;
    expect(emergency).toHaveTextContent('112');
    expect(screen.getByText(/A PeekJob não apresenta queixas por ti/)).toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: 'Avisos da moderação' })).not.toBeInTheDocument();
  });

  it('com mensagem de apoio: o que pode configurar, o que se encontrou, e fica lida', async () => {
    seedStore({ messages: [support] });
    show(viewport);
    expect(await screen.findByText(/^O que descreveste pode configurar assédio moral e salário em atraso\. Estas entidades ajudam/)).toBeInTheDocument();
    expect(screen.getByText(desktop ? /ajudam-te, sem custos\.$/ : /ajudam, sem custos\.$/)).toBeInTheDocument();
    expect(screen.getByText('Na tua avaliação: grita.')).toBeInTheDocument();
    expect(screen.getByTestId('unread')).toHaveTextContent('0');
  });

  it('avisos da moderação: removida, denúncia aceite e mantida, com motivo', async () => {
    seedStore({ messages: [notice('n1', 'removed', 'Tinha um nome.', 'Café Vinha'), notice('n2', 'upheld'), notice('n3', 'rejected')] });
    show(viewport);
    const section = (await screen.findByRole('heading', { name: 'Avisos da moderação' })).closest('section')!;
    expect(within(section).getByText('A tua avaliação de Café Vinha foi removida.')).toBeInTheDocument();
    expect(within(section).getByText('Motivo: Tinha um nome.')).toBeInTheDocument();
    expect(within(section).getByText('A tua denúncia sobre uma organização foi aceite: a avaliação foi removida.')).toBeInTheDocument();
    expect(within(section).getByText('Analisámos a tua denúncia sobre uma organização: a avaliação mantém-se.')).toBeInTheDocument();
  });

  it('contestar uma decisão: pedido por escrito (10+ caracteres), prazo, e o pedido fica em análise', async () => {
    seedStore({ messages: [notice('n1', 'removed', 'Tinha um nome.', 'Café Vinha', { status: 'available', until: '2027-04-12T10:00:00.000Z' })] });
    const { user } = show(viewport);
    const card = (await screen.findByText('A tua avaliação de Café Vinha foi removida.')).closest('.card') as HTMLElement;
    expect(within(card).getByText(/Podes pedir que a decisão seja revista até 12\/04\/2027/)).toBeInTheDocument();
    await user.click(within(card).getByRole('button', { name: 'Contestar esta decisão' }));
    const box = within(card).getByRole('textbox', { name: 'Porque deve ser revista?' });
    const send = within(card).getByRole('button', { name: 'Pedir revisão' });
    expect(send).toBeDisabled();
    await user.type(box, 'Não tinha nome nenhum.');
    await user.click(send);
    expect(await within(card).findByRole('status')).toHaveTextContent('Pedido de revisão enviado. Uma pessoa da equipa revê a decisão e responde aqui.');
    expect(within(card).queryByRole('button', { name: 'Contestar esta decisão' })).not.toBeInTheDocument();
  });

  it('estado do pedido: em análise, prazo terminado; e a resposta explica os passos seguintes', async () => {
    seedStore({
      messages: [
        notice('n1', 'removed', '', 'Café Vinha', { status: 'open' }),
        notice('n2', 'rejected', '', 'Oficina Sete', { status: 'expired' }),
        notice('n3', 'appeal_confirmed', 'As regras proíbem nomes.', 'Café Vinha'),
        notice('n4', 'appeal_reversed', 'Afinal não tinha nome.', 'Lavandaria Sol'),
      ],
    });
    show(viewport);
    expect(await screen.findByText('Pedido de revisão em análise. Respondemos aqui.')).toBeInTheDocument();
    expect(screen.getByText('O prazo para contestar esta decisão terminou.')).toBeInTheDocument();
    expect(screen.getByText('Revimos a tua contestação sobre Café Vinha: a decisão mantém-se.')).toBeInTheDocument();
    expect(screen.getByText('Revimos a tua contestação sobre Lavandaria Sol: a decisão foi revertida.')).toBeInTheDocument();
    expect(screen.getAllByText(/resolução extrajudicial de litígios/)).toHaveLength(1);
    expect(screen.queryByRole('button', { name: 'Contestar esta decisão' })).not.toBeInTheDocument();
  });

  it('o que pode ajudar (acordeão)', async () => {
    const { user } = show(viewport);
    await user.click(await screen.findByRole('button', { name: /O que pode ajudar/ }));
    expect(screen.getByText('Guarda recibos, contrato e mensagens.')).toBeInTheDocument();
    if (desktop) expect(screen.getByText(/Confirma horários e contactos/)).toBeInTheDocument();
    else expect(screen.queryByText(/Confirma horários e contactos/)).not.toBeInTheDocument();
  });

  it('voltar sem histórico leva ao perfil', async () => {
    const { user } = show(viewport);
    await user.click(await screen.findByRole('button', { name: 'Voltar' }));
    expect(screen.getByTestId('outra-rota')).toBeInTheDocument();
  });
});
