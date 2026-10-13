import { useCallback, useEffect, useState } from 'react';
import { ORGS } from '../data/orgs';
import { api, apiMode, errorText } from './http';

/** Tipos da API de moderação */
export interface ReportItem {
  id: string;
  reason: string;
  details: string;
  createdAt: string;
}
export interface ReportedReview {
  reviewId: string;
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
export interface Summary {
  openReports: number;
  reviewsWithReports: number;
  pendingOrgs: number;
}

const daysAgo = (d: number) => new Date(Date.now() - d * 86400000).toISOString();

/** Demonstração: filas de exemplo, para se ver o ecrã sem API */
function demoData(): { reports: ReportedReview[]; orgs: PendingOrg[] } {
  const ribeira = ORGS.find((o) => o.id === 'padaria-ribeira') ?? ORGS[0];
  const other = ORGS[3] ?? ORGS[1];
  return {
    reports: [
      {
        reviewId: 'demo-r1', orgId: ribeira.id, orgName: ribeira.name,
        text: 'O encarregado, o Sr. Joaquim, grita com toda a gente e ninguém faz nada.',
        tags: ['Ambiente seguro'], count: 2, firstReportedAt: daysAgo(1),
        reports: [
          { id: 'd1', reason: 'nome', details: 'Diz o nome do encarregado.', createdAt: daysAgo(1) },
          { id: 'd2', reason: 'ofensa', details: '', createdAt: daysAgo(0) },
        ],
      },
      {
        reviewId: 'demo-r2', orgId: other.id, orgName: other.name,
        text: 'Pagam tarde e os horários mudam sempre em cima da hora.',
        tags: ['Salário em atraso'], count: 1, firstReportedAt: daysAgo(2),
        reports: [{ id: 'd3', reason: 'falso', details: 'Isto nunca aconteceu.', createdAt: daysAgo(2) }],
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
  };
}

/** Filas da moderação e ações (API ou demonstração) */
export function useModeration() {
  const [reports, setReports] = useState<ReportedReview[]>([]);
  const [orgs, setOrgs] = useState<PendingOrg[]>([]);
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
      } else {
        const [r, o] = await Promise.all([api<{ items: ReportedReview[] }>('/moderation/reports'), api<{ items: PendingOrg[] }>('/moderation/orgs')]);
        setReports(r.items);
        setOrgs(o.items);
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
    loading,
    error,
    reload,
    decide: (reviewId: string, action: 'remove' | 'keep', note: string) =>
      run(
        () => api(`/moderation/reviews/${reviewId}/decision`, { body: { action, note } }),
        () => setReports((x) => x.filter((r) => r.reviewId !== reviewId)),
      ),
    approve: (id: string) => run(() => api(`/orgs/${id}/approve`, { method: 'POST' }), () => setOrgs((x) => x.filter((o) => o.id !== id))),
    reject: (id: string, note: string) => run(() => api(`/orgs/${id}/reject`, { body: { note } }), () => setOrgs((x) => x.filter((o) => o.id !== id))),
    merge: (id: string, targetId: string) => run(() => api(`/orgs/${id}/merge`, { body: { targetId } }), () => setOrgs((x) => x.filter((o) => o.id !== id))),
  };
}
