import { INTERVIEW_STEPS, type InterviewStep } from '@peekjob/shared';
import { memo } from 'react';
import { tr } from '../../i18n';
import styles from './Share.module.css';

const STEP_LABELS: Record<InterviewStep, [string, string]> = {
  Conversa: ['Conversa', 'Chat'],
  Entrevista: ['Entrevista', 'Interview'],
  'Prova prática': ['Prova prática', 'Practical test'],
  'Teste escrito': ['Teste escrito', 'Written test'],
  'Dia de experiência': ['Dia de experiência', 'Trial day'],
  'Dinâmica de grupo': ['Dinâmica de grupo', 'Group exercise'],
};
export const stepLabel = (s: InterviewStep) => tr(...STEP_LABELS[s]);

/** Duas opções (tocar de novo tira a escolha); o grupo tem o nome da pergunta */
export const Choice = memo(function Choice({
  label,
  value,
  onChange,
  yes = tr('Sim', 'Yes'),
  no = tr('Não', 'No'),
}: {
  label: string;
  value: boolean | null;
  onChange: (v: boolean | null) => void;
  yes?: string;
  no?: string;
}) {
  return (
    <fieldset className={styles.question}>
      <legend className={styles.legend}>{label}</legend>
      <div className={`row ${styles.choices}`}>
        {[
          { l: yes, v: true },
          { l: no, v: false },
        ].map((o) => {
          const on = value === o.v;
          return (
            <button key={o.l} type="button" aria-pressed={on} onClick={() => onChange(on ? null : o.v)} className={styles.choice}>
              {o.l}
            </button>
          );
        })}
      </div>
    </fieldset>
  );
});

/** Passos do processo (vários) */
export const StepPicker = memo(function StepPicker({ steps, onToggle }: { steps: InterviewStep[]; onToggle: (s: InterviewStep) => void }) {
  const label = tr('Que passos houve?', 'What were the steps?');
  return (
    <fieldset className={styles.question}>
      <legend className={styles.legend}>{label}</legend>
      <div className="chips">
        {INTERVIEW_STEPS.map((s) => (
          <button key={s} type="button" className={`chip ${styles.chip}`} aria-pressed={steps.includes(s)} onClick={() => onToggle(s)}>
            {stepLabel(s)}
          </button>
        ))}
      </div>
    </fieldset>
  );
});

/** Dificuldade de 1 a 5 (opcional; tocar de novo tira) */
export const DifficultyPicker = memo(function DifficultyPicker({ value, onChange }: { value: number | null; onChange: (v: number | null) => void }) {
  const label = tr('Dificuldade (opcional)', 'Difficulty (optional)');
  return (
    <fieldset className={styles.question}>
      <legend className={styles.legend}>{label}</legend>
      <div className={`row ${styles.choices}`}>
        {[1, 2, 3, 4, 5].map((n) => (
          <button
            key={n}
            type="button"
            aria-pressed={value === n}
            aria-label={tr(`Dificuldade ${n} de 5`, `Difficulty ${n} of 5`)}
            onClick={() => onChange(value === n ? null : n)}
            className={`mono ${styles.number}`}
          >
            {n}
          </button>
        ))}
      </div>
      <span className="small muted">{tr('1 muito fácil · 5 muito difícil', '1 very easy · 5 very hard')}</span>
    </fieldset>
  );
});
