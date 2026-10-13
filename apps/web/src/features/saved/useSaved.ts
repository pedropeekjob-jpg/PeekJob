import { useCallback, useEffect, useMemo, useState } from 'react';
import { useOrgs } from '../../api/orgs';
import type { Org } from '../../data/orgs';
import { useStore } from '../../lib/store';
import { savedOrgs, UNDO_MS } from './saved';

/** Guardadas: lista, deixar de guardar e desfazer (o aviso desaparece sozinho) */
export function useSaved() {
  const { saved, toggleSave, prefs } = useStore();
  const orgs = useOrgs();
  const [last, setLast] = useState<{ id: string; name: string } | null>(null);
  const items = useMemo(() => savedOrgs(saved, orgs), [saved, orgs]);

  useEffect(() => {
    if (!last) return;
    const t = window.setTimeout(() => setLast(null), UNDO_MS);
    return () => window.clearTimeout(t);
  }, [last]);

  const remove = useCallback(
    (o: Org) => {
      toggleSave(o.id);
      setLast({ id: o.id, name: o.name });
    },
    [toggleSave],
  );
  const undo = useCallback(() => {
    if (last && !saved.includes(last.id)) toggleSave(last.id);
    setLast(null);
  }, [last, saved, toggleSave]);

  return { items, prefs, last, remove, undo };
}
