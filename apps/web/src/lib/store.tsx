import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { DEFAULT_PREFS, type CriterionKey } from '../data/criteria';
import type { Org, OrgType, Scores } from '../data/orgs';
import { detectRedFlags } from './moderation';

/**
 * Estado da aplicação no POC, guardado no localStorage.
 * Em produção, estas operações passam a chamadas à API (ver src/api).
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

const initial = (): State => ({
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
});

const KEY = 'peekjob-poc-v1';

function load(): State {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) return { ...initial(), ...JSON.parse(raw) };
  } catch {
    /* sem storage: começa do zero */
  }
  return initial();
}

const avgOf = (sc: Partial<Scores>) => {
  const v = Object.values(sc).filter((x): x is number => typeof x === 'number');
  return v.length ? Math.round((v.reduce((a, b) => a + b, 0) / v.length) * 10) / 10 : 0;
};

function useAppState() {
  const [st, setSt] = useState<State>(load);

  useEffect(() => {
    try {
      localStorage.setItem(KEY, JSON.stringify(st));
    } catch {
      /* ignora */
    }
  }, [st]);

  const set = useCallback((patch: Partial<State> | ((s: State) => Partial<State>)) => {
    setSt((s) => ({ ...s, ...(typeof patch === 'function' ? patch(s) : patch) }));
  }, []);

  const actions = useMemo(
    () => ({
      setPrefs: (prefs: CriterionKey[]) => set({ prefs, onboarded: true }),
      togglePref: (k: CriterionKey) =>
        set((s) => {
          const p = s.prefs.includes(k) ? s.prefs.filter((x) => x !== k) : s.prefs.length < 3 ? [...s.prefs, k] : s.prefs;
          return { prefs: p };
        }),
      finishOnboarding: () => set({ onboarded: true }),
      login: (email: string) => set({ user: { email } }),
      logout: () => set({ user: null }),
      toggleSave: (id: string) => set((s) => ({ saved: s.saved.includes(id) ? s.saved.filter((x) => x !== id) : [...s.saved, id] })),
      toggleUseful: (id: string) => set((s) => ({ useful: { ...s.useful, [id]: !s.useful[id] } })),
      updateDraft: (patch: Partial<Draft>) => set((s) => ({ draft: { ...s.draft, ...patch } })),
      startDraft: (orgId: string, locationId: string | null) =>
        set((s) => ({ draft: s.draft.orgId === orgId ? { ...s.draft, locationId } : { ...emptyDraft(), orgId, locationId } })),
      resetDraftToExample: () => set({ draft: exampleDraft() }),
      addOrg: (o: Omit<AddedOrg, 'id'>) => {
        const id = 'nova-' + o.name.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
        set((s) => ({ added: s.added.some((a) => a.id === id) ? s.added : [...s.added, { ...o, id }], draft: { ...emptyDraft(), orgId: id } }));
        return id;
      },
      /** Publica o rascunho. Se houver red flag e a pessoa tiver sessão, cria uma mensagem privada de apoio. */
      publish: () =>
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
        }),
      markMessagesRead: () => set((s) => ({ messages: s.messages.map((m) => ({ ...m, read: true })) })),
      reply: (reviewId: string, text: string) => set((s) => ({ replies: { ...s.replies, [reviewId]: text } })),
      resetDemo: () => setSt(initial()),
    }),
    [set],
  );

  return { ...st, ...actions };
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
