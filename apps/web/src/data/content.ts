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

/**
 * Conselhos para cada tipo de problema assinalado (as categorias da moderação, em português: ver detectRedFlags).
 * O ecrã de apoio mostra os do que a pessoa relatou, antes dos gerais (21/10).
 */
const KIND_TIPS: Record<string, () => string[]> = {
  'incumprimento salarial': () =>
    tr(
      ['Guarda os recibos e os extratos que mostram quando o salário entrou.', 'Anota as horas extra que fizeste e as datas em que deviam ter sido pagas.', 'Pede o pagamento por escrito (email ou mensagem): fica registado.'],
      ['Keep your payslips and the bank statements that show when your pay arrived.', 'Write down the overtime you did and when it should have been paid.', 'Ask for the money in writing (email or message): that leaves a record.'],
    ),
  'assédio sexual': () =>
    tr(
      ['Escreve o que aconteceu logo que possas: data, hora, sítio e as palavras usadas.', 'Guarda mensagens e fotos e lembra-te de quem viu ou ouviu.', 'Não tens de resolver isto sozinho/a: a CITE e a APAV ouvem-te sem custos.'],
      ['Write down what happened as soon as you can: date, time, place and the words used.', 'Keep messages and photos and remember who saw or heard it.', 'You don’t have to sort this out alone: CITE and APAV will listen, free of charge.'],
    ),
  'assédio moral': () =>
    tr(
      ['Regista cada situação: o que foi dito, quando e quem estava.', 'Guarda emails e mensagens, mesmo que custe lê-los.', 'Se te está a afetar a saúde, vai ao médico: esse registo também conta.'],
      ['Keep a note of each incident: what was said, when and who was there.', 'Keep emails and messages, even if they are hard to read.', 'If it is affecting your health, see a doctor: that record counts too.'],
    ),
  'trabalho não declarado': () =>
    tr(
      ['Guarda provas de que trabalhas lá: horários, mensagens, pagamentos.', 'Na Segurança Social Direta vês se estão a fazer os teus descontos.', 'A ACT pode intervir mesmo sem contrato escrito.'],
      ['Keep proof that you work there: rotas, messages, payments.', 'Segurança Social Direta shows whether your contributions are being paid.', 'ACT can step in even without a written contract.'],
    ),
  discriminação: () =>
    tr(
      ['Anota o que aconteceu e como foram tratados colegas na mesma situação.', 'Guarda anúncios, emails ou mensagens que mostrem a diferença.', 'A CITE trata casos de discriminação no trabalho, sem custos.'],
      ['Write down what happened and how colleagues in the same situation were treated.', 'Keep job ads, emails or messages that show the difference.', 'CITE handles discrimination at work, free of charge.'],
    ),
};

/** Conselhos para o que foi assinalado (sem repetir), seguidos dos gerais que ainda não estejam lá */
export function tipsFor(kinds: readonly string[]): string[] {
  const out: string[] = [];
  for (const k of kinds) for (const t of KIND_TIPS[k]?.() ?? []) if (!out.includes(t)) out.push(t);
  return out.length ? [...out, supportTips()[2]] : supportTips();
}

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

/**
 * Aviso de responsabilidade (pedido de 21/10): a PeekJob não trata irregularidades; perante uma possível ilegalidade
 * só indica quem pode ajudar. Aparece no rodapé, na página inicial, no início e durante a avaliação e no apoio.
 */
export const RESPONSIBILITY = () =>
  tr(
    'A PeekJob não trata nem resolve irregularidades. Se algo puder ser ilegal, só te mostramos os contactos de quem pode ajudar.',
    'PeekJob doesn’t handle or resolve irregularities. If something may be illegal, we just show you who can help.',
  );
