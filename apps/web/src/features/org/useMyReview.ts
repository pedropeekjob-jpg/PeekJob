import { useCallback, useState } from 'react';
import { useStore, type MyReview, type Result } from '../../lib/store';
import { publishErrorMessage, type PublishError } from '../review/useReviewDraft';

type Mode = 'view' | 'edit' | 'delete';

/** Corrigir o texto ou apagar a minha avaliação (sem apagar a conta); os ecrãs só desenham */
export function useMyReview(r: MyReview) {
  const { editMyReview, deleteMyReview } = useStore();
  const [mode, setMode] = useState<Mode>('view');
  const [draft, setDraft] = useState(r.text);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<PublishError | null>(null);

  const open = useCallback(
    (m: Mode) => {
      setDraft(r.text);
      setError(null);
      setMode(m);
    },
    [r.text],
  );
  const cancel = useCallback(() => open('view'), [open]);

  const run = useCallback(async (action: () => Promise<Result>) => {
    setBusy(true);
    const res = await action();
    setBusy(false);
    if (res.ok) {
      setMode('view');
      setError(null);
    } else setError(res.status === 409 ? { message: res.message } : publishErrorMessage(res));
  }, []);

  const save = useCallback(() => run(() => editMyReview(r.id, draft.trim())), [run, editMyReview, r.id, draft]);
  const remove = useCallback(() => run(() => deleteMyReview(r.id)), [run, deleteMyReview, r.id]);
  const useSuggestion = useCallback((text: string) => {
    setDraft(text);
    setError(null);
  }, []);

  return { mode, draft, setDraft, busy, error, changed: draft.trim() !== r.text, edit: () => open('edit'), askDelete: () => open('delete'), cancel, save, remove, useSuggestion };
}
