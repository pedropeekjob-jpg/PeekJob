import { useCallback, useEffect, useState } from 'react';
import { ORGS } from '../data/orgs';
import type { ManagedOrg, PendingClaim, Plan } from './accounts';
import { api, apiMode, errorText } from './http';

/** Tipos da API de moderação */
export interface ReportItem {
  id: string;
  reason: string;
  details: string;
  createdAt: string;
}
/** O que se denuncia: uma avaliação ou uma entrevista */
export type ContentKind = 'review' | 'interview';
export interface ReportedContent {
  kind: ContentKind;
  contentId: string;
  /** só nas entrevistas: a função */
  role?: string;
  orgId: string;
  orgName: string;
  text: string;
  tags: string[];
  count: number;
  firstReportedAt: string;
  reports: ReportItem[];
}
export interface PendingOrg {
  id: string;
  name: string;
  type: string;
  city: string;
  nif: string | null;
  address: string | null;
  createdAt: string;
  reviewers: number;
  duplicates: { id: string; name: string; city: string; type: string; status: 'active' | 'pending' }[];
}
/** Pedido de revisão de uma decisão (DSA art. 20.º) */
export interface Appeal {
  id: string;
  side: 'author' | 'reporter';
  originalDecision: 'removed' | 'rejected';
  originalNote: string | null;
  text: string;
  createdAt: string;
  orgName: string;
  content: { kind: ContentKind; id: string; text: string; tags: string[]; avg?: number; role?: string; status: string };
}
export interface Summary {
  openReports: number;
  reviewsWithReports: number;
  pendingOrgs: number;
  openAppeals: number;
}

const daysAgo = (d: number) => new Date(Date.now() - d * 86400000).toISOString();

/** Demonstração: filas de exemplo, para se ver o ecrã sem API */
function demoData(): { reports: ReportedContent[]; orgs: PendingOrg[]; appeals: Appeal[]; claims: PendingClaim[]; managed: ManagedOrg[] } {
  const ribeira = ORGS.find((o) => o.id === 'padaria-ribeira') ?? ORGS[0];
  const other = ORGS[3] ?? ORGS[1];
  return {
    reports: [
      {
        kind: 'review', contentId: 'demo-r1', orgId: ribeira.id, orgName: ribeira.name,
        text: 'O encarregado, o Sr. Joaquim, grita com toda a gente e ninguém faz nada.',
        tags: ['Ambiente seguro'], count: 2, firstReportedAt: daysAgo(1),
        reports: [
          { id: 'd1', reason: 'nome', details: 'Diz o nome do encarregado.', createdAt: daysAgo(1) },
          { id: 'd2', reason: 'ofensa', details: '', createdAt: daysAgo(0) },
        ],
      },
      {
        kind: 'review', contentId: 'demo-r2', orgId: other.id, orgName: other.name,
        text: 'Pagam tarde e os horários mudam sempre em cima da hora.',
        tags: ['Salário em atraso'], count: 1, firstReportedAt: daysAgo(2),
        reports: [{ id: 'd3', reason: 'falso', details: 'Isto nunca aconteceu.', createdAt: daysAgo(2) }],
      },
      {
        kind: 'interview', contentId: 'demo-i1', role: 'Balcão', orgId: ribeira.id, orgName: ribeira.name,
        text: 'A entrevistadora, a Dona Teresa, foi mal-educada.',
        tags: [], count: 1, firstReportedAt: daysAgo(1),
        reports: [{ id: 'd4', reason: 'nome', details: '', createdAt: daysAgo(1) }],
      },
    ],
    orgs: [
      {
        id: 'demo-o1', name: 'Padaria da Ribeira', type: 'PME', city: 'Porto', nif: null, address: 'Rua das Flores, Porto',
        createdAt: daysAgo(3), reviewers: 1,
        duplicates: [{ id: ribeira.id, name: ribeira.name, city: ribeira.city, type: ribeira.type, status: 'active' }],
      },
      { id: 'demo-o2', name: 'Horta Comunitária da Sé', type: 'Voluntariado', city: 'Braga', nif: null, address: null, createdAt: daysAgo(1), reviewers: 2, duplicates: [] },
    ],
    appeals: [
      {
        id: 'demo-a1', side: 'author', originalDecision: 'removed',
        originalNote: 'Identifica uma pessoa pelo nome ou por detalhes.',
        text: 'Não identifiquei ninguém: "a chefia" é um cargo, não uma pessoa.', createdAt: daysAgo(1), orgName: other.name,
        content: { kind: 'review', id: 'demo-r3', text: 'A chefia muda os turnos sem avisar e não paga as horas extra.', tags: ['Horas extra não pagas'], avg: 2.1, status: 'removed' },
      },
],
    claims: [
      {
        id: 'demo-c1', orgId: other.id, orgName: other.name, city: other.city, nif: null, method: 'email', emailDomain: 'cafevinha.pt', domainKnown: false,
        name: 'Marta Vinha', role: 'Sócia-gerente', members: 0, createdAt: daysAgo(1),
      },
    ],
    managed: [{ id: ribeira.id, name: ribeira.name, city: ribeira.city, plan: 'pro', members: 1 }],
  };
}

/** Depois de aprovar um pedido, a página passa a gerida (por ordem alfabética) */
export function withManaged(list: ManagedOrg[], c: PendingClaim): ManagedOrg[] {
  if (list.some((m) => m.id === c.orgId)) return list;
  const added: ManagedOrg = { id: c.orgId, name: c.orgName, city: c.city, plan: 'free', members: 1 };
  return [...list, added].sort((a, b) => a.name.localeCompare(b.name, 'pt'));
}

/** Filas da moderação e ações (API ou demonstração) */
export function useModeration() {
  const [reports, setReports] = useState<ReportedContent[]>([]);
  const [orgs, setOrgs] = useState<PendingOrg[]>([]);
  const [appeals, setAppeals] = useState<Appeal[]>([]);
  const [claims, setClaims] = useState<PendingClaim[]>([]);
  const [managed, setManaged] = useState<ManagedOrg[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const reload = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      if (!apiMode) {
        const d = demoData();
        setReports(d.reports);
        setOrgs(d.orgs);
        setAppeals(d.appeals);
        setClaims(d.claims);
        setManaged(d.managed);
      } else {
        const [r, o, a, c, m] = await Promise.all([
          api<{ items: ReportedContent[] }>('/moderation/reports'),
          api<{ items: PendingOrg[] }>('/moderation/orgs'),
          api<{ items: Appeal[] }>('/moderation/appeals'),
          api<{ items: PendingClaim[] }>('/moderation/claims'),
          api<{ items: ManagedOrg[] }>('/moderation/managed'),
        ]);
        setReports(r.items);
        setOrgs(o.items);
        setAppeals(a.items);
        setClaims(c.items);
        setManaged(m.items);
      }
    } catch (e) {
      setError(errorText(e));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void reload();
  }, [reload]);

  const run = async (call: () => Promise<unknown>, after: () => void) => {
    try {
      if (apiMode) await call();
      after();
      return null;
    } catch (e) {
      return errorText(e);
    }
  };

  return {
    reports,
    orgs,
    appeals,
    claims,
    managed,
    loading,
    error,
    reload,
    decide: (item: Pick<ReportedContent, 'kind' | 'contentId'>, action: 'remove' | 'keep', note: string) =>
      run(
        () => api(`/moderation/${item.kind === 'review' ? 'reviews' : 'interviews'}/${item.contentId}/decision`, { body: { action, note } }),
        () => setReports((x) => x.filter((r) => r.contentId !== item.contentId)),
      ),
    approve: (id: string) => run(() => api(`/orgs/${id}/approve`, { method: 'POST' }), () => setOrgs((x) => x.filter((o) => o.id !== id))),
    reject: (id: string, note: string) => run(() => api(`/orgs/${id}/reject`, { body: { note } }), () => setOrgs((x) => x.filter((o) => o.id !== id))),
    decideAppeal: (id: string, action: 'reverse' | 'confirm', note: string) =>
      run(() => api(`/moderation/appeals/${id}/decision`, { body: { action, note } }), () => setAppeals((x) => x.filter((a) => a.id !== id))),
    decideClaim: (c: PendingClaim, action: 'approve' | 'reject', note: string) =>
      run(
        () => api(`/moderation/claims/${c.id}/decision`, { body: { action, note } }),
        () => {
          setClaims((x) => x.filter((y) => y.id !== c.id));
          if (action === 'approve') setManaged((x) => withManaged(x, c));
        },
      ),
    setPlan: (id: string, plan: Plan) =>
      run(
        () => api(`/moderation/orgs/${id}/plan`, { method: 'PUT', body: { plan } }),
        () => setManaged((x) => x.map((m) => (m.id === id ? { ...m, plan } : m))),
      ),
    merge: (id: string, targetId: string) => run(() => api(`/orgs/${id}/merge`, { body: { targetId } }), () => setOrgs((x) => x.filter((o) => o.id !== id))),
  };
}
