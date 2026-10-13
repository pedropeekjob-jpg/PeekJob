import { tr } from '.';

/**
 * Valores guardados em português (base de dados, filtros) e o seu rótulo no idioma atual.
 * O valor nunca muda; só o que se mostra.
 */
const ORG_TYPE_EN: Record<string, string> = {
  PME: 'SME',
  Associação: 'Association',
  Voluntariado: 'Volunteering',
  'Nome individual': 'Sole trader',
  Todas: 'All',
  Todos: 'All',
};
export const orgTypeLabel = (t: string) => tr(t, ORG_TYPE_EN[t] ?? t);

const SECTOR_EN: Record<string, string> = {
  'Ação social': 'Social care',
  Arquitetura: 'Architecture',
  Comunidade: 'Community',
  Cultura: 'Culture',
  Design: 'Design',
  Fotografia: 'Photography',
  Limpeza: 'Cleaning',
  Logística: 'Logistics',
  Restauração: 'Food & hospitality',
  Saúde: 'Health',
  Educação: 'Education',
  Comércio: 'Retail',
  Tecnologia: 'Technology',
  Ofícios: 'Crafts & trades',
  Turismo: 'Tourism',
  Serviços: 'Services',
};
export const sectorLabel = (s: string) => tr(s, SECTOR_EN[s] ?? s);

const TAG_EN: Record<string, string> = {
  'Ambiente seguro': 'Safe environment',
  'Horários cumpridos': 'Hours respected',
  'Igualdade salarial': 'Equal pay',
  'Horários para quem cuida': 'Hours for carers',
  'Salário em atraso': 'Late pay',
  'Horas extra não pagas': 'Unpaid overtime',
  'Sem contrato': 'No contract',
  Discriminação: 'Discrimination',
  'Seguro para pessoas LGBTI+': 'Safe for LGBTI+ people',
  'Linguagem inclusiva': 'Inclusive language',
  'Trata todos por igual': 'Treats everyone equally',
  'Pouca abertura a queixas': 'Little openness to complaints',
  'pago a horas': 'paid on time',
  'horários flexíveis': 'flexible hours',
  formação: 'training',
  'horas extra': 'overtime',
};
export const tagLabel = (t: string) => tr(t, TAG_EN[t] ?? t);

const SIZE_EN: Record<string, string> = { '1–9': '1–9', '10–49': '10–49', '50–249': '50–249' };
export const sizeLabel = (s: string) => tr(`${s} pessoas`, `${SIZE_EN[s] ?? s} people`);

/** Red flags (vêm do domínio partilhado em português) */
const FLAG_EN: Record<string, string> = {
  'salário em atraso': 'late pay',
  'comentários sobre o corpo': 'comments about someone’s body',
  humilhação: 'humiliation',
  'trabalho sem contrato': 'work without a contract',
  'horas extra não pagas': 'unpaid overtime',
  discriminação: 'discrimination',
  'sem contrato': 'no contract',
  'incumprimento salarial': 'wage violations',
  'assédio sexual': 'sexual harassment',
  'assédio moral': 'workplace bullying',
  'trabalho não declarado': 'undeclared work',
  'incumprimento da lei laboral': 'breach of labour law',
};
export const flagLabel = (f: string) => tr(f, FLAG_EN[f] ?? FLAG_EN[f.toLowerCase()] ?? f);

/** Datas relativas guardadas em português nos dados ("há 2 meses", "hoje") → idioma atual */
const UNIT_EN: Record<string, string> = { dia: 'day', dias: 'days', semana: 'week', semanas: 'weeks', mês: 'month', meses: 'months', ano: 'year', anos: 'years' };
export const whenLabel = (w: string) => {
  if (w === 'hoje') return tr(w, 'today');
  if (w === 'ontem') return tr(w, 'yesterday');
  const m = /^há (\d+) (dias?|semanas?|mês|meses|anos?)$/.exec(w);
  return m ? tr(w, `${m[1]} ${UNIT_EN[m[2]]} ago`) : w;
};
