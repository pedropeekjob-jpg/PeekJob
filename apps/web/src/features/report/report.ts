import type { Org } from '../../data/orgs';
import { tr } from '../../i18n';
import { whenLabel } from '../../i18n/labels';

/** Regras e textos da denúncia (funções puras: testadas sem React) */

export const MAX_DETAIL = 500;

/** Referência curta para cada denúncia na demonstração (no modo API vem do servidor) */
export function demoReference(seed: string, now = Date.now()) {
  let h = now % 100000;
  for (const ch of seed) h = (h * 31 + ch.charCodeAt(0)) % 9000;
  return `PJ-D-${1000 + h}`;
}

export type ReportTarget = { kind: 'avaliação' | 'entrevista'; title: string; meta: string };

/** A avaliação ou entrevista denunciada (null se já não existe) */
export function findTarget(org: Org | undefined, itemId: string | undefined): ReportTarget | null {
  if (!org || !itemId) return null;
  const r = org.reviews.find((x) => x.id === itemId);
  if (r) return { kind: 'avaliação', title: r.title, meta: `${r.role} · ${whenLabel(r.when)}` };
  const i = org.interviews.find((x) => x.id === itemId);
  if (i) return { kind: 'entrevista', title: i.body, meta: `${tr('Entrevista', 'Interview')} · ${i.role} · ${whenLabel(i.when)}` };
  return null;
}

/** Erro do servidor em texto para a pessoa */
export function reportErrorText(status: number | undefined, message: string, kind: ReportTarget['kind'] = 'avaliação') {
  if (status === 409) {
    return kind === 'entrevista'
      ? tr('Já denunciaste esta entrevista. A moderação está a analisar.', 'You’ve already reported this interview. Moderation is looking at it.')
      : tr('Já denunciaste esta avaliação. A moderação está a analisar.', 'You’ve already reported this review. Moderation is looking at it.');
  }
  if (status === 400) return tr('Verifica o email (ou deixa-o em branco).', 'Check the email address (or leave it blank).');
  return message;
}

/** Como a pessoa vai saber a decisão: mensagens (com conta), email (sem conta, se o deu) ou nada */
export function decisionChannel(anonymous: boolean, email: string) {
  if (!anonymous) return tr('Vês a decisão nas tuas mensagens.', 'You’ll see the decision in your messages.');
  return email.trim() ? tr('Recebes a decisão por email.', 'We’ll email you the decision.') : '';
}
