import { useCallback, useEffect, useState } from 'react';
import { useModeration, type PendingOrg, type ReportedContent } from '../../api/moderation';
import { tr } from '../../i18n';
import { appealNotice, decisionNotice, NOTICE_MS, type AppealAction, type Decision } from './moderation';

export type Queue = 'reports' | 'orgs' | 'appeals';

/** Aviso de decisão tomada, que desaparece sozinho */
function useNotice() {
  const [notice, setNotice] = useState('');
  useEffect(() => {
    if (!notice) return;
    const t = window.setTimeout(() => setNotice(''), NOTICE_MS);
    return () => window.clearTimeout(t);
  }, [notice]);
  return [notice, setNotice] as const;
}

/** Filas de moderação: separador, aviso e ações que avisam quando correm bem (devolvem o erro, se houver) */
export function useQueues() {
  const m = useModeration();
  const [tab, setTab] = useState<Queue>('reports');
  const [notice, setNotice] = useNotice();

  /** Corre a ação; sem erro, mostra o aviso */
  const withNotice = useCallback(
    async (action: Promise<string | null>, message: string) => {
      const err = await action;
      if (!err) setNotice(message);
      return err;
    },
    [setNotice],
  );

  const { decide, approve, reject, merge, decideAppeal } = m;
  return {
    ...m,
    tab,
    setTab,
    notice,
    decide: (item: ReportedContent, action: Decision, note: string) => withNotice(decide(item, action, note), decisionNotice(action, item.kind)),
    decideAppeal: (id: string, action: AppealAction, note: string) => withNotice(decideAppeal(id, action, note), appealNotice(action)),
    approve: (o: PendingOrg) => withNotice(approve(o.id), tr(`${o.name} está agora pública.`, `${o.name} is now public.`)),
    reject: (o: PendingOrg, note: string) => withNotice(reject(o.id, note), tr(`${o.name} foi rejeitada.`, `${o.name} was rejected.`)),
    merge: (o: PendingOrg, targetId: string, targetName: string) =>
      withNotice(merge(o.id, targetId), tr(`Fundida em ${targetName}. O nome antigo continua a ser encontrado.`, `Merged into ${targetName}. The old name can still be found.`)),
  };
}

/** Uma ação de cada vez por cartão: ocupado e erro */
export function useCardAction() {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const run = useCallback(
    async (f: () => Promise<string | null>) => {
      if (busy) return;
      setBusy(true);
      setError((await f()) ?? '');
      setBusy(false);
    },
    [busy],
  );
  return { busy, error, run };
}
