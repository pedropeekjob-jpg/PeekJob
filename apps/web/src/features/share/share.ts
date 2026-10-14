import { roleKey } from '@peekjob/shared';
import type { Interview, Org } from '../../data/orgs';
import { tr } from '../../i18n';
import type { Failure } from '../../lib/store';

/** Partilhar uma entrevista ou um salário (funções puras: testadas sem React) */

export type ShareKind = 'entrevista' | 'salario';

export interface LocalSalary {
  role: string;
  monthlyGross: number;
  paidOnTime: boolean | null;
}
/** Demonstração: o que a pessoa partilhou fica no browser (um de cada por organização, como na API) */
export interface SharedLocal {
  interviews: Record<string, Interview>;
  salaries: Record<string, LocalSalary>;
}
export const emptyShared = (): SharedLocal => ({ interviews: {}, salaries: {} });

export const orgTabPath = (orgId: string, kind: ShareKind) => `/org/${encodeURIComponent(orgId)}/${kind === 'entrevista' ? 'entrevistas' : 'salarios'}`;

/** "1.050 €", "1 050,50" → 1051 (euros inteiros); null se não for um número */
export function parseEuros(text: string): number | null {
  const clean = text.replace(/[€\s]/g, '');
  if (!/^\d[\d.,]*$/.test(clean)) return null;
  // vírgula ou ponto decimal com 1–2 casas no fim; os outros pontos e vírgulas são de milhares
  const dec = /[.,](\d{1,2})$/.exec(clean);
  const whole = (dec ? clean.slice(0, dec.index) : clean).replace(/[.,]/g, '');
  return Math.round(Number(dec ? `${whole}.${dec[1]}` : whole));
}

export interface ShareError {
  message: string;
  suggestion?: string;
  signIn?: boolean;
}

export function shareErrorMessage(f: Failure, kind: ShareKind): ShareError {
  if (f.status === 422) {
    const message = tr('Tira nomes de pessoas e insultos. Descreve a situação.', 'Remove people’s names and insults. Describe the situation.');
    return typeof f.body?.suggestion === 'string' && f.body.suggestion ? { message, suggestion: f.body.suggestion } : { message };
  }
  if (f.status === 409) {
    return kind === 'entrevista'
      ? { message: tr('Já partilhaste uma entrevista nesta organização.', 'You’ve already shared an interview at this organisation.') }
      : { message: tr('Já partilhaste o teu salário nesta organização.', 'You’ve already shared your salary at this organisation.') };
  }
  if (f.status === 401) return { message: tr('Entra para partilhar.', 'Sign in to share.'), signIn: true };
  return { message: f.message };
}

/** Demonstração: junta à organização o que a pessoa partilhou (a entrevista primeiro; o salário conta na função) */
export function withShared(org: Org, shared: SharedLocal): Org {
  const interview = shared.interviews[org.id];
  const salary = shared.salaries[org.id];
  if (!interview && !salary) return org;
  let salaries = org.salaries;
  if (salary) {
    const k = roleKey(salary.role);
    salaries = org.salaries.some((s) => roleKey(s.role) === k)
      ? org.salaries.map((s) => (roleKey(s.role) === k ? { ...s, count: s.count + 1 } : s))
      : [...org.salaries, { role: salary.role.trim(), count: 1, min: 0, max: 0, median: 0 }];
  }
  return { ...org, interviews: interview ? [interview, ...org.interviews] : org.interviews, salaries };
}
