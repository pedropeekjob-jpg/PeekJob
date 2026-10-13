import { useCallback, useState } from 'react';
import { apiMode } from '../../api/http';
import { saveBlob } from '../../lib/download';
import { useStore } from '../../lib/store';
import type { Busy } from './myData';

/** RGPD: descarregar os dados e apagar a conta (com confirmação) */
export function useMyData() {
  const { user, exportMyData, deleteAccount } = useStore();
  const [busy, setBusy] = useState<Busy>(null);
  const [error, setError] = useState('');
  const [confirming, setConfirming] = useState(false);
  const [keepReviews, setKeepReviews] = useState(false);
  const [deleted, setDeleted] = useState(false);

  const download = useCallback(async () => {
    setBusy('export');
    setError('');
    const r = await exportMyData();
    setBusy(null);
    if (!r.ok) return setError(r.message);
    saveBlob(r.value!.blob, r.value!.filename);
  }, [exportMyData]);

  const remove = useCallback(async () => {
    setBusy('delete');
    setError('');
    const r = await deleteAccount(keepReviews);
    setBusy(null);
    if (!r.ok) return setError(r.message);
    setDeleted(true);
  }, [deleteAccount, keepReviews]);

  const askDelete = useCallback(() => setConfirming(true), []);
  const cancelDelete = useCallback(() => setConfirming(false), []);

  return {
    needsSignIn: apiMode && !user,
    busy,
    error,
    confirming,
    keepReviews,
    setKeepReviews,
    deleted,
    download,
    remove,
    askDelete,
    cancelDelete,
  };
}

export type MyData = ReturnType<typeof useMyData>;
