import { useCallback, useMemo, useState } from 'react';
import type { CriterionKey } from '../../data/criteria';
import { tr } from '../../i18n';
import { detectRedFlags, hasInsultOrName } from '../../lib/moderation';
import { avgOf, useStore, type Failure } from '../../lib/store';
import { countDone } from './flow';

export const REVIEW_TEXT_MAX = 600;

export interface PublishError {
  message: string;
  /** versão sem nomes nem insultos proposta pela API (422) */
  suggestion?: string;
}

/** O que a pessoa vê quando a publicação falha (função pura: fácil de testar e de reutilizar) */
export function publishErrorMessage(f: Failure): PublishError {
  if (f.status === 422 && typeof f.body?.suggestion === 'string') {
    return { message: tr('Tira nomes de pessoas e insultos. Descreve a situação.', 'Remove people’s names and insults. Describe the situation.'), suggestion: f.body.suggestion };
  }
  if (f.status === 409) return { message: tr('Já avaliaste esta organização.', 'You’ve already reviewed this organisation.') };
  if (f.status === 401) return { message: tr('Entra para publicar.', 'Sign in to publish.') };
  return { message: f.message };
}

/**
 * Estado e ações do rascunho de avaliação (notas, etiquetas, texto e publicar).
 * Partilhado pelo passo 2 no telemóvel e pelo ecrã único no computador; os ecrãs só desenham.
 */
export function useReviewDraft() {
  const { draft, updateDraft, publish: publishDraft } = useStore();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<PublishError | null>(null);

  const { text, tags, scores } = draft;
  // A moderação local corre a cada tecla: memorizada por texto/etiquetas (regex sobre até 600 caracteres)
  const redFlags = useMemo(() => detectRedFlags(text, tags), [text, tags]);
  const insult = useMemo(() => hasInsultOrName(text), [text]);
  const done = countDone(scores);
  const average = avgOf(scores);
  const canPublish = !insult && done > 0;

  const setText = useCallback((t: string) => updateDraft({ text: t.slice(0, REVIEW_TEXT_MAX) }), [updateDraft]);

  const toggleTag = useCallback(
    (tag: string) => updateDraft({ tags: tags.includes(tag) ? tags.filter((x) => x !== tag) : [...tags, tag] }),
    [tags, updateDraft],
  );

  const setScore = useCallback(
    (k: CriterionKey, n: number) => {
      const next = { ...scores };
      if (n) next[k] = n;
      else delete next[k];
      updateDraft({ scores: next });
    },
    [scores, updateDraft],
  );

  const setRecommend = useCallback((v: boolean | null) => updateDraft({ recommend: v }), [updateDraft]);

  /** Usa um texto proposto (reescrita ou sugestão da API) e limpa o erro */
  const useText = useCallback(
    (t: string) => {
      setText(t);
      setError(null);
    },
    [setText],
  );

  /** Publica; devolve true se correu bem (o ecrã decide para onde ir) */
  const publish = useCallback(async (): Promise<boolean> => {
    if (!canPublish || busy) return false;
    setBusy(true);
    const r = await publishDraft();
    setBusy(false);
    if (!r.ok) {
      setError(publishErrorMessage(r));
      return false;
    }
    setError(null);
    return true;
  }, [busy, canPublish, publishDraft]);

  return { text, tags, scores, recommend: draft.recommend, redFlags, insult, done, average, canPublish, busy, error, setText, toggleTag, setScore, setRecommend, useText, publish };
}
