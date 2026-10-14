import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { api, API_URL, ApiError, apiMode, errorText } from '../api/http';
import { toMessage, toMyReview, toOrg, type ApiOrg, type ApiReview } from '../api/mappers';
import { bumpHelpful, loadEngagement, syncOnLogin } from './engagement';
import { DEFAULT_PREFS, type CriterionKey } from '../data/criteria';
import { ORG_BY_ID, type Org, type OrgType, type Scores } from '../data/orgs';
import { textLengthBucket, track } from '../analytics';
import { detectRedFlags } from './moderation';
import { getLang, tr } from '../i18n';

/**
 * Estado da aplicação.
 * - Modo demonstração (sem VITE_API_URL): tudo no browser (localStorage), com dados de exemplo.
 * - Modo API: sessão, organizações, avaliações, verificação e mensagens vêm da API.
 *   Preferências, guardadas e "útil" continuam no browser nesta fase.
 */

export interface MyReview {
  id: string;
  orgId: string;
  locationId?: string;
  scores: Partial<Scores>;
  avg: number;
  recommend: boolean | null;
  tags: string[];
  text: string;
  when: string;
  flagged: boolean;
  /** quem escreveu confirmou que trabalha lá (antes ou depois de publicar) */
  verified?: boolean;
}

export interface SupportMessage {
  id: string;
  orgId: string;
  kinds: string[];
  found: string[];
  when: string;
  read: boolean;
  /** 'moderation': aviso de uma decisão da moderação (avaliação removida ou denúncia analisada) */
  type?: 'support' | 'moderation';
  orgName?: string;
  details?: { decision: 'removed' | 'upheld' | 'rejected' | 'appeal_reversed' | 'appeal_confirmed'; note: string; orgName?: string } | null;
  /** Contestar a decisão (DSA art. 20.º): disponível até quando, prazo terminado, ou o estado do pedido */
  appeal?: AppealState;
}

export type AppealState =
  | null
  | { status: 'available'; until: string }
  | { status: 'expired' }
  | { status: 'open' | 'reversed' | 'confirmed'; note?: string | null };

export interface Draft {
  orgId: string | null;
  locationId: string | null;
  verified: 'email' | 'documento' | null;
  scores: Partial<Scores>;
  recommend: boolean | null;
  tags: string[];
  text: string;
}

export interface AddedOrg {
  id: string;
  name: string;
  type: OrgType;
  city: string;
}

interface State {
  prefs: CriterionKey[];
  onboarded: boolean;
  user: { email: string; role?: 'user' | 'moderator' } | null;
  saved: string[];
  useful: Record<string, boolean>;
  myReviews: MyReview[];
  messages: SupportMessage[];
  draft: Draft;
  added: AddedOrg[];
  replies: Record<string, string>;
  lastPublished: string | null;
}

export type Failure = { ok: false; status: number; message: string; body: Record<string, any> | null };
/** Resultado de uma ação que pode falhar na API */
export type Result<T = undefined> = { ok: true; value?: T } | Failure;

/** Categoria de uma falha para a medição (nunca a mensagem) */
const failKind = (f: Failure) =>
  f.status === 429 ? 'rate_limited' : f.status === 422 ? 'moderation_blocked' : f.status === 409 ? 'duplicate' : f.status === 401 ? 'auth' : f.status === 0 ? 'network' : 'error';

const fail = (e: unknown): Failure => ({
  ok: false,
  status: e instanceof ApiError ? e.status : 0,
  message: errorText(e),
  body: e instanceof ApiError ? e.body : null,
});

const EXAMPLE_TEXT =
  'Gosto das colegas, mas há meses que o salário chega com duas semanas de atraso. O encarregado faz comentários sobre o meu corpo à frente dos clientes.';

export const emptyDraft = (): Draft => ({
  orgId: null, locationId: null, verified: null, scores: {}, recommend: null, tags: [], text: '',
});

/** Rascunho de exemplo (igual ao do design) para a demonstração do fluxo de avaliar */
export const exampleDraft = (): Draft => ({
  orgId: 'padaria-ribeira',
  locationId: 'flores',
  verified: null,
  scores: { salario: 2, equilibrio: 3, respeito: 1, ambiente: 4, lideranca: 2, estabilidade: 3 },
  recommend: null,
  tags: ['Salário em atraso'],
  text: EXAMPLE_TEXT,
});

const initial = (): State =>
  apiMode
    ? {
        prefs: DEFAULT_PREFS, onboarded: false, user: null, saved: [], useful: {}, myReviews: [], messages: [],
        draft: emptyDraft(), added: [], replies: {}, lastPublished: null,
      }
    : {
        prefs: DEFAULT_PREFS,
        onboarded: false,
        // Demonstração: a conta de exemplo é moderadora, para se ver o backoffice
        user: { email: 'pessoa@gmail.com', role: 'moderator' },
        saved: ['padaria-ribeira', 'maos-dadas', 'rede-vizinha', 'lavandaria-sol'],
        useful: {},
        myReviews: [
          {
            id: 'mine-1', orgId: 'cafe-vinha', scores: { salario: 3, equilibrio: 3, respeito: 4, ambiente: 4, lideranca: 4, estabilidade: 3, progressao: 3, proposito: 4 },
            avg: 3.6, recommend: true, tags: ['Ambiente seguro'], text: 'Boa equipa. Horários pouco previsíveis no verão.', when: 'há 1 ano', flagged: false,
          },
        ],
        messages: [],
        draft: exampleDraft(),
        added: [],
        replies: {},
        lastPublished: null,
      };

const KEY = apiMode ? 'peekjob-api-v1' : 'peekjob-poc-v1';
/** Em modo API, a sessão e os dados pessoais vêm sempre do servidor, nunca do browser */
const VOLATILE: (keyof State)[] = apiMode ? ['user', 'myReviews', 'messages', 'lastPublished'] : [];

function load(): State {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) {
      const saved = JSON.parse(raw);
      VOLATILE.forEach((k) => delete saved[k]);
      return { ...initial(), ...saved };
    }
  } catch {
    /* sem storage: começa do zero */
  }
  return initial();
}

const avgOf = (sc: Partial<Scores>) => {
  const v = Object.values(sc).filter((x): x is number => typeof x === 'number');
  return v.length ? Math.round((v.reduce((a, b) => a + b, 0) / v.length) * 10) / 10 : 0;
};

/** Dados vindos da API (não persistidos) */
export interface Remote {
  orgs: Org[] | null;
  details: Record<string, Org>;
  /** organizações vistas na pesquisa (incluindo pendentes) */
  known: Record<string, Org>;
  loading: Record<string, boolean>;
  missing: Record<string, boolean>;
  ready: boolean;
}

function useAppState() {
  const [st, setSt] = useState<State>(load);
  const [remote, setRemote] = useState<Remote>({ orgs: null, details: {}, known: {}, loading: {}, missing: {}, ready: !apiMode });
  const loadingRef = useRef<Record<string, boolean>>({});
  const stRef = useRef(st);
  stRef.current = st;
  const remoteRef = useRef(remote);
  remoteRef.current = remote;
  const orgTypeOf = (id: string | null) => {
    if (!id) return undefined;
    const r = remoteRef.current;
    return (r.details[id] ?? r.known[id] ?? r.orgs?.find((o) => o.id === id) ?? ORG_BY_ID[id])?.type ?? stRef.current.added.find((a) => a.id === id)?.type;
  };

  useEffect(() => {
    try {
      const copy: Partial<State> = { ...st };
      VOLATILE.forEach((k) => delete copy[k]);
      localStorage.setItem(KEY, JSON.stringify(copy));
    } catch {
      /* ignora */
    }
  }, [st]);

  const set = useCallback((patch: Partial<State> | ((s: State) => Partial<State>)) => {
    setSt((s) => ({ ...s, ...(typeof patch === 'function' ? patch(s) : patch) }));
  }, []);

  /* ---------------- API: carregar ---------------- */

  const loadMine = useCallback(async () => {
    const [msgs, revs] = await Promise.all([
      api<{ items: Parameters<typeof toMessage>[0][] }>('/me/messages'),
      api<{ items: (ApiReview & { orgId: string })[] }>('/me/reviews'),
    ]);
    set({ messages: msgs.items.map(toMessage), myReviews: revs.items.map(toMyReview) });
  }, [set]);

  /** Guardadas e "útil" da conta (com sessão, a conta manda) */
  const loadSaved = useCallback(async () => {
    set(await loadEngagement(api));
  }, [set]);

  const loadOrgs = useCallback(async () => {
    const r = await api<{ items: ApiOrg[] }>('/orgs');
    setRemote((x) => ({ ...x, orgs: r.items.map((o) => toOrg(o)) }));
  }, []);

  const loadOrg = useCallback(async (id: string, force = false) => {
    if (loadingRef.current[id] && !force) return;
    loadingRef.current[id] = true;
    setRemote((x) => ({ ...x, loading: { ...x.loading, [id]: true } }));
    try {
      const [o, revs] = await Promise.all([api<ApiOrg>(`/orgs/${id}`), api<{ items: ApiReview[] }>(`/orgs/${id}/reviews`)]);
      setRemote((x) => ({ ...x, details: { ...x.details, [id]: toOrg(o, revs.items) }, loading: { ...x.loading, [id]: false } }));
    } catch {
      setRemote((x) => ({ ...x, missing: { ...x.missing, [id]: true }, loading: { ...x.loading, [id]: false } }));
    }
  }, []);

  useEffect(() => {
    if (!apiMode) return;
    // cada passo trata os seus erros (try/catch); a promessa em si não precisa de ser esperada
    void (async () => {
      try {
        const me = await api<{ user: { role: 'user' | 'moderator' } }>('/auth/me');
        set({ user: { email: '', role: me.user.role } });
        await Promise.all([loadMine(), loadSaved()]);
      } catch {
        set({ user: null });
      }
      try {
        await loadOrgs();
      } catch {
        /* sem API: as listas ficam vazias */
      }
      setRemote((x) => ({ ...x, ready: true }));
    })();
  }, [set, loadMine, loadSaved, loadOrgs]);

  /* ---------------- Ações ---------------- */

  const actions = useMemo(
    () => ({
      setPrefs: (prefs: CriterionKey[]) => {
        track('prefs_saved', { priorities_count: prefs.length, top_priority: prefs[0] });
        set({ prefs, onboarded: true });
      },
      togglePref: (k: CriterionKey) =>
        set((s) => {
          const p = s.prefs.includes(k) ? s.prefs.filter((x) => x !== k) : s.prefs.length < 3 ? [...s.prefs, k] : s.prefs;
          return { prefs: p };
        }),
      finishOnboarding: () => set({ onboarded: true }),

      /** Demonstração: entra logo. Modo API: usar requestLink + verifyLink. */
      login: (email: string) => set({ user: { email } }),
      requestLink: async (email: string): Promise<Result> => {
        try {
          await api('/auth/magic-link', { body: { email, lang: getLang() } });
          track('login_link_requested', { result: 'sent' });
          return { ok: true };
        } catch (e) {
          const f = fail(e);
          track('login_link_requested', { result: failKind(f) });
          return f;
        }
      },
      verifyLink: async (token: string): Promise<Result> => {
        try {
          const r = await api<{ user: { role: 'user' | 'moderator' } }>('/auth/verify', { body: { token } });
          track('login', { method: 'magic_link', result: 'success' });
          set({ user: { email: '', role: r.user.role } });
          // o que foi guardado ou marcado como útil antes de entrar passa para a conta
          const { saved, useful } = stRef.current;
          const synced = await syncOnLogin(api, { saved, useful }).catch(() => null);
          if (synced) {
            set({ saved: synced.saved, useful: synced.useful });
            if (synced.pushed.length) setRemote((x) => ({ ...x, details: synced.pushed.reduce((d, id) => bumpHelpful(d, id, 1), x.details) }));
          }
          await loadMine();
          return { ok: true };
        } catch (e) {
          const f = fail(e);
          track('login', { method: 'magic_link', result: f.status === 401 ? 'link_expired' : failKind(f) });
          return f;
        }
      },
      logout: async () => {
        if (apiMode) await api('/auth/logout', { method: 'POST' }).catch(() => undefined);
        // as guardadas e os úteis são da conta: não ficam no browser depois de sair
        set({ user: null, ...(apiMode ? { myReviews: [], messages: [], saved: [], useful: {} } : {}) });
      },

      /** Guardar: muda logo no ecrã; com sessão grava na conta e, se falhar, volta atrás */
      toggleSave: (id: string) => {
        const on = !stRef.current.saved.includes(id);
        track('save_org', { saved: on });
        const apply = (v: boolean) => set((s) => ({ saved: v ? [...s.saved.filter((x) => x !== id), id] : s.saved.filter((x) => x !== id) }));
        apply(on);
        if (apiMode && stRef.current.user) {
          api(`/me/saved/${id}`, { method: on ? 'PUT' : 'DELETE' }).catch(() => apply(!on));
        }
      },
      /** Útil: sem sessão fica no browser (junta-se à conta ao entrar); com sessão conta no servidor */
      toggleUseful: (id: string) => {
        const on = !stRef.current.useful[id];
        track('mark_helpful', { helpful: on });
        const apply = (v: boolean) => {
          set((s) => ({ useful: { ...s.useful, [id]: v } }));
          if (apiMode && stRef.current.user) setRemote((x) => ({ ...x, details: bumpHelpful(x.details, id, v ? 1 : -1) }));
        };
        apply(on);
        if (apiMode && stRef.current.user) {
          api(`/reviews/${id}/helpful`, { method: on ? 'PUT' : 'DELETE' }).catch(() => apply(!on));
        }
      },
      /** Confirmou que trabalha na organização: as suas avaliações dela passam a verificadas (o servidor faz o mesmo) */
      markVerified: (orgId: string) => set((s) => ({ myReviews: s.myReviews.map((r) => (r.orgId === orgId ? { ...r, verified: true } : r)) })),

      updateDraft: (patch: Partial<Draft> | ((d: Draft) => Partial<Draft>)) => set((s) => ({ draft: { ...s.draft, ...(typeof patch === 'function' ? patch(s.draft) : patch) } })),
      startDraft: (orgId: string, locationId: string | null) =>
        set((s) => ({ draft: s.draft.orgId === orgId ? { ...s.draft, locationId } : { ...emptyDraft(), orgId, locationId } })),
      resetDraftToExample: () => set({ draft: apiMode ? emptyDraft() : exampleDraft() }),

      /** Lembra uma organização vista na pesquisa (ex.: pendente, que não aparece nas listas) */
      remember: (o: Org) => setRemote((x) => (x.known[o.id] ? x : { ...x, known: { ...x.known, [o.id]: o } })),

      /** Adiciona uma organização que falta. Modo API: devolve o id real (ou o da existente, se o NIF já existir). */
      addOrg: async (o: Omit<AddedOrg, 'id'> & { nif?: string }): Promise<Result<{ id: string; duplicates: { id: string; name: string }[] }>> => {
        if (!apiMode) {
          const id = 'nova-' + o.name.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
          set((s) => ({
            added: s.added.some((a) => a.id === id) ? s.added : [...s.added, { name: o.name, type: o.type, city: o.city, id }],
            draft: { ...emptyDraft(), orgId: id },
          }));
          track('review_org_created', { org_type: o.type, result: 'created' });
          return { ok: true, value: { id, duplicates: [] } };
        }
        try {
          const r = await api<{ id: string; name: string; type: OrgType; city: string; possibleDuplicates: { id: string; name: string }[] }>('/orgs', { body: o });
          set((s) => ({ added: [...s.added.filter((a) => a.id !== r.id), { id: r.id, name: r.name, type: r.type, city: r.city }], draft: { ...emptyDraft(), orgId: r.id } }));
          track('review_org_created', { org_type: o.type, result: r.possibleDuplicates.length ? 'created_with_duplicates' : 'created' });
          return { ok: true, value: { id: r.id, duplicates: r.possibleDuplicates } };
        } catch (e) {
          if (e instanceof ApiError && e.status === 409 && e.body?.existingId) {
            set({ draft: { ...emptyDraft(), orgId: e.body.existingId } });
            track('review_org_created', { org_type: o.type, result: 'existing' });
            void loadOrg(e.body.existingId);
            return { ok: true, value: { id: e.body.existingId as string, duplicates: [] } };
          }
          return fail(e);
        }
      },

      /* Verificação anónima (modo API) */
      sendWorkEmailCode: async (orgId: string, email: string): Promise<Result> => {
        try {
          await api('/verifications/email', { body: { orgId, email, lang: getLang() } });
          track('verification', { method: 'email', step: 'code_sent' });
          return { ok: true };
        } catch (e) {
          const f = fail(e);
          track('verification', { method: 'email', step: `send_${failKind(f)}` });
          return f;
        }
      },
      confirmWorkEmailCode: async (orgId: string, code: string): Promise<Result> => {
        try {
          await api('/verifications/email/confirm', { body: { orgId, code } });
          track('verification', { method: 'email', step: 'confirmed' });
          return { ok: true };
        } catch (e) {
          const f = fail(e);
          track('verification', { method: 'email', step: f.status === 400 ? 'code_rejected' : `confirm_${failKind(f)}` });
          return f;
        }
      },
      verifyDocument: async (orgId: string, file: File): Promise<Result> => {
        try {
          const form = new FormData();
          form.append('orgId', orgId);
          form.append('file', file);
          await api('/verifications/document', { form });
          track('verification', { method: 'document', step: 'confirmed' });
          return { ok: true };
        } catch (e) {
          const f = fail(e);
          track('verification', { method: 'document', step: f.status === 422 ? 'nif_not_found' : f.status === 415 ? 'not_pdf' : failKind(f) });
          return f;
        }
      },

      /**
       * Publica o rascunho.
       * Demonstração: guarda localmente (com mensagem de apoio se houver red flag e sessão).
       * Modo API: o servidor modera (422 com sugestão se houver insultos/nomes) e cria a mensagem de apoio.
       */
      publish: async (): Promise<Result> => {
        const pd = stRef.current.draft;
        const submitInfo = {
          verified: !!pd.verified,
          criteria_count: Object.values(pd.scores).filter((v) => typeof v === 'number').length,
          tags_count: pd.tags.length,
          text_length: textLengthBucket(pd.text.trim().length),
          org_type: orgTypeOf(pd.orgId),
        };
        if (!apiMode) {
          track('review_submit', { result: 'published', ...submitInfo });
          set((s) => {
            const d = s.draft;
            if (!d.orgId) return {};
            const rf = detectRedFlags(d.text, d.tags);
            const id = 'mine-' + Date.now();
            const review: MyReview = {
              id, orgId: d.orgId, locationId: d.locationId ?? undefined, scores: d.scores, avg: avgOf(d.scores),
              recommend: d.recommend, tags: d.tags, text: d.text, when: 'hoje', flagged: rf.flagged, verified: !!d.verified,
            };
            const msgs = rf.flagged && s.user
              ? [{ id: 'msg-' + Date.now(), orgId: d.orgId, kinds: rf.kinds, found: rf.found, when: 'hoje', read: false }, ...s.messages]
              : s.messages;
            return { myReviews: [review, ...s.myReviews], messages: msgs, lastPublished: id, draft: emptyDraft() };
          });
          return { ok: true };
        }
        const d = stRef.current.draft;
        if (!d.orgId) return { ok: false, status: 0, message: tr('Escolhe a organização.', 'Choose the organisation.'), body: null };
        try {
          const loc = d.locationId && /^[0-9a-f-]{36}$/i.test(d.locationId) ? d.locationId : undefined;
          const r = await api<{ review: ApiReview }>(`/orgs/${d.orgId}/reviews`, {
            body: { scores: d.scores, recommend: d.recommend, tags: d.tags, text: d.text, locationId: loc },
          });
          const mine = toMyReview({ ...r.review, orgId: d.orgId });
          set((s) => ({ myReviews: [mine, ...s.myReviews.filter((x) => x.id !== mine.id)], lastPublished: mine.id, draft: emptyDraft() }));
          void loadMine().catch(() => undefined);
          void loadOrgs().catch(() => undefined);
          track('review_submit', { result: 'published', ...submitInfo });
          await loadOrg(d.orgId, true); // o ecrã seguinte mostra o nº de avaliações já atualizado
          return { ok: true };
        } catch (e) {
          const f = fail(e);
          track('review_submit', { result: failKind(f), ...submitInfo });
          return f;
        }
      },

      /** Denunciar uma avaliação (modo API). Contacto opcional para quem não tem sessão. */
      reportReview: async (
        reviewId: string,
        body: { reason: string; details: string; contactName?: string; contactEmail?: string },
      ): Promise<Result<{ reference: string }>> => {
        try {
          const r = await api<{ reference: string }>(`/reviews/${reviewId}/reports`, { body: { ...body, lang: getLang() } });
          return { ok: true, value: r };
        } catch (e) {
          return fail(e);
        }
      },

      /** RGPD: descarregar os meus dados (modo API: do servidor; demonstração: o que está no browser) */
      exportMyData: async (): Promise<Result<{ blob: Blob; filename: string }>> => {
        const date = new Date().toISOString().slice(0, 10);
        const filename = `peekjob-os-meus-dados-${date}.json`;
        if (!apiMode) {
          const { user, ...rest } = stRef.current;
          return { ok: true, value: { blob: new Blob([JSON.stringify({ exportedAt: new Date().toISOString(), demo: true, ...rest }, null, 2)], { type: 'application/json' }), filename } };
        }
        try {
          const res = await fetch(`${API_URL}/me/export`, { credentials: 'include' });
          if (!res.ok) throw new ApiError(res.status, await res.json().catch(() => null));
          return { ok: true, value: { blob: await res.blob(), filename } };
        } catch (e) {
          return fail(e);
        }
      },

      /** RGPD: apagar a conta (e, por omissão, as avaliações) */
      deleteAccount: async (keepReviews: boolean): Promise<Result> => {
        if (!apiMode) {
          setSt(initial());
          set({ user: null, myReviews: keepReviews ? stRef.current.myReviews : [], messages: [] });
          return { ok: true };
        }
        try {
          await api('/me', { method: 'DELETE', body: { keepReviews } });
          set({ user: null, myReviews: [], messages: [], lastPublished: null });
          void loadOrgs().catch(() => undefined);
          return { ok: true };
        } catch (e) {
          return fail(e);
        }
      },

      /** Pedir a revisão de uma decisão da moderação (a partir do aviso recebido) */
      appeal: async (messageId: string, text: string): Promise<Result> => {
        try {
          if (apiMode) await api(`/me/messages/${messageId}/appeal`, { body: { text } });
          set((s) => ({ messages: s.messages.map((m) => (m.id === messageId ? { ...m, appeal: { status: 'open' } } : m)) }));
          track('moderation_appeal', { result: 'sent' });
          return { ok: true };
        } catch (e) {
          return fail(e);
        }
      },

      markMessagesRead: () => {
        if (apiMode) {
          stRef.current.messages.filter((m) => !m.read).forEach((m) => void api(`/me/messages/${m.id}/read`, { method: 'POST' }).catch(() => undefined));
        }
        set((s) => (s.messages.some((m) => !m.read) ? { messages: s.messages.map((m) => ({ ...m, read: true })) } : {}));
      },
      reply: (reviewId: string, text: string) => set((s) => ({ replies: { ...s.replies, [reviewId]: text } })),
      resetDemo: () => setSt(initial()),
      loadOrg,
    }),
    [set, loadMine, loadOrgs, loadOrg],
  );

  return { ...st, ...actions, remote };
}

type Store = ReturnType<typeof useAppState>;
const Ctx = createContext<Store | null>(null);

export function StoreProvider({ children }: { children: ReactNode }) {
  const store = useAppState();
  return <Ctx.Provider value={store}>{children}</Ctx.Provider>;
}

export function useStore() {
  const s = useContext(Ctx);
  if (!s) throw new Error('useStore fora do StoreProvider');
  return s;
}

export type { Org };
export { avgOf };
