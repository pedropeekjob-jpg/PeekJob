import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { api, ApiError, apiMode, errorText } from '../api/http';
import { toMessage, toMyReview, toOrg, type ApiOrg, type ApiReview } from '../api/mappers';
import { DEFAULT_PREFS, type CriterionKey } from '../data/criteria';
import type { Org, OrgType, Scores } from '../data/orgs';
import { detectRedFlags } from './moderation';

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
}

export interface SupportMessage {
  id: string;
  orgId: string;
  kinds: string[];
  found: string[];
  when: string;
  read: boolean;
}

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
  user: { email: string } | null;
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
        user: { email: 'pessoa@gmail.com' },
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
    (async () => {
      try {
        await api('/auth/me');
        set({ user: { email: '' } });
        await loadMine();
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
  }, [set, loadMine, loadOrgs]);

  /* ---------------- Ações ---------------- */

  const actions = useMemo(
    () => ({
      setPrefs: (prefs: CriterionKey[]) => set({ prefs, onboarded: true }),
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
          await api('/auth/magic-link', { body: { email } });
          return { ok: true };
        } catch (e) {
          return fail(e);
        }
      },
      verifyLink: async (token: string): Promise<Result> => {
        try {
          await api('/auth/verify', { body: { token } });
          set({ user: { email: '' } });
          await loadMine();
          return { ok: true };
        } catch (e) {
          return fail(e);
        }
      },
      logout: async () => {
        if (apiMode) await api('/auth/logout', { method: 'POST' }).catch(() => undefined);
        set({ user: null, ...(apiMode ? { myReviews: [], messages: [] } : {}) });
      },

      toggleSave: (id: string) => set((s) => ({ saved: s.saved.includes(id) ? s.saved.filter((x) => x !== id) : [...s.saved, id] })),
      toggleUseful: (id: string) => set((s) => ({ useful: { ...s.useful, [id]: !s.useful[id] } })),
      updateDraft: (patch: Partial<Draft>) => set((s) => ({ draft: { ...s.draft, ...patch } })),
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
          return { ok: true, value: { id, duplicates: [] } };
        }
        try {
          const r = await api<{ id: string; name: string; type: OrgType; city: string; possibleDuplicates: { id: string; name: string }[] }>('/orgs', { body: o });
          set((s) => ({ added: [...s.added.filter((a) => a.id !== r.id), { id: r.id, name: r.name, type: r.type, city: r.city }], draft: { ...emptyDraft(), orgId: r.id } }));
          return { ok: true, value: { id: r.id, duplicates: r.possibleDuplicates } };
        } catch (e) {
          if (e instanceof ApiError && e.status === 409 && e.body?.existingId) {
            set({ draft: { ...emptyDraft(), orgId: e.body.existingId } });
            void loadOrg(e.body.existingId);
            return { ok: true, value: { id: e.body.existingId as string, duplicates: [] } };
          }
          return fail(e);
        }
      },

      /* Verificação anónima (modo API) */
      sendWorkEmailCode: async (orgId: string, email: string): Promise<Result> => {
        try {
          await api('/verifications/email', { body: { orgId, email } });
          return { ok: true };
        } catch (e) {
          return fail(e);
        }
      },
      confirmWorkEmailCode: async (orgId: string, code: string): Promise<Result> => {
        try {
          await api('/verifications/email/confirm', { body: { orgId, code } });
          return { ok: true };
        } catch (e) {
          return fail(e);
        }
      },
      verifyDocument: async (orgId: string, file: File): Promise<Result> => {
        try {
          const form = new FormData();
          form.append('orgId', orgId);
          form.append('file', file);
          await api('/verifications/document', { form });
          return { ok: true };
        } catch (e) {
          return fail(e);
        }
      },

      /**
       * Publica o rascunho.
       * Demonstração: guarda localmente (com mensagem de apoio se houver red flag e sessão).
       * Modo API: o servidor modera (422 com sugestão se houver insultos/nomes) e cria a mensagem de apoio.
       */
      publish: async (): Promise<Result> => {
        if (!apiMode) {
          set((s) => {
            const d = s.draft;
            if (!d.orgId) return {};
            const rf = detectRedFlags(d.text, d.tags);
            const id = 'mine-' + Date.now();
            const review: MyReview = {
              id, orgId: d.orgId, locationId: d.locationId ?? undefined, scores: d.scores, avg: avgOf(d.scores),
              recommend: d.recommend, tags: d.tags, text: d.text, when: 'hoje', flagged: rf.flagged,
            };
            const msgs = rf.flagged && s.user
              ? [{ id: 'msg-' + Date.now(), orgId: d.orgId, kinds: rf.kinds, found: rf.found, when: 'hoje', read: false }, ...s.messages]
              : s.messages;
            return { myReviews: [review, ...s.myReviews], messages: msgs, lastPublished: id, draft: emptyDraft() };
          });
          return { ok: true };
        }
        const d = stRef.current.draft;
        if (!d.orgId) return { ok: false, status: 0, message: 'Escolhe a organização.', body: null };
        try {
          const loc = d.locationId && /^[0-9a-f-]{36}$/i.test(d.locationId) ? d.locationId : undefined;
          const r = await api<{ review: ApiReview }>(`/orgs/${d.orgId}/reviews`, {
            body: { scores: d.scores, recommend: d.recommend, tags: d.tags, text: d.text, locationId: loc },
          });
          const mine = toMyReview({ ...r.review, orgId: d.orgId });
          set((s) => ({ myReviews: [mine, ...s.myReviews.filter((x) => x.id !== mine.id)], lastPublished: mine.id, draft: emptyDraft() }));
          void loadMine().catch(() => undefined);
          void loadOrgs().catch(() => undefined);
          await loadOrg(d.orgId, true); // o ecrã seguinte mostra o nº de avaliações já atualizado
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
