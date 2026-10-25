import { useCallback, useMemo, useState } from 'react';
import type { CriterionKey } from '../../data/criteria';
import { suggestedExtras, type ExtraKey, type ParamKey } from '../../data/params';
import { tr } from '../../i18n';
import { detectRedFlags, hasInsultOrName } from '../../lib/moderation';
import { avgOf, reviewText, useStore, type Failure } from '../../lib/store';
import { PARAM_COMMENT_MAX, type ExtraValue } from '@peekjob/shared';
import { countDone, toggleIn, withScore } from './flow';

export const REVIEW_TEXT_MAX = 600;

export interface PublishError {
  message: string;
  /** versão sem nomes nem insultos proposta pela API (422) */
  suggestion?: string;
  /** sessão expirada (401): mostrar "Entrar" e voltar a estas notas depois */
  signIn?: boolean;
}

/** O que a pessoa vê quando a publicação falha (função pura: fácil de testar e de reutilizar) */
export function publishErrorMessage(f: Failure): PublishError {
  if (f.status === 422 && typeof f.body?.field === 'string' && f.body.field.startsWith('comments.')) {
    return { message: tr('Há um comentário com nomes ou insultos. Descreve a situação.', 'One comment has names or insults. Describe the situation.') };
  }
  if (f.status === 422 && f.body?.field === 'job.role') {
    return { message: tr('O cargo tem nomes ou insultos. Escreve só a função.', 'Your role has names or insults. Just write the job.') };
  }
  if (f.status === 422 && typeof f.body?.suggestion === 'string') {
    return { message: tr('Tira nomes de pessoas e insultos. Descreve a situação.', 'Remove people’s names and insults. Describe the situation.'), suggestion: f.body.suggestion };
  }
  if (f.status === 409) return { message: tr('Já avaliaste esta organização.', 'You’ve already reviewed this organisation.') };
  if (f.status === 401) return { message: tr('Entra para publicar.', 'Sign in to publish.'), signIn: true };
  return { message: f.message };
}

/**
 * Estado e ações do rascunho de avaliação (notas, etiquetas, texto e publicar).
 * Partilhado pelo passo 2 no telemóvel e pelo ecrã único no computador; os ecrãs só desenham.
 */
export function useReviewDraft(org?: { sector?: string | null; type?: string | null } | null) {
  const { draft, updateDraft, publish: publishDraft } = useStore();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<PublishError | null>(null);

  const { text, tags, scores } = draft;
  const extras = draft.extras ?? {};
  const comments = draft.comments ?? {};
  const extraKeys = draft.extraKeys ?? [];
  // A moderação local corre a cada tecla: memorizada por texto/etiquetas (regex sobre até 600 caracteres)
  const redFlags = useMemo(() => detectRedFlags(reviewText({ text, comments }), tags), [text, comments, tags]);
  /** comentários por parâmetro com nomes ou insultos (ficam marcados e bloqueiam a publicação) */
  const badComments = useMemo(() => Object.keys(comments).filter((k) => hasInsultOrName(comments[k as ParamKey] ?? '')) as ParamKey[], [comments]);
  const insult = useMemo(() => hasInsultOrName(text), [text]) || badComments.length > 0;
  // parâmetros do tipo de trabalho: os sugeridos para o setor, os acrescentados e os que já têm resposta
  const sector = org?.sector;
  const orgType = org?.type;
  const suggested = useMemo(() => suggestedExtras(sector, orgType), [sector, orgType]);
  const shownExtras = useMemo(
    () => Array.from(new Set<ExtraKey>([...suggested, ...extraKeys, ...(Object.keys(extras) as ExtraKey[])])),
    [suggested, extraKeys, extras],
  );
  const done = countDone(scores);
  const average = avgOf(scores);
  const canPublish = !insult && done > 0;

  const setText = useCallback((t: string) => updateDraft({ text: t.slice(0, REVIEW_TEXT_MAX) }), [updateDraft]);

  // funções do rascunho atual: as ações não mudam a cada nota/etiqueta (as linhas memorizadas não voltam a correr)
  const toggleTag = useCallback((tag: string) => updateDraft((d) => ({ tags: toggleIn(d.tags, tag) })), [updateDraft]);

  const setScore = useCallback((k: CriterionKey, n: number) => updateDraft((d) => ({ scores: withScore(d.scores, k, n) })), [updateDraft]);

  const setRecommend = useCallback((v: boolean | null) => updateDraft({ recommend: v }), [updateDraft]);

  /** Resposta a um parâmetro do tipo de trabalho; null (ou 0) tira-a */
  const setExtra = useCallback(
    (k: ExtraKey, v: ExtraValue | null) =>
      updateDraft((d) => {
        const next = { ...d.extras };
        if (v === null || v === 0) delete next[k];
        else next[k] = v;
        return { extras: next };
      }),
    [updateDraft],
  );
  const addExtra = useCallback((k: ExtraKey) => updateDraft((d) => ({ extraKeys: d.extraKeys.includes(k) ? d.extraKeys : [...d.extraKeys, k] })), [updateDraft]);
  /** Tira um parâmetro acrescentado (e a resposta e o comentário dele) */
  const removeExtra = useCallback(
    (k: ExtraKey) =>
      updateDraft((d) => {
        const extrasNext = { ...d.extras };
        const commentsNext = { ...d.comments };
        delete extrasNext[k];
        delete commentsNext[k];
        return { extraKeys: d.extraKeys.filter((x) => x !== k), extras: extrasNext, comments: commentsNext };
      }),
    [updateDraft],
  );
  const setComment = useCallback(
    (k: ParamKey, t: string) => updateDraft((d) => ({ comments: { ...d.comments, [k]: t.slice(0, PARAM_COMMENT_MAX) } })),
    [updateDraft],
  );

  /** Usa um texto proposto (reescrita ou sugestão da API) e limpa o erro */
  const useText = useCallback(
    (t: string) => {
      setText(t);
      setError(null);
    },
    [setText],
  );

  /**
   * Publica; devolve true se correu bem (o ecrã decide para onde ir).
   * Se correu bem fica `busy` até o ecrã sair: o rascunho já foi limpo e, enquanto o ecrã seguinte carrega,
   * o atual não deve tratar o rascunho vazio como "sem organização" (e mandar para /avaliar).
   */
  const publish = useCallback(async (): Promise<boolean> => {
    if (!canPublish || busy) return false;
    setBusy(true);
    const r = await publishDraft();
    if (!r.ok) {
      setBusy(false);
      setError(publishErrorMessage(r));
      return false;
    }
    setError(null);
    return true;
  }, [busy, canPublish, publishDraft]);

  return {
    text, tags, scores, recommend: draft.recommend, extras, comments, suggested, shownExtras, badComments,
    redFlags, insult, done, average, canPublish, busy, error,
    setText, toggleTag, setScore, setRecommend, setExtra, addExtra, removeExtra, setComment, useText, publish,
  };
}

export type ReviewDraft = ReturnType<typeof useReviewDraft>;
