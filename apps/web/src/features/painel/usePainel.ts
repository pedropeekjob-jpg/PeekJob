import { useCallback, useMemo, useState } from 'react';
import { useOrgs } from '../../api/orgs';
import type { Review } from '../../data/orgs';
import { useStore } from '../../lib/store';
import { cityRank, PAINEL_ORG, pendingReviews, SUGGESTED } from './painel';

/** Estado do painel: avaliações por responder e posição na cidade */
export function usePainel() {
  const { replies } = useStore();
  const orgs = useOrgs();
  const org = PAINEL_ORG;
  const pending = useMemo(() => pendingReviews(org), [org]);
  const answered = pending.filter((r) => replies[r.id]).length;
  // percorre e ordena todas as organizações: só quando a lista muda
  const rank = useMemo(() => cityRank(orgs, org), [orgs, org]);
  return { org, pending, answered, unanswered: pending.length - answered, rank };
}

/** Resposta a uma avaliação: ver a publicada, escrever (com sugestão) e publicar */
export function useReply(review: Review) {
  const { replies, reply } = useStore();
  const published = replies[review.id];
  const [composing, setComposing] = useState(false);
  const [draft, setDraft] = useState(published ?? SUGGESTED[review.id] ?? '');
  const start = useCallback(() => setComposing(true), []);
  const cancel = useCallback(() => setComposing(false), []);
  const publish = useCallback(() => {
    reply(review.id, draft.trim());
    setComposing(false);
  }, [reply, review.id, draft]);
  return { published, composing, draft, setDraft, canPublish: draft.trim().length > 0, start, cancel, publish };
}
