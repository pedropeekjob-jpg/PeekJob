import type { OrgType } from './criteria';

/**
 * Parâmetros extra, conforme o tipo de trabalho: além dos 8 critérios, quem avalia pode juntar alguns destes.
 * 'scale' é uma nota de 1 a 5; 'yesno' é um sim ou não; 'choice' é uma de várias opções fixas (`options`).
 */
export const EXTRA_PARAMS = [
  { key: 'gorjetas', kind: 'yesno' },
  { key: 'folgas_escala', kind: 'scale' },
  { key: 'refeicao', kind: 'yesno' },
  { key: 'descanso_turnos', kind: 'scale' },
  { key: 'protecao', kind: 'scale' },
  { key: 'equipa_suficiente', kind: 'scale' },
  { key: 'seguranca', kind: 'scale' },
  { key: 'pausas', kind: 'yesno' },
  { key: 'esforco_fisico', kind: 'scale' },
  { key: 'remoto', kind: 'yesno' },
  { key: 'equipamento', kind: 'scale' },
  { key: 'formacao_paga', kind: 'yesno' },
  { key: 'grupos_razoaveis', kind: 'scale' },
  { key: 'preparacao_paga', kind: 'yesno' },
  { key: 'despesas', kind: 'yesno' },
  { key: 'acompanhamento', kind: 'scale' },
  { key: 'reconhecimento', kind: 'scale' },
  { key: 'contrato_escrito', kind: 'yesno' },
  { key: 'horas_extra_pagas', kind: 'yesno' },
  // comerciais, agentes imobiliários, etc. (pedido do cliente, 21/10): como se recebe e se as comissões são claras
  { key: 'comissoes', kind: 'choice', options: ['so_ordenado', 'base_comissao', 'so_comissao'] },
  { key: 'comissoes_claras', kind: 'scale' },
] as const;

export type ExtraKey = (typeof EXTRA_PARAMS)[number]['key'];
export type ExtraKind = 'scale' | 'yesno' | 'choice';
export const EXTRA_KEYS = EXTRA_PARAMS.map((p) => p.key) as [ExtraKey, ...ExtraKey[]];
export const extraKind = (k: ExtraKey): ExtraKind => EXTRA_PARAMS.find((p) => p.key === k)!.kind;
export const isExtraKey = (k: string): k is ExtraKey => (EXTRA_KEYS as string[]).includes(k);
/** As opções de um parâmetro 'choice' (vazio nos outros) */
export const extraOptions = (k: ExtraKey): readonly string[] => {
  const p = EXTRA_PARAMS.find((x) => x.key === k);
  return p && 'options' in p ? p.options : [];
};

/** Uma resposta: nota de 1 a 5 (escala), sim/não, ou uma das opções */
export type ExtraValue = number | boolean | string;
export type Extras = Partial<Record<ExtraKey, ExtraValue>>;

/** Resumo de um parâmetro na página da organização: só com pelo menos estas respostas (anonimato) */
export const EXTRA_MIN_ANSWERS = 3;

/** Comentário curto por critério ou parâmetro */
export const PARAM_COMMENT_MAX = 280;

const norm = (s: string) =>
  s
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase();

/** Perfis por tipo de trabalho: palavras do setor → os 3 parâmetros sugeridos primeiro */
const PROFILES: { words: string[]; keys: ExtraKey[] }[] = [
  // antes de 'comercio' (lojas): quem vende à comissão
  { words: ['imobili', 'vendas', 'comercial', 'seguro', 'automove', 'stand', 'telecom', 'mediacao'], keys: ['comissoes', 'comissoes_claras', 'contrato_escrito'] },
  { words: ['restaura', 'turismo', 'pastelaria', 'hotel', 'cafe', 'bar', 'padaria'], keys: ['gorjetas', 'folgas_escala', 'refeicao'] },
  { words: ['saude', 'acao social', 'lares', 'clinica', 'cuidado'], keys: ['descanso_turnos', 'protecao', 'equipa_suficiente'] },
  { words: ['comercio', 'oficio', 'logistica', 'limpeza', 'construcao', 'industria', 'armazem'], keys: ['seguranca', 'pausas', 'esforco_fisico'] },
  { words: ['tecnologia', 'design', 'servicos', 'consultoria', 'escritorio', 'cultura'], keys: ['remoto', 'equipamento', 'formacao_paga'] },
  { words: ['educacao', 'escola', 'ensino', 'explicacoes'], keys: ['grupos_razoaveis', 'preparacao_paga', 'formacao_paga'] },
];
const VOLUNTEER: ExtraKey[] = ['despesas', 'acompanhamento', 'reconhecimento'];
const DEFAULT: ExtraKey[] = ['contrato_escrito', 'horas_extra_pagas', 'pausas'];

/** Os parâmetros sugeridos para uma organização (pelo setor e, no voluntariado e associações, pelo tipo) */
export function suggestedExtras(sector: string | null | undefined, type?: OrgType | string | null): ExtraKey[] {
  const s = norm(sector ?? '');
  const hit = s ? PROFILES.find((p) => p.words.some((w) => s.includes(w))) : undefined;
  if (hit) return hit.keys;
  if (type === 'Voluntariado' || type === 'Associação' || s.includes('comunidade')) return VOLUNTEER;
  return DEFAULT;
}
