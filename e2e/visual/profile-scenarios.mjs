// Interações medidas com o React Profiler (scripts/react-profile.mjs).
// Só usam nomes acessíveis que existem antes e depois do refactoring.
import { STATE } from './scenarios.mjs';

const click = async (p, role, name) => {
  await p.getByRole(role, { name }).first().click();
  await p.waitForTimeout(60);
};

export const PROFILE_SCENARIOS = [
  {
    name: 'pesquisa: escrever "padaria porto"',
    path: '/pesquisa',
    run: async (p) => {
      await p.getByRole('searchbox').first().pressSequentially('padaria porto', { delay: 40 });
      await p.waitForTimeout(1300); // espera da pesquisa
    },
  },
  {
    name: 'ranking: mudar a ordem 4 vezes',
    path: '/ranking',
    run: async (p) => {
      for (const n of ['Nota geral', 'Para mim', 'Nota geral', 'Para mim']) await click(p, 'button', n);
    },
  },
  {
    name: 'avaliar: dar nota aos 8 critérios',
    path: '/avaliar/notas',
    state: STATE,
    run: async (p) => {
      for (const c of ['Salário justo', 'Equilíbrio', 'Respeito e inclusão', 'Ambiente', 'Liderança', 'Estabilidade', 'Progressão', 'Propósito']) await click(p, 'radio', new RegExp(`^${c}, 4 de 5`));
    },
  },
  {
    name: 'avaliar: escrever o comentário (60 teclas)',
    path: '/avaliar/texto',
    mobileOnly: true,
    state: STATE,
    run: async (p) => {
      const box = p.getByRole('textbox').first();
      await box.click();
      await box.press('End');
      await p.keyboard.type(' A equipa ajuda-se e os horários cumprem-se quase sempre.', { delay: 30 });
    },
  },
  {
    name: 'organização: abrir critérios, útil e guardar',
    path: '/org/padaria-ribeira',
    run: async (p) => {
      await click(p, 'button', /^Ver os 8 critérios/);
      await click(p, 'button', /^Útil/);
      await click(p, 'button', /^(Guardar|Guardada)$/);
      await click(p, 'button', /^(Guardar|Guardada)$/);
    },
  },
  {
    name: 'preferências: tirar e escolher 6 vezes',
    path: '/preferencias',
    run: async (p) => {
      for (const n of [/^Respeito e inclusão/, /^Ambiente/, /^Ambiente/, /^Respeito e inclusão/, /^Salário justo/, /^Propósito/]) await click(p, 'button', n);
    },
  },
];
