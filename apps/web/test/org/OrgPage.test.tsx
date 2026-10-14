import { useLocation } from 'react-router';
import { screen, within } from '@testing-library/react';
import { useEffect, useState, type ReactNode } from 'react';
import { beforeEach, describe, expect, it } from 'vitest';
import { useStore } from '../../src/lib/store';
import OrgPage from '../../src/pages/OrgPage';
import { renderScreen } from '../utils/render';

type Tab = 'avaliacoes' | 'entrevistas' | 'salarios';
const PATH: Record<Tab, string> = { avaliacoes: '/org/:id', entrevistas: '/org/:id/entrevistas', salarios: '/org/:id/salarios' };
const url = (id: string, tab: Tab) => `/org/${id}${tab === 'avaliacoes' ? '' : `/${tab}`}`;
const show = (viewport: 'mobile' | 'desktop', id = 'padaria-ribeira', tab: Tab = 'avaliacoes', wrap?: (n: ReactNode) => ReactNode) =>
  renderScreen(<>{wrap ? wrap(<OrgPage tab={tab} />) : <OrgPage tab={tab} />}</>, { route: url(id, tab), path: PATH[tab], viewport, outside: <Probe /> });

function Probe() {
  const { draft, saved } = useStore();
  const { pathname, search } = useLocation();
  return <output data-testid="probe">{`${draft.orgId ?? ''}|${saved.join(',')}|${pathname}${search}`}</output>;
}

/** Cria uma organização nova (sem avaliações) e mostra a página dela */
function WithNewOrg({ children }: { children: ReactNode }) {
  const { addOrg } = useStore();
  const [ready, setReady] = useState(false);
  useEffect(() => {
    void addOrg({ name: 'Horta da Sé', type: 'Associação', city: 'Porto' }).then(() => setReady(true));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  return ready ? <>{children}</> : null;
}

describe.each(['mobile', 'desktop'] as const)('Página da organização (%s)', (viewport) => {
  beforeEach(() => localStorage.clear());
  const desktop = viewport === 'desktop';

  it('resumo: nome, nota, compatibilidade e título da página', async () => {
    show(viewport);
    expect(await screen.findByRole('heading', { level: 1, name: 'Padaria Ribeira' })).toBeInTheDocument();
    expect(screen.getByRole('img', { name: /^Nota 4,4 de 5, com 23 avaliações$/ })).toBeInTheDocument();
    expect(screen.getAllByText(/para ti/).length).toBeGreaterThan(0);
    expect(document.title).toMatch(/^Padaria Ribeira · Avaliações de quem lá trabalha · PeekJob$/);
  });

  it('guardar e avaliar', async () => {
    const { user } = show(viewport);
    // a demonstração pode já trazer a organização guardada: carregar duas vezes volta ao estado inicial
    const save = await screen.findByRole('button', { name: /^Guardad?a?r?$/ });
    const was = save.getAttribute('aria-pressed') === 'true';
    await user.click(save);
    expect(save).toHaveAttribute('aria-pressed', String(!was));
    expect(save).toHaveTextContent(was ? 'Guardar' : 'Guardada');
    expect(screen.getByTestId('probe').textContent!.split('|')[1].includes('padaria-ribeira')).toBe(!was);
    await user.click(screen.getAllByRole('button', { name: 'Avaliar esta organização' })[0]);
    expect(screen.getByTestId('probe')).toHaveTextContent(/^padaria-ribeira\|/);
    // entra no fluxo de avaliar (a verificação é depois de publicar)
    expect(screen.getByTestId('probe')).toHaveTextContent(/\|\/avaliar\?org=padaria-ribeira$/);
  });

  it('avaliações: 2 primeiro, depois todas; útil conta mais um; denunciar', async () => {
    const { user } = show(viewport);
    const list = await screen.findAllByRole('article');
    expect(list).toHaveLength(2);
    await user.click(screen.getByRole('button', { name: 'Ver todas as 23 avaliações' }));
    expect(screen.getAllByRole('article')).toHaveLength(5);
    const first = screen.getAllByRole('article')[0];
    await user.click(within(first).getByRole('button', { name: 'Útil, 7 pessoas' }));
    expect(within(first).getByRole('button', { name: 'Útil, 8 pessoas' })).toHaveAttribute('aria-pressed', 'true');
    expect(within(first).getByRole('link', { name: /Denunciar/ })).toHaveAttribute('href', '/org/padaria-ribeira/denunciar/r1');
    expect(within(first).getByRole('img', { name: 'Avaliação verificada' })).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Mostrar menos' }));
    expect(screen.getAllByRole('article')).toHaveLength(2);
  });

  it('critérios: prioridades primeiro, os 8 a pedido; respeito com relatos e etiquetas', async () => {
    const { user } = show(viewport);
    const crit = await screen.findByRole('heading', { name: desktop ? 'As tuas prioridades' : 'O que mais te importa' });
    const section = crit.closest('section')!;
    const before = within(section).getAllByRole('group').length;
    await user.click(within(section).getByRole('button', { name: 'Ver os 8 critérios' }));
    expect(within(section).getAllByRole('group').length).toBeGreaterThan(before);
    if (desktop) {
      const resp = screen.getByRole('heading', { name: 'Respeito e inclusão' }).closest('section')!;
      expect(resp).toHaveTextContent('0 relatos de assédio em 23 avaliações.');
      await user.click(within(resp).getByRole('button', { name: 'Ver o que dizem' }));
      expect(within(resp).getByRole('list', { name: /respeito e inclusão/ })).toBeInTheDocument();
    } else {
      await user.click(within(section).getByRole('button', { name: /Respeito e inclusão/ }));
      expect(section).toHaveTextContent('0 relatos de assédio em 23 avaliações.');
      expect(within(section).getByRole('list', { name: /respeito e inclusão/ })).toBeInTheDocument();
    }
  });

  it('locais: dois locais para escolher', async () => {
    const { user } = show(viewport);
    // o mapa abre a pedido nos dois tamanhos (ecrã mais limpo)
    await user.click(await screen.findByRole('button', { name: /Ver mapa/ }));
    const radios = within(await screen.findByRole('radiogroup', { name: 'Locais' })).getAllByRole('radio');
    expect(radios).toHaveLength(2);
    await user.click(radios[1]);
    expect(radios[1]).toHaveAttribute('aria-checked', 'true');
    if (desktop) expect(screen.getByRole('link', { name: /Abrir no mapa/ })).toHaveAttribute('href', expect.stringContaining('openstreetmap.org'));
  });

  it('entrevistas: resumo, números e lista', async () => {
    const { user } = show(viewport, 'padaria-ribeira', 'entrevistas');
    expect(await screen.findByRole('link', { name: /Entrevistas/, current: 'page' })).toBeInTheDocument();
    if (desktop) {
      expect(screen.getByRole('heading', { name: 'Em resumo' })).toBeInTheDocument();
      expect(screen.getByText('Receberam oferta').nextSibling).toHaveTextContent('%');
    } else {
      expect(screen.getByText('tiveram boa experiência')).toBeInTheDocument();
      await user.click(screen.getByRole('button', { name: 'Ver mais números' }));
      expect(screen.getByText('Processo mais comum')).toBeInTheDocument();
    }
    expect(screen.getAllByRole('article')).toHaveLength(2);
    await user.click(screen.getByRole('button', { name: 'Ver todas as 3 entrevistas' }));
    expect(screen.getAllByRole('article')).toHaveLength(3);
    expect(screen.getAllByRole('button', { name: 'Partilhar a minha entrevista' }).length).toBe(1);
    await user.click(screen.getByRole('button', { name: 'Partilhar a minha entrevista' }));
    expect(screen.getByTestId('probe').textContent).toMatch(/\|\/partilhar\/entrevista\?org=padaria-ribeira$/);
  });

  it('salários: faixas por função, pontualidade e nota sobre o anonimato', async () => {
    const { user } = show(viewport, 'padaria-ribeira', 'salarios');
    expect(await screen.findAllByRole('img', { name: /: de .* a .*, valor do meio .*, \d+ salários/ })).toHaveLength(4);
    expect(screen.getByRole('img', { name: '92% dizem que o salário chega a horas' })).toBeInTheDocument();
    if (desktop) {
      await user.click(screen.getByRole('button', { name: /Porque não aparecem outras funções/ }));
      expect(screen.getByText(/Só mostramos uma função com pelo menos 3 salários/)).toBeInTheDocument();
      expect(screen.getByText(/Segundo \d+ de \d+ pessoas\./)).toBeInTheDocument();
    } else {
      expect(screen.getByText(/Valor grande = valor do meio/)).toBeInTheDocument();
    }
    await user.click(screen.getByRole('button', { name: 'Partilhar o meu salário' }));
    expect(screen.getByTestId('probe').textContent).toMatch(/\|\/partilhar\/salario\?org=padaria-ribeira$/);
  });

  it('voluntariado: sem salários e o botão é avaliar', async () => {
    const { user } = show(viewport, 'rede-vizinha', 'salarios');
    expect(await screen.findByText('Aqui o trabalho é voluntário.')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Avaliar esta organização' }));
    expect(screen.getByTestId('probe').textContent).toMatch(/\/avaliar\?org=rede-vizinha$/);
  });

  it('organização nova: sem nota, convite para ser a primeira', async () => {
    const { user } = show(viewport, 'nova-horta-da-se', 'avaliacoes', (n) => <WithNewOrg>{n}</WithNewOrg>);
    expect(await screen.findByRole('heading', { level: 1, name: 'Horta da Sé' })).toBeInTheDocument();
    expect(screen.getByRole('img', { name: 'Ainda sem nota' })).toBeInTheDocument();
    expect(screen.getByText('Ainda sem avaliações.')).toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: /As tuas prioridades|O que mais te importa/ })).not.toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Ser a primeira pessoa a avaliar' }));
    expect(screen.getByTestId('probe')).toHaveTextContent(/^nova-horta-da-se\|/);
  });

  it('não existe: explica e mostra o que procurou', async () => {
    show(viewport, 'nao-existe-mesmo');
    expect(await screen.findByRole('heading', { name: 'Não encontrámos esta organização.' })).toBeInTheDocument();
    expect(screen.getByText('nao-existe-mesmo')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Procurar organizações/ })).toHaveAttribute('href', '/pesquisa');
  });
});
