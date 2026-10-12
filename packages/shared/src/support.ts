/** Entidades de apoio mostradas na mensagem privada. Validar com o jurídico antes de lançar. */
export interface SupportContact {
  short: string;
  name: string;
  what: string;
  phone?: string;
  email?: string;
  url: string;
}

export const SUPPORT_CONTACTS: SupportContact[] = [
  { short: 'ACT', name: 'Autoridade para as Condições do Trabalho', what: 'Salários em atraso, horários, contratos e assédio no trabalho.', url: 'https://portal.act.gov.pt' },
  { short: 'CITE', name: 'Comissão para a Igualdade no Trabalho e no Emprego', what: 'Assédio, discriminação e igualdade no trabalho.', phone: '800 204 684', email: 'geral@cite.pt', url: 'https://cite.gov.pt' },
  { short: 'APAV', name: 'Linha de Apoio à Vítima', what: 'Apoio emocional e jurídico a vítimas de crime, incluindo assédio sexual.', phone: '116 006', url: 'https://apav.pt' },
];

export const EMERGENCY_NUMBER = '112';
