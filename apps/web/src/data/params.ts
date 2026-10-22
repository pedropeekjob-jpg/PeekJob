import { EXTRA_KEYS, extraKind, extraOptions, isExtraKey, suggestedExtras, type ExtraKey, type ExtraKind } from '@peekjob/shared';
import { tr } from '../i18n';
import { CRITERION, type CriterionKey } from './criteria';

export { EXTRA_KEYS, extraKind, extraOptions, isExtraKey, suggestedExtras, type ExtraKey, type ExtraKind };

/** Um critério ou um parâmetro do tipo de trabalho: o que se avalia e se pode comentar */
export type ParamKey = CriterionKey | ExtraKey;

export interface ExtraParam {
  key: ExtraKey;
  kind: ExtraKind;
  label: string;
  help: string;
}

type Text = [pt: string, en: string];
const TEXTS: Record<ExtraKey, { label: Text; help: Text }> = {
  gorjetas: { label: ['Gorjetas para a equipa', 'Tips go to the team'], help: ['As gorjetas chegam a quem trabalha e são divididas de forma justa.', 'Tips reach the people who work and are shared fairly.'] },
  folgas_escala: { label: ['Folgas e escalas', 'Days off and rotas'], help: ['Sabes a escala com tempo e as folgas não mudam à última hora.', 'You get the rota in good time and days off don’t change at the last minute.'] },
  refeicao: { label: ['Refeição no turno', 'Meal on shift'], help: ['Há uma refeição ou subsídio de refeição nos turnos.', 'There is a meal or a meal allowance on shifts.'] },
  descanso_turnos: { label: ['Descanso entre turnos', 'Rest between shifts'], help: ['Há horas de descanso suficientes entre um turno e o seguinte.', 'There are enough hours of rest between one shift and the next.'] },
  protecao: { label: ['Equipamento de proteção', 'Protective equipment'], help: ['Tens luvas, máscaras e o resto do que precisas para trabalhar em segurança.', 'You have gloves, masks and everything else you need to work safely.'] },
  equipa_suficiente: { label: ['Equipa suficiente', 'Enough staff'], help: ['Há gente suficiente para o trabalho, sem ninguém a fazer o de dois.', 'There are enough people for the work, with nobody doing two jobs.'] },
  seguranca: { label: ['Segurança no trabalho', 'Safety at work'], help: ['O sítio é seguro, há formação e o risco de acidentes é levado a sério.', 'The place is safe, there is training and accident risk is taken seriously.'] },
  pausas: { label: ['Pausas respeitadas', 'Breaks respected'], help: ['Consegues fazer as pausas a que tens direito.', 'You can take the breaks you are entitled to.'] },
  esforco_fisico: { label: ['Esforço físico', 'Physical strain'], help: ['O esforço físico é razoável: cargas, horas de pé e ritmo que se aguentam.', 'The physical strain is reasonable: loads, hours standing and a pace you can keep up.'] },
  remoto: { label: ['Trabalho remoto', 'Remote work'], help: ['Podes trabalhar a partir de casa quando faz sentido.', 'You can work from home when it makes sense.'] },
  equipamento: { label: ['Equipamento de trabalho', 'Work equipment'], help: ['O computador, as ferramentas e o software chegam para fazeres bem o trabalho.', 'The computer, tools and software are good enough to do the job well.'] },
  formacao_paga: { label: ['Formação paga', 'Paid training'], help: ['A formação é dada ou paga pela organização, dentro do horário.', 'Training is provided or paid for by the organisation, within working hours.'] },
  grupos_razoaveis: { label: ['Turmas e grupos', 'Class and group sizes'], help: ['As turmas ou grupos têm um tamanho que permite trabalhar bem.', 'Classes or groups are a size that lets you work well.'] },
  preparacao_paga: { label: ['Preparação paga', 'Paid prep time'], help: ['O tempo de preparar aulas ou sessões conta como trabalho.', 'Time spent preparing classes or sessions counts as work.'] },
  despesas: { label: ['Despesas pagas', 'Expenses covered'], help: ['As despesas (transporte, refeições, material) são pagas ou reembolsadas.', 'Expenses (transport, meals, materials) are paid or refunded.'] },
  acompanhamento: { label: ['Acompanhamento', 'Support'], help: ['Tens alguém a quem recorrer e não ficas sozinho/a nas situações difíceis.', 'You have someone to turn to and aren’t left alone in hard situations.'] },
  reconhecimento: { label: ['Reconhecimento', 'Recognition'], help: ['O teu tempo e esforço são reconhecidos e valorizados.', 'Your time and effort are recognised and valued.'] },
  contrato_escrito: { label: ['Contrato escrito', 'Written contract'], help: ['Tens contrato por escrito, com funções, horário e salário.', 'You have a written contract, with duties, hours and pay.'] },
  horas_extra_pagas: { label: ['Horas extra pagas', 'Paid overtime'], help: ['As horas a mais são pagas ou compensadas com tempo livre.', 'Extra hours are paid or given back as time off.'] },
  comissoes: { label: ['Como te pagam', 'How you’re paid'], help: ['Se ganhas só ordenado, ordenado base mais comissões, ou só à comissão.', 'Whether you earn a salary only, a base salary plus commission, or commission only.'] },
  comissoes_claras: { label: ['Comissões claras', 'Clear commission'], help: ['Sabes como se calculam as comissões e são pagas a tempo, sem surpresas.', 'You know how commission is worked out and it’s paid on time, with no surprises.'] },
};

/** Nomes das opções dos parâmetros de escolha */
const OPTION_TEXT: Record<string, Text> = {
  so_ordenado: ['Só ordenado', 'Salary only'],
  base_comissao: ['Base + comissão', 'Base + commission'],
  so_comissao: ['Só comissão', 'Commission only'],
};
export const optionLabel = (v: string) => (OPTION_TEXT[v] ? tr(...OPTION_TEXT[v]) : v);

/** Parâmetro com textos no idioma atual (getters: mudam com o idioma) */
const param = (key: ExtraKey): ExtraParam => ({
  key,
  kind: extraKind(key),
  get label() { return tr(...TEXTS[key].label); },
  get help() { return tr(...TEXTS[key].help); },
});

export const EXTRA: Record<ExtraKey, ExtraParam> = Object.fromEntries(EXTRA_KEYS.map((k) => [k, param(k)])) as Record<ExtraKey, ExtraParam>;

/** Nome e explicação de um critério ou parâmetro */
export const paramMeta = (k: ParamKey): { label: string; help: string } => (isExtraKey(k) ? EXTRA[k] : CRITERION[k]);
