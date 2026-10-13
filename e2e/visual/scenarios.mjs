// Ecrãs e estados comparados no refactoring (build de demonstração: HashRouter, dados de exemplo, sem API).
// Cada cenário corre em telemóvel (390) e computador (1440).
const draft = {
  draft: { orgId: 'padaria-ribeira', locationId: 'flores', scores: { ambiente: 3, salario: 4 }, recommend: true, tags: ['Horários cumpridos'], text: 'O salário chega sempre atrasado e o Ricardo grita.', verified: null },
  prefs: ['respeito', 'salario', 'equilibrio'],
};

export const STORAGE_KEY = 'peekjob-poc-v1';
export const STATE = draft;

/** Carrega no primeiro elemento com este nome acessível, se existir neste tamanho de ecrã */
async function tap(p, role, name) {
  const el = p.getByRole(role, { name }).first();
  if (!(await el.count())) return;
  await el.click();
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

/** { name, path, mobileOnly?, full?, run?(page) } — `run` prepara um estado depois de abrir a página; `full` fotografa a página toda */
export const SCENARIOS = [
  { name: 'inicio', path: '/' },
  { name: 'explorar', path: '/explorar' },
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
  { name: 'pesquisa', path: '/pesquisa' },
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
  { name: 'sobre', path: '/sobre' },
  { name: 'contacto', path: '/contacto' },
  { name: 'metodologia', path: '/metodologia' },
  { name: 'setores', path: '/setores' },
  { name: 'para-organizacoes', path: '/para-organizacoes' },
  { name: 'entrar', path: '/entrar' },
  { name: 'perfil', path: '/perfil' },
  { name: 'apoio', path: '/apoio' },
  { name: '404', path: '/nao-existe' },
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
  { name: 'avaliar-notas', path: '/avaliar/notas' },
  { name: 'avaliar-texto', path: '/avaliar/texto', mobileOnly: true },
];
