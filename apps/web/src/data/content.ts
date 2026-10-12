import { tr } from '../i18n';

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
    short: 'ACT', name: 'ACT',
    get full() { return tr('Autoridade para as Condições do Trabalho', 'Working Conditions Authority'); },
    get what() { return tr('Salários em atraso, horários, contratos e assédio no trabalho. Pedido de intervenção online.', 'Late pay, working hours, contracts and harassment at work. Request an inspection online.'); },
    url: 'https://portal.act.gov.pt', site: 'portal.act.gov.pt',
    get note() { return tr('Queixas confidenciais. Podes pedir anonimato.', 'Confidential complaints. You can ask to stay anonymous.'); },
    color: 'var(--teal)',
  },
  {
    short: 'CITE', name: 'CITE',
    get full() { return tr('Comissão para a Igualdade no Trabalho e no Emprego', 'Commission for Equality in Labour and Employment'); },
    get what() { return tr('Assédio, discriminação e igualdade entre mulheres e homens no trabalho.', 'Harassment, discrimination and gender equality at work.'); },
    phone: '800 204 684', tel: 'tel:800204684', email: 'geral@cite.pt',
    url: 'https://cite.gov.pt', site: 'cite.gov.pt',
    get note() { return tr('Linha verde gratuita.', 'Free helpline.'); },
    color: 'var(--purple)',
  },
  {
    short: 'APAV', name: 'APAV',
    get full() { return tr('Linha de Apoio à Vítima', 'Victim Support Line'); },
    get what() { return tr('Apoio emocional e jurídico a vítimas de crime, incluindo assédio sexual.', 'Emotional and legal support for victims of crime, including sexual harassment.'); },
    phone: '116 006', tel: 'tel:116006',
    url: 'https://apav.pt', site: 'apav.pt',
    get note() { return tr('Gratuita, das 9h às 21h.', 'Free, 9am to 9pm.'); },
    color: 'var(--ink)',
  },
];

export const supportTips = () =>
  tr(
    ['Guarda recibos, contrato e mensagens.', 'Anota datas, horas e quem estava presente.', 'Fala com o sindicato do teu setor, se existir.'],
    ['Keep payslips, your contract and messages.', 'Note dates, times and who was there.', 'Talk to the union for your sector, if there is one.'],
  );

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

const reason = (id: string, pt: [string, string], en: [string, string]) => ({
  id,
  get label() { return tr(pt[0], en[0]); },
  get hint() { return tr(pt[1], en[1]); },
});
export const REPORT_REASONS = [
  reason('nome', ['Identifica uma pessoa', 'Nome, alcunha ou detalhe que a identifica'], ['Identifies a person', 'A name, nickname or detail that identifies them']),
  reason('ofensa', ['Insulto ou linguagem ofensiva', ''], ['Insult or offensive language', '']),
  reason('falso', ['Parece falsa', 'Não trabalhou cá ou está a promover'], ['Looks fake', 'Never worked here or is promoting something']),
  reason('privado', ['Dados privados', 'Moradas, telefones, saúde'], ['Private data', 'Addresses, phone numbers, health']),
  reason('outro', ['Outro motivo', ''], ['Other reason', '']),
];

export const WEEK_TAGS = [
  { label: 'pago a horas', n: 14, up: true },
  { label: 'horários flexíveis', n: 9, up: true },
  { label: 'formação', n: 6, up: true },
  { label: 'horas extra', n: 4, up: false },
];

export const PLANS = [
  {
    get name() { return tr('Grátis', 'Free'); },
    get price() { return tr('0 €', '€0'); },
    get per() { return tr('para sempre', 'forever'); },
    get points() { return tr(['Reivindicar a página', 'Responder a avaliações', 'Resumo mensal por email'], ['Claim your page', 'Reply to reviews', 'Monthly email summary']); },
  },
  {
    name: 'Pro',
    get price() { return tr('[PREÇO]', '[PRICE]'); },
    get per() { return tr('por mês', 'per month'); },
    get points() { return tr(['Pulso semanal e tendências', 'Comparar com organizações parecidas', 'Página com fotos e ofertas de trabalho'], ['Weekly pulse and trends', 'Compare with similar organisations', 'Page with photos and job openings']); },
  },
];
