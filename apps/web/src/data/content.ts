/** Contactos de apoio. Confirmar com o jurídico antes de lançar. */
export interface SupportOrg {
  short: string;
  name: string;
  full: string;
  what: string;
  phone?: string;
  tel?: string;
  email?: string;
  url: string;
  site: string;
  note: string;
  color: string;
}

export const SUPPORT: SupportOrg[] = [
  {
    short: 'ACT', name: 'ACT', full: 'Autoridade para as Condições do Trabalho',
    what: 'Salários em atraso, horários, contratos e assédio no trabalho. Pedido de intervenção online.',
    url: 'https://portal.act.gov.pt', site: 'portal.act.gov.pt',
    note: 'Queixas confidenciais. Podes pedir anonimato.', color: 'var(--teal)',
  },
  {
    short: 'CITE', name: 'CITE', full: 'Comissão para a Igualdade no Trabalho e no Emprego',
    what: 'Assédio, discriminação e igualdade entre mulheres e homens no trabalho.',
    phone: '800 204 684', tel: 'tel:800204684', email: 'geral@cite.pt',
    url: 'https://cite.gov.pt', site: 'cite.gov.pt', note: 'Linha verde gratuita.', color: 'var(--purple)',
  },
  {
    short: 'APAV', name: 'APAV', full: 'Linha de Apoio à Vítima',
    what: 'Apoio emocional e jurídico a vítimas de crime, incluindo assédio sexual.',
    phone: '116 006', tel: 'tel:116006',
    url: 'https://apav.pt', site: 'apav.pt', note: 'Gratuita, das 9h às 21h.', color: 'var(--ink)',
  },
];

export const SUPPORT_TIPS = [
  'Guarda recibos, contrato e mensagens.',
  'Anota datas, horas e quem estava presente.',
  'Fala com o sindicato do teu setor, se existir.',
];

export const REVIEW_TAGS = [
  'Ambiente seguro',
  'Horários cumpridos',
  'Igualdade salarial',
  'Horários para quem cuida',
  'Salário em atraso',
  'Horas extra não pagas',
  'Sem contrato',
  'Discriminação',
];
export const BAD_TAGS = ['Salário em atraso', 'Horas extra não pagas', 'Sem contrato', 'Discriminação'];

export const REPORT_REASONS = [
  { id: 'nome', label: 'Identifica uma pessoa', hint: 'Nome, alcunha ou detalhe que a identifica' },
  { id: 'ofensa', label: 'Insulto ou linguagem ofensiva', hint: '' },
  { id: 'falso', label: 'Parece falsa', hint: 'Não trabalhou cá ou está a promover' },
  { id: 'privado', label: 'Dados privados', hint: 'Moradas, telefones, saúde' },
  { id: 'outro', label: 'Outro motivo', hint: '' },
];

export const WEEK_TAGS = [
  { label: 'pago a horas', n: 14, up: true },
  { label: 'horários flexíveis', n: 9, up: true },
  { label: 'formação', n: 6, up: true },
  { label: 'horas extra', n: 4, up: false },
];

export const PLANS = [
  {
    name: 'Grátis', price: '0 €', per: 'para sempre',
    points: ['Reivindicar a página', 'Responder a avaliações', 'Resumo mensal por email'],
  },
  {
    name: 'Pro', price: '[PREÇO]', per: 'por mês',
    points: ['Pulso semanal e tendências', 'Comparar com organizações parecidas', 'Página com fotos e ofertas de trabalho'],
  },
];
