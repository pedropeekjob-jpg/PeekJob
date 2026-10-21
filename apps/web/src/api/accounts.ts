import { getLang } from '../i18n';
import { api } from './http';

/** Contas das organizações (modo API): reivindicar, painel, respostas e moderação dos pedidos */

export type Plan = 'free' | 'pro';
export interface Claim {
  id: string;
  orgId: string;
  orgName: string;
  method: 'email' | 'document';
  status: 'pending' | 'approved' | 'rejected';
  note: string | null;
  createdAt: string;
}
export interface MyOrgs {
  orgs: { id: string; name: string; plan: Plan }[];
  claims: Claim[];
}
export interface ApiDashboard {
  org: { id: string; name: string; city: string; plan: Plan };
  week: { newReviews: number; answered: number; unanswered: number; scoreDelta: number };
  rank: { position: number; total: number; city: string } | null;
  tags: { label: string; n: number; up: boolean }[];
  pending: { id: string; avg: number; tags: string[]; text: string; createdAt: string }[];
  pro: {
    criteria: Record<string, { now: number; delta: number }>;
    peers: { sector: string; count: number; score: number } | null;
  } | null;
}
/** Pedido para gerir uma página, na fila da moderação */
export interface PendingClaim {
  id: string;
  orgId: string;
  orgName: string;
  city: string;
  nif: string | null;
  method: 'email' | 'document';
  emailDomain: string | null;
  domainKnown: boolean;
  name: string;
  role: string;
  members: number;
  createdAt: string;
}
export interface ManagedOrg {
  id: string;
  name: string;
  city: string;
  plan: Plan;
  members: number;
}
export interface Claimant {
  name: string;
  role: string;
}

export const myOrgs = () => api<MyOrgs>('/me/orgs');
export const dashboard = (orgId: string) => api<ApiDashboard>(`/orgs/${encodeURIComponent(orgId)}/dashboard`);
export const sendClaimCode = (orgId: string, email: string) => api(`/orgs/${encodeURIComponent(orgId)}/claim/email`, { body: { email, lang: getLang() } });
export const confirmClaim = (orgId: string, code: string, who: Claimant) => api<{ claim: Claim }>(`/orgs/${encodeURIComponent(orgId)}/claim/email/confirm`, { body: { code, ...who } });
export function claimByDocument(orgId: string, file: File, who: Claimant) {
  const form = new FormData();
  form.set('name', who.name);
  form.set('role', who.role);
  form.set('file', file);
  return api<{ claim: Claim }>(`/orgs/${encodeURIComponent(orgId)}/claim/document`, { form });
}
export const saveReply = (reviewId: string, text: string) => api(`/reviews/${encodeURIComponent(reviewId)}/reply`, { method: 'PUT', body: { text } });
export const periodicReport = (orgId: string, periodo: 'semana' | 'mes') =>
  api<import('../features/painel/report').ApiReport>(`/orgs/${encodeURIComponent(orgId)}/report?periodo=${periodo}`);
