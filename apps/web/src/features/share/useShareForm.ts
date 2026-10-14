import { REVIEW_TEXT_MAX, SALARY_MAX, SALARY_MIN, type CreateInterviewInput, type CreateSalaryInput, type InterviewStep } from '@peekjob/shared';
import { useCallback, useMemo, useState } from 'react';
import { hasInsultOrName } from '../../lib/moderation';
import { useStore } from '../../lib/store';
import { parseEuros, shareErrorMessage, type ShareError, type ShareKind } from './share';

export interface ShareFields {
  role: string;
  positive: boolean | null;
  steps: InterviewStep[];
  answered: boolean | null;
  offer: boolean | null;
  difficulty: number | null;
  text: string;
  salary: string;
  paidOnTime: boolean | null;
}

const EMPTY: ShareFields = { role: '', positive: null, steps: [], answered: null, offer: null, difficulty: null, text: '', salary: '', paidOnTime: null };

const roleOk = (r: string) => r.trim().length >= 2 && r.trim().length <= 60;
/** Salário plausível (as mesmas regras da API, sem levar o zod para o browser) */
export const salaryOk = (v: number | null): v is number => v != null && Number.isInteger(v) && v >= SALARY_MIN && v <= SALARY_MAX;

/** O que se envia (as mesmas regras da API); null enquanto falta algo obrigatório */
export function shareInput(kind: ShareKind, f: ShareFields): CreateInterviewInput | CreateSalaryInput | null {
  if (!roleOk(f.role)) return null;
  const role = f.role.trim();
  if (kind === 'salario') {
    const monthlyGross = parseEuros(f.salary);
    return salaryOk(monthlyGross) ? { role, monthlyGross, paidOnTime: f.paidOnTime } : null;
  }
  if (f.positive == null || f.offer == null || !f.steps.length) return null;
  // quem recebeu oferta teve resposta; sem dizer, conta como respondida
  const answered = f.offer || (f.answered ?? true);
  return { role, positive: f.positive, offer: f.offer, answered, difficulty: f.difficulty, steps: f.steps, text: f.text.trim() };
}

/** Estado e ações do formulário de partilhar uma entrevista ou um salário (o ecrã só desenha) */
export function useShareForm(kind: ShareKind, orgId: string) {
  const { shareInterview, shareSalary } = useStore();
  const [fields, setFields] = useState<ShareFields>(EMPTY);
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<ShareError | null>(null);

  const set = useCallback((patch: Partial<ShareFields>) => setFields((f) => ({ ...f, ...patch })), []);
  const toggleStep = useCallback(
    (s: InterviewStep) => setFields((f) => ({ ...f, steps: f.steps.includes(s) ? f.steps.filter((x) => x !== s) : [...f.steps, s] })),
    [],
  );
  const setText = useCallback((t: string) => set({ text: t.slice(0, REVIEW_TEXT_MAX) }), [set]);
  const useSuggestion = useCallback(
    (t: string) => {
      setText(t);
      setError(null);
    },
    [setText],
  );

  const input = useMemo(() => shareInput(kind, fields), [kind, fields]);
  const insult = useMemo(() => hasInsultOrName(`${fields.role}\n${fields.text}`), [fields.role, fields.text]);
  const salaryInvalid = kind === 'salario' && fields.salary.trim() !== '' && !salaryOk(parseEuros(fields.salary));
  const canSubmit = !!input && !insult && !busy;

  const submit = useCallback(async () => {
    if (!input || insult || busy) return;
    setBusy(true);
    const r = kind === 'salario' ? await shareSalary(orgId, input as CreateSalaryInput) : await shareInterview(orgId, input as CreateInterviewInput);
    setBusy(false);
    if (!r.ok) return setError(shareErrorMessage(r, kind));
    setError(null);
    setDone(true);
  }, [input, insult, busy, kind, orgId, shareInterview, shareSalary]);

  return { fields, set, toggleStep, setText, useSuggestion, insult, salaryInvalid, canSubmit, busy, done, error, submit };
}

export type ShareForm = ReturnType<typeof useShareForm>;
