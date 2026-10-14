import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Link, MemoryRouter, Route, Routes, useNavigate } from 'react-router-dom';
import { beforeEach, describe, expect, it } from 'vitest';
import { LangRoot } from '../../src/i18n';
import { StoreProvider } from '../../src/lib/store';
import AvaliarEscolher from '../../src/pages/AvaliarEscolher';
import AvaliarFeito from '../../src/pages/AvaliarFeito';
import AvaliarNotas from '../../src/pages/AvaliarNotas';
import { setViewport } from '../utils/render';

/** Lista e página da organização a fingir: só interessa onde se está e o "voltar" do browser */
function Lista() {
  return <h1>lista</h1>;
}
function Org() {
  const nav = useNavigate();
  return (
    <>
      <h1>org</h1>
      <Link to="/avaliar?org=oficina-sete">avaliar oficina</Link>
      <Link to="/avaliar?org=padaria-ribeira">avaliar padaria</Link>
      <button type="button" onClick={() => nav(-1)}>
        voltar do browser
      </button>
    </>
  );
}

function show(viewport: 'mobile' | 'desktop', entries = ['/pesquisa', '/org/x']) {
  setViewport(viewport);
  const user = userEvent.setup();
  render(
    <StoreProvider>
      <LangRoot>
        <MemoryRouter initialEntries={entries} initialIndex={entries.length - 1}>
          <Routes>
            <Route path="/pesquisa" element={<Lista />} />
            <Route path="/org/:id" element={<Org />} />
            <Route path="/avaliar" element={<AvaliarEscolher />} />
            <Route path="/avaliar/notas" element={<AvaliarNotas />} />
            <Route path="/avaliar/feito" element={<AvaliarFeito />} />
            <Route path="/" element={<h1>início</h1>} />
          </Routes>
        </MemoryRouter>
      </LangRoot>
    </StoreProvider>,
  );
  return user;
}
const at = (name: string) => screen.findByRole('heading', { level: 1, name });
const closeLabel = /^(Fechar|Cancelar)/;

describe.each(['mobile', 'desktop'] as const)('avaliar: sair do fluxo volta para onde se estava (%s)', (viewport) => {
  beforeEach(() => localStorage.clear());

  it('lista → organização (um local) → notas → fechar volta à organização; voltar volta à lista', async () => {
    const user = show(viewport);
    await user.click(screen.getByRole('link', { name: 'avaliar oficina' }));
    await screen.findAllByRole('radiogroup');
    if (viewport === 'desktop') return; // no computador as notas não têm "fechar" (o cabeçalho leva a qualquer lado)
    await user.click(screen.getByRole('button', { name: /^Fechar/ }));
    await at('org');
    await user.click(screen.getByRole('button', { name: 'voltar do browser' }));
    await at('lista');
  });

  it('com vários locais (escolher → notas): fechar também volta à organização, e voltar à lista', async () => {
    const user = show(viewport);
    await user.click(screen.getByRole('link', { name: 'avaliar padaria' }));
    await user.click(await screen.findByRole('button', { name: /^Continuar/ }));
    await screen.findAllByRole('radiogroup');
    if (viewport === 'desktop') return;
    await user.click(screen.getByRole('button', { name: /^Fechar/ }));
    await at('org');
    await user.click(screen.getByRole('button', { name: 'voltar do browser' }));
    await at('lista');
  });

  it('fechar/cancelar na escolha volta à organização (não ao início)', async () => {
    const user = show(viewport);
    await user.click(screen.getByRole('link', { name: 'avaliar padaria' }));
    await screen.findByRole('radiogroup', { name: 'Local de trabalho' });
    await user.click(screen.getByRole('button', { name: closeLabel }));
    await at('org');
    await user.click(screen.getByRole('button', { name: 'voltar do browser' }));
    await at('lista');
  });

  it('aberto diretamente (sem histórico): fechar vai para a organização', async () => {
    if (viewport === 'desktop') return;
    const user = show(viewport, ['/avaliar?org=oficina-sete']);
    await screen.findAllByRole('radiogroup');
    await user.click(screen.getByRole('button', { name: /^Fechar/ }));
    await at('org');
  });
});

describe('avaliar: publicar', () => {
  beforeEach(() => localStorage.clear());
  it('"publicado" substitui as notas: fechar volta à organização e voltar à lista (nunca às notas vazias)', async () => {
    const user = show('mobile');
    await user.click(screen.getByRole('link', { name: 'avaliar oficina' }));
    await user.click((await screen.findAllByRole('radio', { name: 'Ambiente, 4 de 5' }))[0]);
    await user.click(screen.getByRole('button', { name: /Publicar avaliação/ }));
    await screen.findByRole('heading', { level: 1, name: 'Publicado. Obrigado.' });
    await user.click(screen.getByRole('button', { name: /^Fechar/ }));
    await at('org');
    await user.click(screen.getByRole('button', { name: 'voltar do browser' }));
    await at('lista');
  });
});
