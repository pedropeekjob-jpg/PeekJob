/**
 * Notificação de conteúdo ilegal (Regulamento dos Serviços Digitais, UE 2022/2065, art. 16.º).
 * Quando alguém denuncia uma avaliação ou entrevista como ilegal, a notificação tem de ter, n.º 2:
 *  a) uma explicação fundamentada de porque é ilegal;
 *  b) a localização eletrónica exata (o endereço do conteúdo);
 *  c) o nome e o email de quem notifica (exceto abuso sexual de crianças, Diretiva 2011/93/UE, arts. 3.º a 7.º);
 *  d) a declaração de boa-fé de que a informação é exata e completa.
 * Regras puras: a web usa-as para guiar o formulário e a API para recusar notificações incompletas.
 */

export const LEGAL_GROUNDS = [
  { id: 'difamacao', pt: 'Difamação ou acusação falsa de crime', en: 'Defamation or false accusation of a crime' },
  { id: 'dados_pessoais', pt: 'Dados pessoais divulgados sem consentimento', en: 'Personal data shared without consent' },
  { id: 'odio', pt: 'Discurso de ódio ou discriminação', en: 'Hate speech or discrimination' },
  { id: 'ameacas', pt: 'Ameaças ou incitamento à violência', en: 'Threats or incitement to violence' },
  { id: 'segredo', pt: 'Segredo comercial ou informação confidencial', en: 'Trade secret or confidential information' },
  { id: 'direitos_autor', pt: 'Violação de direitos de autor', en: 'Copyright infringement' },
  { id: 'abuso_criancas', pt: 'Abuso sexual de crianças', en: 'Child sexual abuse' },
  { id: 'outro', pt: 'Outra ilegalidade', en: 'Other illegality' },
] as const;
export type LegalGround = (typeof LEGAL_GROUNDS)[number]['id'];
export const LEGAL_GROUND_IDS = LEGAL_GROUNDS.map((g) => g.id) as [LegalGround, ...LegalGround[]];

/** Mínimo de caracteres da explicação: obriga a dizer porquê, não basta "não gosto desta avaliação" */
export const NOTICE_MIN_EXPLANATION = 50;
export const NOTICE_MAX_EXPLANATION = 1000;

/** Fundamentos em que quem notifica pode ficar anónimo (art. 16.º, n.º 2, al. c) */
export const ANONYMOUS_GROUNDS: readonly LegalGround[] = ['abuso_criancas'];

export interface IllegalNotice {
  legalGround?: string;
  explanation?: string;
  contactName?: string;
  contactEmail?: string;
  goodFaith?: boolean;
}

export type NoticeField = 'legalGround' | 'explanation' | 'contactName' | 'contactEmail' | 'goodFaith';

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export const isLegalGround = (v: unknown): v is LegalGround => LEGAL_GROUND_IDS.includes(v as LegalGround);

/** O que falta para a notificação estar completa (pela ordem do formulário; vazio = completa) */
export function noticeProblems(n: IllegalNotice): NoticeField[] {
  const out: NoticeField[] = [];
  if (!isLegalGround(n.legalGround)) out.push('legalGround');
  if ((n.explanation ?? '').trim().length < NOTICE_MIN_EXPLANATION) out.push('explanation');
  const anonymous = isLegalGround(n.legalGround) && ANONYMOUS_GROUNDS.includes(n.legalGround);
  if (!anonymous) {
    if ((n.contactName ?? '').trim().length < 2) out.push('contactName');
    if (!EMAIL.test((n.contactEmail ?? '').trim())) out.push('contactEmail');
  }
  if (n.goodFaith !== true) out.push('goodFaith');
  return out;
}

/** Localização eletrónica exata (al. b): a página que mostra só aquela avaliação ou entrevista */
export const contentLocation = (origin: string, orgId: string, itemId: string) =>
  `${origin.replace(/\/$/, '')}/org/${encodeURIComponent(orgId)}/denunciar/${encodeURIComponent(itemId)}`;
