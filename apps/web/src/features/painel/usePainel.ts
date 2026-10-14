import { useCallback, useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router';
import { dashboard, myOrgs, saveReply, type ApiDashboard, type MyOrgs } from '../../api/accounts';
import { apiMode, errorText } from '../../api/http';
import { useOrg, useOrgs } from '../../api/orgs';
import type { Review } from '../../data/orgs';
import { useStore } from '../../lib/store';
import { SUGGESTED } from './painel';
import { demoPainel, fromDashboard, type PainelData } from './painelData';

export type PainelState =
  | { status: 'loading' }
  | { status: 'signin' }
  | { status: 'error'; message: string }
  /** sem páginas: pedir para gerir (com os pedidos feitos e a organização sugerida pelo endereço) */
  | { status: 'claim'; mine: MyOrgs; suggested: string | null; reload: () => void }
  | { status: 'ready'; data: PainelData; orgs: MyOrgs['orgs']; select: (id: string) => void };

/** Modo API: as minhas páginas, a escolhida e o painel dela */
function useRemotePainel(enabled: boolean) {
  const { user } = useStore();
  const [mine, setMine] = useState<MyOrgs | null>(null);
  const [selected, setSelected] = useState<string | null>(null);
  const [dash, setDash] = useState<ApiDashboard | null>(null);
  const [error, setError] = useState('');
  const [tick, setTick] = useState(0);
  const reload = useCallback(() => setTick((n) => n + 1), []);

  useEffect(() => {
    if (!enabled || !user) return;
    let alive = true;
    myOrgs()
      .then((m) => alive && setMine(m))
      .catch((e) => alive && setError(errorText(e)));
    return () => {
      alive = false;
    };
  }, [enabled, user, tick]);

  const orgId = selected ?? mine?.orgs[0]?.id ?? null;
  useEffect(() => {
    if (!enabled || !orgId) return;
    let alive = true;
    setDash(null);
    dashboard(orgId)
      .then((d) => alive && setDash(d))
      .catch((e) => alive && setError(errorText(e)));
    return () => {
      alive = false;
    };
  }, [enabled, orgId]);

  return { mine, orgId, dash, error, select: setSelected, reload };
}

/** Painel: demonstração (Padaria Ribeira) ou, com a API, a página que a pessoa gere (ou o pedido para gerir) */
export function usePainel(): PainelState {
  const { user, remote, replies } = useStore();
  const orgs = useOrgs();
  const [params] = useSearchParams();
  const r = useRemotePainel(apiMode);
  const org = useOrg(apiMode ? r.orgId : null);
  const demo = useMemo(() => (apiMode ? null : demoPainel(orgs, replies)), [orgs, replies]);
  const data = useMemo(() => (r.dash && org ? fromDashboard(r.dash, org, replies) : null), [r.dash, org, replies]);

  if (demo) return { status: 'ready', data: demo, orgs: [], select: () => undefined };
  if (!remote.ready) return { status: 'loading' };
  if (!user) return { status: 'signin' };
  if (r.error) return { status: 'error', message: r.error };
  if (!r.mine) return { status: 'loading' };
  if (!r.mine.orgs.length) return { status: 'claim', mine: r.mine, suggested: params.get('org'), reload: r.reload };
  if (!data) return { status: 'loading' };
  return { status: 'ready', data, orgs: r.mine.orgs, select: r.select };
}

/** Resposta a uma avaliação: ver a publicada, escrever (com sugestão na demonstração) e publicar */
export function useReply(review: Review) {
  const { replies, reply, loadOrg } = useStore();
  const published = replies[review.id] ?? review.reply;
  const [composing, setComposing] = useState(false);
  const [draft, setDraft] = useState(published ?? SUGGESTED[review.id] ?? '');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const start = useCallback(() => setComposing(true), []);
  const cancel = useCallback(() => {
    setComposing(false);
    setError('');
  }, []);
  const publish = useCallback(
    async (orgId: string) => {
      const text = draft.trim();
      if (apiMode) {
        setBusy(true);
        try {
          await saveReply(review.id, text);
        } catch (e) {
          setError(errorText(e));
          return;
        } finally {
          setBusy(false);
        }
        // a página pública mostra a resposta na próxima visita
        void loadOrg(orgId, true);
      }
      reply(review.id, text);
      setError('');
      setComposing(false);
    },
    [reply, loadOrg, review.id, draft],
  );
  return { published, composing, draft, setDraft, canPublish: draft.trim().length >= 2 && !busy, busy, error, start, cancel, publish };
}
