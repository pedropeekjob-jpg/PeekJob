// Ecrãs e estados comparados no refactoring (build de demonstração: HashRouter, dados de exemplo, sem API).
// Cada cenário corre em telemóvel (390) e computador (1440).
const draft = {
  draft: { orgId: 'padaria-ribeira', locationId: 'flores', scores: { ambiente: 3, salario: 4 }, recommend: true, tags: ['Horários cumpridos'], text: 'O salário chega sempre atrasado e o Ricardo grita.', verified: null },
  prefs: ['respeito', 'salario', 'equilibrio'],
};

export const STORAGE_KEY = 'peekjob-poc-v1';
export const STATE = draft;

/** { name, path, mobileOnly?, run?(page) } — `run` prepara um estado depois de abrir a página */
export const SCENARIOS = [
  { name: 'inicio', path: '/' },
  { name: 'explorar', path: '/explorar' },
  { name: 'ranking', path: '/ranking' },
  { name: 'pesquisa', path: '/pesquisa' },
  { name: 'organizacao', path: '/org/padaria-ribeira' },
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
