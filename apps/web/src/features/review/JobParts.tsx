import { jobYears, JOB_ROLE_MAX } from '@peekjob/shared';
import { useMemo, type FormEvent } from 'react';
import { useSuggest } from '../../components/Suggest';
import { tr } from '../../i18n';
import type { JobDraft } from '../../lib/store';
import { useSuggestions } from '../search/suggest';
import flow from './Flow.module.css';
import styles from './Job.module.css';

interface JobFormProps {
  job: JobDraft;
  /** cargos já conhecidos nesta organização (salários e entrevistas), para escolher com um toque */
  known: string[];
  error: string | null;
  onChange: (patch: Partial<JobDraft>) => void;
  onSubmit: () => void;
}

/**
 * O teu trabalho lá (25/10, cliente): cargo e período antes de avaliar.
 * O cargo sugere os que já existem; o período é "ainda trabalho cá" (desde) ou "já saí" (de… a…), só em anos.
 */
export function JobForm({ job, known, error, onChange, onSubmit }: JobFormProps) {
  const submit = (e: FormEvent) => {
    e.preventDefault();
    onSubmit();
  };
  const years = useMemo(() => jobYears(), []);
  const quick = known.filter((r) => r !== job.role).slice(0, 6);
  return (
    <form className={`stack ${styles.form}`} onSubmit={submit} noValidate>
      <RoleField value={job.role} invalid={!!error && job.role.trim().length < 2} onChange={(role) => onChange({ role })} />
      {quick.length > 0 && (
        <div role="group" aria-label={tr('Cargos nesta organização', 'Roles at this organisation')} className={`row wrap ${styles.quick}`}>
          {quick.map((r) => (
            <button key={r} type="button" className={`chip ${styles.quickChip}`} onClick={() => onChange({ role: r })}>
              {r}
            </button>
          ))}
        </div>
      )}

      <div className="field">
        <span id="job-now" className="field-label">
          {tr('Ainda trabalhas lá?', 'Do you still work there?')}
        </span>
        <div role="group" aria-labelledby="job-now" className={`row ${styles.now}`}>
          <button type="button" aria-pressed={job.current === true} className={flow.yesNo} onClick={() => onChange({ current: true, to: null })}>
            {tr('Sim, trabalho lá', 'Yes, I do')}
          </button>
          <button type="button" aria-pressed={job.current === false} className={flow.yesNo} onClick={() => onChange({ current: false })}>
            {tr('Já saí', 'I’ve left')}
          </button>
        </div>
      </div>

      {job.current !== null && (
        <div className={`fade-up ${styles.years}`}>
          <YearSelect id="job-from" label={job.current ? tr('Desde', 'Since') : tr('Entrei em', 'Started in')} value={job.from} years={years} onChange={(from) => onChange({ from })} />
          {!job.current && (
            <YearSelect id="job-to" label={tr('Saí em', 'Left in')} value={job.to} years={job.from ? years.filter((y) => y >= job.from!) : years} onChange={(to) => onChange({ to })} />
          )}
        </div>
      )}

      <p className={`small muted row ${styles.privacy}`}>
        {tr(
          'Na avaliação só aparece o cargo e há quanto tempo (ex.: 1 a 3 anos), nunca os anos.',
          'Your review only shows the role and roughly how long (e.g. 1 to 3 years), never the years.',
        )}
      </p>
      {error && (
        <div role="alert" className={styles.error}>
          {error}
        </div>
      )}
      <button type="submit" hidden />
    </form>
  );
}

/** Cargo ou função, com as profissões que já existem na PeekJob como sugestões */
function RoleField({ value, invalid, onChange }: { value: string; invalid: boolean; onChange: (v: string) => void }) {
  const items = useSuggestions(value, ['role']);
  const shown = items.length === 1 && items[0].label === value ? [] : items;
  const suggest = useSuggest({ id: 'job-role', query: value, items: shown, onPick: (s) => onChange(s.label) });
  return (
    <div className={`field ${styles.roleField}`}>
      <label htmlFor="job-role">
        {tr('Cargo ou função', 'Job or role')}
      </label>
      <input
        className="input"
        id="job-role"
        type="text"
        autoComplete="off"
        maxLength={JOB_ROLE_MAX}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={tr('Ex.: Empregado de mesa', 'E.g. Waiter')}
        required
        aria-invalid={invalid}
        {...suggest.inputProps}
      />
      {suggest.list}
    </div>
  );
}

function YearSelect({ id, label, value, years, onChange }: { id: string; label: string; value: number | null; years: number[]; onChange: (v: number | null) => void }) {
  return (
    <div className="field">
      <label htmlFor={id}>
        {label}
      </label>
      <select id={id} className={`input ${styles.select}`} value={value ?? ''} onChange={(e) => onChange(e.target.value ? Number(e.target.value) : null)}>
        <option value="">{tr('Ano', 'Year')}</option>
        {years.map((y) => (
          <option key={y} value={y}>
            {y}
          </option>
        ))}
      </select>
    </div>
  );
}
