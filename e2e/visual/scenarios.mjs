// Ecrãs e estados comparados no refactoring (build de demonstração: HashRouter, dados de exemplo, sem API).
// Cada cenário corre em telemóvel (390) e computador (1440).
const draft = {
  draft: { orgId: 'padaria-ribeira', locationId: 'flores', scores: { ambiente: 3, salario: 4 }, recommend: true, tags: ['Horários cumpridos'], text: 'O salário chega sempre atrasado e o Ricardo grita.', verified: null },
  prefs: ['respeito', 'salario', 'equilibrio'],
};

/** Estado com uma avaliação acabada de publicar (com ou sem relato grave) */
const published = (flagged) => ({
  lastPublished: 'novo-1',
  myReviews: [{ id: 'novo-1', orgId: 'padaria-ribeira', scores: { salario: 3, equilibrio: 3, respeito: 4, ambiente: 4, lideranca: 4, estabilidade: 3, progressao: 3, proposito: 4 }, avg: 3.5, recommend: true, tags: [], text: 'Texto.', when: 'agora', flagged }],
});

export const STORAGE_KEY = 'peekjob-poc-v1';
export const STATE = draft;

/** Carrega no primeiro elemento com este nome acessível, se existir neste tamanho de ecrã */
async function tap(p, role, name, { force = false } = {}) {
  const el = p.getByRole(role, { name }).first();
  if (!(await el.count())) return;
  await el.click({ force }); // force: botões com aria-disabled que continuam clicáveis (explicam porque não avançam)
  await p.waitForTimeout(120); // deixa o React aplicar o estado antes do passo seguinte
}

/** Página da organização com tudo aberto: critérios, respeito, mapa, todas as avaliações, útil */
async function openOrg(p) {
  await tap(p, 'button', /^Ver os 8 critérios/);
  await tap(p, 'button', /^Respeito e inclusão/);
  await tap(p, 'button', /^Ver o que dizem/);
  await tap(p, 'button', /^Ver mapa|^\d+ locais/);
  await tap(p, 'radio', /Campanhã/);
  await tap(p, 'button', /^Ver todas as \d+ avaliações/);
  await tap(p, 'button', /^Útil/);
  await tap(p, 'button', /^Guardar$/);
}

/** { name, path, mobileOnly?, full?, state?, run?(page) } — `state` junta-se ao estado inicial da loja; — `run` prepara um estado depois de abrir a página; `full` fotografa a página toda */
export const SCENARIOS = [
  { name: 'inicio', path: '/' },
  { name: 'inicio-espreitar', path: '/?lado=espreitar' },
  { name: 'inicio-avaliar', path: '/?lado=avaliar' },
  { name: 'explorar', path: '/explorar' },
  { name: 'explorar-inicio', path: '/explorar', full: true, state: { onboarded: true } },
  { name: 'explorar-primeira', path: '/explorar', full: true, state: { onboarded: false } },
  {
    name: 'explorar-prioridades',
    path: '/explorar',
    full: true,
    state: { onboarded: true, prefs: [] },
    run: async (p) => {
      await tap(p, 'button', /^Salário justo/);
      await tap(p, 'button', /^Respeito e inclusão/);
      await tap(p, 'button', /^Ambiente/);
      await p.waitForTimeout(500); // reordenação animada
    },
  },
  { name: 'ranking', path: '/ranking', full: true },
  {
    name: 'ranking-escolhida',
    path: '/ranking?ordem=nota',
    full: true,
    run: async (p) => {
      await tap(p, 'button', /Clínica Foz/);
      await tap(p, 'button', /^Ver os 8 critérios/);
      await tap(p, 'button', /^Ver mais \d+/);
      await p.getByRole('button', { name: /Lavandaria Sol/ }).first().hover().catch(() => {});
    },
  },
  { name: 'ranking-filtros', path: '/ranking?setor=Comunidade&tipo=Voluntariado&resp=1', full: true },
  { name: 'ranking-vazio', path: '/ranking?dist=Braga&ver=1' },
  {
    name: 'ranking-folha',
    path: '/ranking?tipo=PME&ver=1',
    mobileOnly: true,
    run: async (p) => {
      await tap(p, 'button', /^Filtros, \d+ activos/);
      await p.waitForTimeout(400);
    },
  },
  { name: 'pesquisa', path: '/pesquisa', full: true },
  { name: 'pesquisa-sem-prioridades', path: '/pesquisa', full: true, state: { prefs: [] } },
  {
    name: 'pesquisa-escrever',
    path: '/pesquisa',
    full: true,
    run: async (p) => {
      await p.getByRole('searchbox').first().fill('porto'); // foco, botão de limpar e resultados depois da espera
      await p.waitForTimeout(1300);
    },
  },
  { name: 'pesquisa-vazia', path: '/pesquisa?q=zzz', full: true, run: (p) => p.waitForTimeout(1300) },
  { name: 'pesquisa-tipo', path: '/pesquisa', full: true, run: (p) => tap(p, 'button', /^Voluntariado$/) },
  { name: 'pesquisa-ver-mais', path: '/pesquisa', full: true, run: (p) => tap(p, 'button', /^Ver mais \d+$/) },
  { name: 'organizacao', path: '/org/padaria-ribeira', full: true },
  { name: 'organizacao-aberta', path: '/org/padaria-ribeira', full: true, run: openOrg },
  {
    name: 'organizacao-entrevistas',
    path: '/org/padaria-ribeira/entrevistas',
    full: true,
    run: async (p) => {
      await tap(p, 'button', /^Ver mais números/);
      await tap(p, 'button', /^Ver todas as \d+ entrevistas/);
    },
  },
  { name: 'organizacao-salarios', path: '/org/padaria-ribeira/salarios', full: true, run: (p) => tap(p, 'button', /^Porque não aparecem/) },
  { name: 'organizacao-assedio', path: '/org/lavandaria-sol', full: true, run: openOrg },
  { name: 'organizacao-assedio-salarios', path: '/org/lavandaria-sol/salarios', full: true },
  { name: 'organizacao-voluntariado', path: '/org/rede-vizinha', full: true, run: openOrg },
  { name: 'organizacao-voluntariado-salarios', path: '/org/rede-vizinha/salarios', full: true },
  { name: 'organizacao-voluntariado-entrevistas', path: '/org/rede-vizinha/entrevistas', full: true },
  { name: 'organizacao-nao-encontrada', path: '/org/nao-existe' },
  { name: 'painel', path: '/painel', full: true },
  {
    name: 'painel-aberto',
    path: '/painel',
    full: true,
    run: async (p) => {
      await tap(p, 'button', /^Ver o pulso da semana/);
      await tap(p, 'button', /^Ver todos os 8/);
      await tap(p, 'button', /^Responder$/);
      await tap(p, 'button', /^Publicar resposta$/);
      await tap(p, 'button', /^Responder$/);
    },
  },
  { name: 'sobre', path: '/sobre' },
  { name: 'contacto', path: '/contacto' },
  { name: 'metodologia', path: '/metodologia', full: true },
  {
    name: 'metodologia-aberta',
    path: '/metodologia',
    full: true,
    run: async (p) => {
      await tap(p, 'button', /^Más · 2,4/);
      await tap(p, 'button', /^0$/);
      await tap(p, 'button', /^Como nasce a tua/);
      await tap(p, 'button', /^Norte Logística$/);
      await p.waitForTimeout(700); // transição do anel
    },
  },
  {
    name: 'metodologia-moderacao',
    path: '/metodologia',
    full: true,
    run: async (p) => {
      await tap(p, 'button', /^Moderação com critério/);
      await tap(p, 'button', /^25$/);
      await p.waitForTimeout(700);
    },
  },
  { name: 'setores', path: '/setores', full: true },
  {
    name: 'setores-tipo',
    path: '/setores',
    full: true,
    run: async (p) => {
      await tap(p, 'button', /Voluntariado/);
      await tap(p, 'button', /^Mais respeito$/);
      await p.getByRole('link', { name: /Comunidade/ }).first().hover().catch(() => {});
    },
  },
  { name: 'preferencias', path: '/preferencias', full: true },
  { name: 'preferencias-vazias', path: '/preferencias', full: true, state: { prefs: [] } },
  { name: 'preferencias-tirar', path: '/preferencias', full: true, run: (p) => tap(p, 'button', /^Respeito e inclusão/) },
  { name: 'para-organizacoes', path: '/para-organizacoes', full: true },
  { name: 'para-organizacoes-pergunta', path: '/para-organizacoes', full: true, run: (p) => tap(p, 'button', /^Pagar o Pro melhora/) },
  { name: 'entrar', path: '/entrar' },
  {
    name: 'entrar-erro',
    path: '/entrar',
    run: async (p) => {
      await p.locator('#le').fill('ana@');
      await tap(p, 'button', /^Receber link de acesso/);
    },
  },
  {
    name: 'entrar-enviado',
    path: '/entrar',
    run: async (p) => {
      await p.locator('#le').fill('ana@gmail.com');
      await tap(p, 'button', /^Receber link de acesso/);
    },
  },
  { name: 'guardadas', path: '/guardadas', full: true },
  { name: 'guardadas-vazia', path: '/guardadas', state: { saved: [] } },
  { name: 'guardadas-desfazer', path: '/guardadas', run: (p) => tap(p, 'button', /^Deixar de guardar Padaria Ribeira$/) },
  { name: 'perfil', path: '/perfil', full: true },
  { name: 'perfil-sem-sessao', path: '/perfil', full: true, state: { user: null } },
  {
    name: 'perfil-mensagens',
    path: '/perfil',
    full: true,
    state: { messages: [{ id: 'm1', orgId: 'padaria-ribeira', kinds: ['assedio'], found: [], when: 'há 2 dias', read: false }] },
    run: async (p) => {
      await tap(p, 'button', /^As minhas avaliações/);
      await tap(p, 'button', /^Repor dados de demonstração/);
    },
  },
  { name: 'meus-dados', path: '/perfil/dados', full: true },
  { name: 'meus-dados-confirmar', path: '/perfil/dados', full: true, run: (p) => tap(p, 'button', /^Apagar a minha conta$/) },
  {
    name: 'meus-dados-apagada',
    path: '/perfil/dados',
    run: async (p) => {
      await tap(p, 'button', /^Apagar a minha conta$/);
      await tap(p, 'checkbox', /^Manter as minhas avaliações/);
      await tap(p, 'button', /^Apagar definitivamente$/);
    },
  },
  { name: 'apoio', path: '/apoio', full: true },
  {
    name: 'apoio-mensagem',
    path: '/apoio',
    full: true,
    state: {
      messages: [
        { id: 'm1', orgId: 'padaria-ribeira', kinds: ['assedio', 'discriminação'], found: ['assédio', 'insultos'], when: 'há 2 dias', read: false },
        { id: 'n1', orgId: 'padaria-ribeira', type: 'moderation', orgName: 'Padaria Ribeira', details: { decision: 'removed', note: 'Dados pessoais.' }, kinds: [], found: [], when: 'ontem', read: false },
        { id: 'n2', orgId: 'padaria-ribeira', type: 'moderation', details: { decision: 'rejected', note: '' }, kinds: [], found: [], when: 'hoje', read: false },
      ],
    },
  },
  { name: 'apoio-dicas', path: '/apoio', full: true, run: (p) => tap(p, 'button', /^O que pode ajudar/) },
  { name: '404', path: '/nao-existe' },
  { name: 'denunciar', path: '/org/padaria-ribeira/denunciar/r1', full: true },
  {
    name: 'denunciar-sem-motivo',
    path: '/org/padaria-ribeira/denunciar/i1',
    full: true,
    run: async (p) => {
      await tap(p, 'button', /^Enviar denúncia$/, { force: true });
      await tap(p, 'button', /^Adicionar detalhe/);
      await tap(p, 'button', /^Ver os 3 passos/);
    },
  },
  {
    name: 'denunciar-enviada',
    path: '/org/padaria-ribeira/denunciar/r1',
    full: true,
    run: async (p) => {
      await tap(p, 'radio', /Identifica uma pessoa/);
      await tap(p, 'button', /^Enviar denúncia$/);
      // a referência depende da hora: esconde-a para comparar
      await p.addStyleTag({ content: '.mono.small.muted { visibility: hidden }' });
    },
  },
  { name: 'denunciar-nao-encontrado', path: '/org/padaria-ribeira/denunciar/nao-existe' },
  { name: 'moderacao', path: '/moderacao', full: true },
  {
    name: 'moderacao-decisao',
    path: '/moderacao',
    full: true,
    run: async (p) => {
      await tap(p, 'button', /^Identifica uma pessoa pelo nome/);
      await tap(p, 'button', /^Remover avaliação$/);
    },
  },
  {
    name: 'moderacao-organizacoes',
    path: '/moderacao',
    full: true,
    run: async (p) => {
      await tap(p, 'tab', /Organizações novas/);
      await p.getByRole('button', { name: 'Rejeitar' }).nth(1).click();
      await p.waitForTimeout(120);
    },
  },
  { name: 'avaliar-escolher', path: '/avaliar' },
  { name: 'avaliar-verificar', path: '/avaliar/verificar' },
  {
    name: 'avaliar-codigo',
    path: '/avaliar/verificar',
    run: async (p) => {
      await p.locator('#ve').fill('ana@padaria.pt');
      await p.locator('#ve').press('Enter');
      await p.locator('body').click({ position: { x: 5, y: 300 } });
    },
  },
  { name: 'avaliar-documento', path: '/avaliar/verificar', run: (p) => p.getByRole('tab').nth(1).click() },
  { name: 'avaliar-notas', path: '/avaliar/notas', full: true },
  {
    name: 'avaliar-notas-abertas',
    path: '/avaliar/notas',
    full: true,
    run: async (p) => {
      await tap(p, 'button', /^O que conta em Ambiente/);
      await tap(p, 'button', /^Contar como é/); // telemóvel: o comentário abre-se no mesmo ecrã
      await tap(p, 'button', /^Ver mais \d+ etiquetas/);
      await tap(p, 'radio', /^Respeito e inclusão, 4 de 5/);
      await tap(p, 'button', /^Não$/);
    },
  },
  { name: 'avaliar-comentario', path: '/avaliar/notas', mobileOnly: true, full: true, run: (p) => tap(p, 'button', /^Contar como é/) },
  { name: 'avaliar-verificar-depois', path: '/avaliar/verificar?org=padaria-ribeira' },
  { name: 'avaliar-feito-vazio', path: '/avaliar/feito', state: { lastPublished: null } },
  { name: 'avaliar-feito', path: '/avaliar/feito', full: true, state: published(false), run: (p) => tap(p, 'button', /^Ver as tuas 8 notas/) },
  { name: 'avaliar-feito-apoio', path: '/avaliar/feito', full: true, state: { ...published(true), user: null } },
  { name: 'avaliar-feito-mensagem', path: '/avaliar/feito', full: true, state: published(true) },
];
