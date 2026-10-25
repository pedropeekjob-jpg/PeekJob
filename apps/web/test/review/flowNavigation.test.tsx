import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Link, MemoryRouter, Route, Routes, useNavigate, useParams } from 'react-router';
import { beforeEach, describe, expect, it } from 'vitest';
import { LangRoot } from '../../src/i18n';
import { StoreProvider } from '../../src/lib/store';
import AvaliarCargo from '../../src/pages/AvaliarCargo';
import AvaliarEscolher from '../../src/pages/AvaliarEscolher';
import AvaliarFeito from '../../src/pages/AvaliarFeito';
import AvaliarNotas from '../../src/pages/AvaliarNotas';
import AvaliarVerificar from '../../src/pages/AvaliarVerificar';
import { FlowReturn } from '../../src/features/review/FlowReturn';
import { flowStateOf } from '../../src/features/review/useFlowNav';
import { setViewport } from '../utils/render';
import { setScore } from '../utils/score';

/** Lista e página da organização a fingir: só interessa onde se está e o "voltar" do browser */
function Lista() {
  return <h1>lista</h1>;
}
/** O "voltar" do browser, em qualquer ecrã a fingir */
function Back() {
  const nav = useNavigate();
  return (
    <button type="button" onClick={() => nav(-1)}>
      voltar do browser
    </button>
  );
}
function Inicio() {
  return (
    <>
      <h1>início</h1>
      <Link to="/avaliar?q=oficina">trabalho em oficina</Link>
      <Back />
    </>
  );
}
function Perfil() {
  return (
    <>
      <h1>perfil</h1>
      <Link to="/avaliar/verificar">verificação</Link>
    </>
  );
}
function Org() {
  const nav = useNavigate();
  const { id } = useParams();
  return (
    <>
      <h1>org {id}</h1>
      <Link to="/avaliar?org=oficina-sete">avaliar oficina</Link>
      <Link to="/avaliar?org=padaria-ribeira">avaliar padaria</Link>
      <button type="button" onClick={() => nav(-1)}>
        voltar do browser
      </button>
    </>
  );
}

function show(viewport: 'mobile' | 'desktop', entries = ['/pesquisa', '/org/oficina-sete']) {
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
            <Route path="/avaliar/cargo" element={<AvaliarCargo />} />
            <Route path="/avaliar/notas" element={<AvaliarNotas />} />
            <Route path="/avaliar/feito" element={<AvaliarFeito />} />
            <Route path="/avaliar/verificar" element={<AvaliarVerificar />} />
            <Route path="/perfil" element={<Perfil />} />
            <Route path="/" element={<Inicio />} />
          </Routes>
          <FlowReturn />
        </MemoryRouter>
      </LangRoot>
    </StoreProvider>,
  );
  return user;
}
/** Espera pelo ecrã (pelo título) e confirma que está lá */
const at = async (name: string | RegExp) => expect(await screen.findByRole('heading', { level: 1, name })).toBeInTheDocument();
const closeLabel = /^(Fechar|Cancelar)/;
/** O teu trabalho lá (25/10): cargo e período, e continuar para as notas */
async function job(user: ReturnType<typeof userEvent.setup>) {
  await at('O teu trabalho lá');
  const role = screen.getByRole('combobox', { name: 'Cargo ou função' });
  if (!(role as HTMLInputElement).value) await user.type(role, 'Carpintaria');
  await user.click(screen.getByRole('button', { name: 'Sim, trabalho lá' }));
  await user.selectOptions(screen.getByRole('combobox', { name: 'Desde' }), '2022');
  await user.click(screen.getByRole('button', { name: /^Continuar/ }));
}

describe.each(['mobile', 'desktop'] as const)('avaliar: sair do fluxo volta para onde se estava (%s)', (viewport) => {
  beforeEach(() => localStorage.clear());

  it('lista → organização (um local) → notas → fechar volta à organização; voltar volta à lista', async () => {
    const user = show(viewport);
    await user.click(screen.getByRole('link', { name: 'avaliar oficina' }));
    await job(user);
    await screen.findAllByRole('radiogroup');
    if (viewport === 'desktop') return; // no computador as notas não têm "fechar" (o cabeçalho leva a qualquer lado)
    await user.click(screen.getByRole('button', { name: /^Fechar/ }));
    await at(/^org/);
    await user.click(screen.getByRole('button', { name: 'voltar do browser' }));
    await at('lista');
  });

  it('com vários locais (escolher → notas): fechar também volta à organização, e voltar à lista', async () => {
    const user = show(viewport);
    await user.click(screen.getByRole('link', { name: 'avaliar padaria' }));
    await user.click(await screen.findByRole('button', { name: /^Continuar/ }));
    await job(user);
    await screen.findAllByRole('radiogroup');
    if (viewport === 'desktop') return;
    await user.click(screen.getByRole('button', { name: /^Fechar/ }));
    await at(/^org/);
    await user.click(screen.getByRole('button', { name: 'voltar do browser' }));
    await at('lista');
  });

  it('fechar/cancelar na escolha volta à organização (não ao início)', async () => {
    const user = show(viewport);
    await user.click(screen.getByRole('link', { name: 'avaliar padaria' }));
    await screen.findByRole('radiogroup', { name: 'Local de trabalho' });
    await user.click(screen.getByRole('button', { name: closeLabel }));
    await at(/^org/);
    await user.click(screen.getByRole('button', { name: 'voltar do browser' }));
    await at('lista');
  });

  it('aberto diretamente (sem histórico): fechar vai para a organização', async () => {
    if (viewport === 'desktop') return;
    const user = show(viewport, ['/avaliar?org=oficina-sete']);
    await job(user);
    await screen.findAllByRole('radiogroup');
    await user.click(screen.getByRole('button', { name: /^Fechar/ }));
    await at(/^org/);
  });
});

describe('avaliar: publicar', () => {
  beforeEach(() => localStorage.clear());
  it('"publicado" substitui as notas: fechar volta à organização e voltar à lista (nunca às notas vazias)', async () => {
    const user = show('mobile');
    await user.click(screen.getByRole('link', { name: 'avaliar oficina' }));
    await job(user);
    await screen.findAllByRole('radiogroup', { name: 'Ambiente' });
    setScore('Ambiente', 4);
    await user.click(screen.getByRole('button', { name: /Publicar avaliação/ }));
    await screen.findByRole('heading', { level: 1, name: 'Já está. Obrigado por partilhares!' });
    await user.click(screen.getByRole('button', { name: /^Fechar/ }));
    await at(/^org/);
    await user.click(screen.getByRole('button', { name: 'voltar do browser' }));
    await at('lista');
  });
});

/** Publica a partir das notas (uma nota chega) */
async function publish(user: ReturnType<typeof userEvent.setup>) {
  await job(user);
  await screen.findAllByRole('radiogroup', { name: 'Ambiente' });
  setScore('Ambiente', 4);
  await user.click(screen.getByRole('button', { name: /Publicar avaliação/ }));
  await screen.findByRole('heading', { level: 1, name: 'Já está. Obrigado por partilhares!' });
}
const back = (user: ReturnType<typeof userEvent.setup>) => user.click(screen.getByRole('button', { name: 'voltar do browser' }));

describe.each(['mobile', 'desktop'] as const)('avaliar: todos os caminhos de saída (%s)', (viewport) => {
  beforeEach(() => localStorage.clear());

  it('mudar de organização nas notas não deixa ecrãs para trás: "Ver na página" abre a nova; voltar leva à anterior e depois à lista', async () => {
    const user = show(viewport);
    await user.click(screen.getByRole('link', { name: 'avaliar oficina' }));
    await job(user);
    await screen.findAllByRole('radiogroup');
    // "Mudar" (telemóvel) ou o passo 1 "Organização" (computador)
    await user.click(viewport === 'mobile' ? screen.getByRole('button', { name: 'Mudar' }) : screen.getByRole('button', { name: /Passo 1, Organização/ }));
    await user.click(await screen.findByRole('button', { name: 'Escolher outra organização' }).catch(() => screen.getByRole('searchbox')));
    await user.type(screen.getByRole('searchbox', { name: /Nome da organização/ }), 'padaria');
    await user.click(await screen.findByRole('button', { name: /Padaria Ribeira/ }));
    await user.click(await screen.findByRole('button', { name: /^Continuar/ }));
    await publish(user);
    await user.click(screen.getAllByRole('link', { name: 'Ver na página da organização' })[0]);
    await at('org padaria-ribeira');
    await back(user);
    await at('org oficina-sete');
    await back(user);
    await at('lista');
  });

  it('"publicado" → "Ver na página da organização" volta à organização (não abre outra); voltar leva à lista', async () => {
    const user = show(viewport);
    await user.click(screen.getByRole('link', { name: 'avaliar oficina' }));
    await publish(user);
    await user.click(screen.getAllByRole('link', { name: 'Ver na página da organização' })[0]);
    await at(/^org/);
    await back(user);
    await at('lista');
  });

  it('"publicado" → "Voltar ao início": o voltar seguinte não reabre "publicado"', async () => {
    const user = show(viewport);
    await user.click(screen.getByRole('link', { name: 'avaliar oficina' }));
    await publish(user);
    await user.click(screen.getAllByRole('link', { name: 'Voltar ao início' })[0]);
    await at('início');
    await back(user);
    await at(/^org/);
  });

  it('verificar depois de publicar: "Agora não" volta ao mesmo "publicado" (sem o duplicar); depois sair leva à organização e à lista', async () => {
    const user = show(viewport);
    await user.click(screen.getByRole('link', { name: 'avaliar oficina' }));
    await publish(user);
    await user.click(screen.getByRole('link', { name: 'Confirmar agora' }));
    await user.click(await screen.findAllByRole('button', { name: 'Agora não' }).then((b) => b[0]));
    await screen.findByRole('heading', { level: 1, name: 'Já está. Obrigado por partilhares!' });
    await user.click(screen.getAllByRole('link', { name: 'Ver na página da organização' })[0]);
    await at(/^org/);
    await back(user);
    await at('lista');
  });

  it('verificar depois de publicar e confirmar: volta a "publicado", agora verificada', async () => {
    const user = show(viewport);
    await user.click(screen.getByRole('link', { name: 'avaliar oficina' }));
    await publish(user);
    await user.click(screen.getByRole('link', { name: 'Confirmar agora' }));
    await user.type(await screen.findByRole('textbox', { name: /Email (do trabalho|da organização)/ }), 'ana@oficina.pt{Enter}');
    await user.click(screen.getAllByRole('textbox', { name: /Dígito 1 de 6/ })[0]);
    await user.paste('123456');
    await user.click(screen.getByRole('button', { name: 'Confirmar' }));
    expect(await screen.findByText('Avaliação verificada.')).toBeInTheDocument();
    await user.click(screen.getAllByRole('link', { name: 'Ver na página da organização' })[0]);
    await at(/^org/);
    await back(user);
    await at('lista');
  });

  it('da página inicial ("O teu trabalho" → pesquisa): sair volta ao início, e voltar ao ecrã anterior', async () => {
    const user = show(viewport, ['/pesquisa', '/']);
    await user.click(screen.getByRole('link', { name: 'trabalho em oficina' }));
    await user.click(await screen.findByRole('button', { name: /Oficina Sete/ }));
    await publish(user);
    await user.click(screen.getAllByRole('link', { name: 'Voltar ao início' })[0]);
    await at('início');
    await back(user);
    await at('lista');
  });

  it('"Verificação" no Perfil: "Agora não" volta ao Perfil (não às notas de um rascunho)', async () => {
    const user = show(viewport, ['/pesquisa', '/perfil']);
    await user.click(screen.getByRole('link', { name: 'verificação' }));
    await user.click(await screen.findAllByRole('button', { name: 'Agora não' }).then((b) => b[0]));
    await at('perfil');
  });
});

describe('avaliar: fluxo aberto sem nada antes', () => {
  it('a primeira entrada de um separador (mesmo depois de substituída) não tem para onde voltar', () => {
    expect(flowStateOf(null, 'default', 0)).toEqual({ flowDepth: 1, flowHasPrev: false });
    expect(flowStateOf(null, 'abc', 0)).toEqual({ flowDepth: 1, flowHasPrev: false }); // ex.: /entrar substituído por /avaliar/notas
    expect(flowStateOf(null, 'abc', 3)).toEqual({ flowDepth: 1, flowHasPrev: true });
    expect(flowStateOf(null, 'abc', undefined)).toEqual({ flowDepth: 1, flowHasPrev: true }); // router em memória (testes)
  });
});
