/** Regras de contestação (puras, para se testarem sem base de dados) */

/** Prazo para contestar: 6 meses depois da decisão (DSA art. 20.º, n.º 1) */
export const APPEAL_DAYS = 180;

/** Decisões que se podem contestar: a remoção (quem escreveu) e o "manter" (quem denunciou) */
export const APPEALABLE = ['removed', 'rejected'] as const;
export type AppealableDecision = (typeof APPEALABLE)[number];

export type AppealInfo =
  | null
  | { status: 'available'; until: string }
  | { status: 'expired' }
  | { status: 'open' | 'reversed' | 'confirmed'; note?: string | null };

export const isAppealable = (type: string, decision: unknown): decision is AppealableDecision =>
  type === 'moderation' && (APPEALABLE as readonly unknown[]).includes(decision);

export const appealDeadline = (decidedAt: Date) => new Date(decidedAt.getTime() + APPEAL_DAYS * 86400000);

/** O que o aviso mostra sobre contestar: disponível (até quando), expirado, ou o estado do pedido */
export function appealInfo(
  m: { type: string; decision: unknown; createdAt: Date },
  appeal: { status: 'open' | 'reversed' | 'confirmed'; note: string | null } | null,
  now = new Date(),
): AppealInfo {
  if (!isAppealable(m.type, m.decision)) return null;
  if (appeal) return { status: appeal.status, note: appeal.note };
  const until = appealDeadline(m.createdAt);
  return until > now ? { status: 'available', until: until.toISOString() } : { status: 'expired' };
}

/** Quem contesta: quem escreveu (remoção) ou quem denunciou (manteve-se) */
export const sideOf = (decision: AppealableDecision) => (decision === 'removed' ? 'author' : 'reporter');
