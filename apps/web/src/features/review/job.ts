import { JOB_ROLE_MAX, type PublicJob, type ReviewJob, type TenureBand } from '@peekjob/shared';
import { tr } from '../../i18n';
import type { JobDraft } from '../../lib/store';

/** Regras do passo "o teu trabalho lá" (25/10): cargo e período, antes de avaliar (funções puras) */

/** O que falta preencher, pela ordem dos campos; null se estiver tudo certo */
export function jobError(j: JobDraft): string | null {
  if (j.role.trim().length < 2) return tr('Escreve o teu cargo ou função.', 'Enter your job or role.');
  if (j.current === null) return tr('Diz se ainda trabalhas lá.', 'Tell us whether you still work there.');
  if (j.from === null) return tr('Escolhe o ano em que entraste.', 'Choose the year you started.');
  if (!j.current && j.to === null) return tr('Escolhe o ano em que saíste.', 'Choose the year you left.');
  if (!j.current && j.to !== null && j.to < j.from) return tr('O ano de saída é antes do de entrada.', 'The year you left is before the year you started.');
  return null;
}

/** O cargo e o período como a API os recebe; null enquanto não estiverem completos */
export function jobInput(j: JobDraft): ReviewJob | null {
  if (jobError(j) || j.current === null || j.from === null) return null;
  return { role: j.role.trim().slice(0, JOB_ROLE_MAX), current: j.current, from: j.from, to: j.current ? null : j.to };
}

const TENURE = (t: TenureBand) =>
  ({ lt1: tr('menos de 1 ano', 'under 1 year'), '1to3': tr('1 a 3 anos', '1 to 3 years'), gt3: tr('mais de 3 anos', 'over 3 years') })[t];

/** "trabalha lá · 1 a 3 anos" / "já saiu · mais de 3 anos" (o que aparece em público, sem os anos) */
export const tenureText = (j: PublicJob) => `${j.current ? tr('trabalha lá', 'works there') : tr('já saiu', 'has left')} · ${TENURE(j.tenure)}`;

/** O período por extenso para a própria pessoa: "desde 2022" / "2019 a 2021" */
export function periodText(j: Pick<JobDraft, 'current' | 'from' | 'to'>) {
  if (j.from === null) return '';
  if (j.current) return tr(`desde ${j.from}`, `since ${j.from}`);
  return j.to === null || j.to === j.from ? String(j.from) : tr(`${j.from} a ${j.to}`, `${j.from} to ${j.to}`);
}
