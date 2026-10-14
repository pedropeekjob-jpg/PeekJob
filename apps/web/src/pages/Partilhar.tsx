import type { FormEvent, MouseEvent } from 'react';
import { Link, useLocation, useParams, useSearchParams } from 'react-router';
import { apiMode } from '../api/http';
import { useOrg, useOrgStatus } from '../api/orgs';
import { Shell } from '../components/Layout';
import type { Org } from '../data/orgs';
import { FlowHead, LockLine } from '../features/review/FlowParts';
import { useFlowNav } from '../features/review/useFlowNav';
import { orgTabPath, type ShareKind } from '../features/share/share';
import { Choice, DifficultyPicker, StepPicker } from '../features/share/ShareParts';
import styles from '../features/share/Share.module.css';
import { useShareForm, type ShareForm } from '../features/share/useShareForm';
import { tr } from '../i18n';
import { useStore } from '../lib/store';
import { useIsDesktop } from '../lib/useMedia';

/** Partilhar uma entrevista ou o salário (a partir dos separadores da organização): um só ecrã */
export default function Partilhar() {
  const { kind: k } = useParams();
  const [params] = useSearchParams();
  const orgId = params.get('org');
  const org = useOrg(orgId);
  const status = useOrgStatus(orgId);
  const kind: ShareKind | null = k === 'entrevista' || k === 'salario' ? k : null;
  if (status === 'loading') return null;
  if (!org || !kind) return <NotFound />;
  return <ShareScreen org={org} kind={kind} />;
}

function NotFound() {
  return (
    <Shell chrome="header">
      <div className={`page ${styles.page}`}>
        <h1 className={styles.title}>{tr('Não encontrámos esta organização.', 'We couldn’t find this organisation.')}</h1>
        <Link to="/pesquisa" className="link">
          {tr('Procurar organizações', 'Search organisations')}
        </Link>
      </div>
    </Shell>
  );
}

function ShareScreen({ org, kind }: { org: Org; kind: ShareKind }) {
  const desktop = useIsDesktop();
  const { user } = useStore();
  const { leave, leaveTo } = useFlowNav();
  const form = useShareForm(kind, org.id);
  const back = orgTabPath(org.id, kind);
  const close = () => leave(back);
  const interview = kind === 'entrevista';
  const title = interview ? tr(`A tua entrevista na ${org.name}`, `Your interview at ${org.name}`) : tr(`O teu salário na ${org.name}`, `Your salary at ${org.name}`);

  let body;
  if (form.done) body = <Done back={back} onSee={leaveTo} />;
  else if (apiMode && !user) body = <SignIn />;
  else body = <ShareFormView kind={kind} form={form} roles={roleSuggestions(org)} />;

  return (
    <Shell chrome="header">
      <div className={desktop ? `container ${styles.desktop}` : `page ${styles.page}`}>
        <FlowHead icon="close" label={tr('Fechar', 'Close')} onClick={close} />
        {!form.done && (
          <>
            <h1 className={styles.title}>{title}</h1>
            <p className={`small muted ${styles.lead}`}>
              {interview
                ? tr('Ajuda quem se vai candidatar. Ninguém fica a saber que foste tu.', 'Help people who are applying. No one will know it was you.')
                : tr('Só mostramos uma função com pelo menos 3 salários, e nunca o valor de ninguém.', 'We only show a role with at least 3 salaries, and never anyone’s exact pay.')}
            </p>
          </>
        )}
        {body}
      </div>
    </Shell>
  );
}

/** Funções já usadas nesta organização (para escrever igual e juntar na mesma função) */
const roleSuggestions = (org: Org) => [...new Set([...org.salaries.map((s) => s.role), ...org.interviews.map((i) => i.role)])];

function ShareFormView({ kind, form, roles }: { kind: ShareKind; form: ShareForm; roles: string[] }) {
  const { fields: f, set } = form;
  const submit = (e: FormEvent) => {
    e.preventDefault();
    void form.submit();
  };
  return (
    <form className={styles.form} onSubmit={submit} noValidate>
      <div className="field">
        <label htmlFor="share-role">{tr('Função', 'Role')}</label>
        <input id="share-role" className="input" list="share-roles" autoComplete="off" maxLength={60} value={f.role} onChange={(e) => set({ role: e.target.value })} placeholder={tr('Ex.: Balcão', 'E.g. Counter')} />
        <datalist id="share-roles">
          {roles.map((r) => (
            <option key={r} value={r} />
          ))}
        </datalist>
      </div>
      {kind === 'salario' ? <SalaryFields form={form} /> : <InterviewFields form={form} />}
      <div className={styles.cta}>
        {form.error && (
          <div role="alert" className="card warn">
            <span>{form.error.message}</span>{' '}
            {form.error.suggestion && (
              <button type="button" className="link" onClick={() => form.useSuggestion(form.error!.suggestion!)}>
                {tr('Usar a versão sugerida', 'Use the suggested version')}
              </button>
            )}
          </div>
        )}
        <button type="submit" className="btn btn-dark btn-block" disabled={!form.canSubmit}>
          {kind === 'salario' ? tr('Partilhar salário', 'Share salary') : tr('Partilhar entrevista', 'Share interview')}
        </button>
        <LockLine center>{tr('Partilha anónima', 'Anonymous')}</LockLine>
      </div>
    </form>
  );
}

function SalaryFields({ form }: { form: ShareForm }) {
  const { fields: f, set } = form;
  return (
    <>
      <div className="field">
        <label htmlFor="share-salary">{tr('Salário bruto por mês', 'Gross monthly salary')}</label>
        <input
          id="share-salary"
          className={`input ${styles.money}`}
          inputMode="decimal"
          autoComplete="off"
          value={f.salary}
          onChange={(e) => set({ salary: e.target.value })}
          placeholder="€"
          aria-invalid={form.salaryInvalid}
          aria-describedby="share-salary-hint"
        />
        <p id="share-salary-hint" className={`small ${form.salaryInvalid ? styles.error : 'muted'} ${styles.hint}`}>
          {form.salaryInvalid
            ? tr('Escreve o salário bruto mensal em euros (ex.: 950).', 'Enter the gross monthly salary in euros (e.g. 950).')
            : tr('Antes de impostos e descontos, sem subsídios.', 'Before tax and deductions, without allowances.')}
        </p>
      </div>
      <Choice label={tr('O salário chega a horas?', 'Is the salary paid on time?')} value={f.paidOnTime} onChange={(v) => set({ paidOnTime: v })} />
    </>
  );
}

function InterviewFields({ form }: { form: ShareForm }) {
  const { fields: f, set } = form;
  return (
    <>
      <Choice label={tr('Como correu?', 'How did it go?')} value={f.positive} onChange={(v) => set({ positive: v })} yes={tr('Correu bem', 'It went well')} no={tr('Correu mal', 'It went badly')} />
      <StepPicker steps={f.steps} onToggle={form.toggleStep} />
      <Choice label={tr('Fizeram-te uma oferta?', 'Did they make you an offer?')} value={f.offer} onChange={(v) => set({ offer: v })} />
      {f.offer === false && <Choice label={tr('Deram resposta?', 'Did they get back to you?')} value={f.answered} onChange={(v) => set({ answered: v })} />}
      <DifficultyPicker value={f.difficulty} onChange={(v) => set({ difficulty: v })} />
      <div className="field">
        <label htmlFor="share-text">{tr('Como foi o processo? (opcional)', 'What was the process like? (optional)')}</label>
        <textarea id="share-text" className="textarea" rows={3} value={f.text} onChange={(e) => form.setText(e.target.value)} aria-invalid={form.insult} aria-describedby="share-text-hint" />
        <p id="share-text-hint" className={`small ${form.insult ? styles.error : 'muted'} ${styles.hint}`}>
          {form.insult ? tr('Sem nomes nem insultos: descreve o que aconteceu.', 'No names or insults: describe what happened.') : tr('Descreve o que acontece, não quem é. Sem nomes.', 'Describe what happens, not who. No names.')}
        </p>
      </div>
    </>
  );
}

function Done({ back, onSee }: { back: string; onSee: (to: string) => void }) {
  const see = (e: MouseEvent<HTMLAnchorElement>) => {
    if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button !== 0) return;
    e.preventDefault();
    onSee(back);
  };
  return (
    <div role="status" className={styles.done}>
      <h1 className={styles.title}>{tr('Partilhado. Obrigado.', 'Shared. Thank you.')}</h1>
      <p className="body">{tr('Ninguém sabe que foste tu.', 'No one knows it was you.')}</p>
      <div className={styles.doneActions}>
        <Link to={back} onClick={see} className="btn btn-dark">
          {tr('Ver na página da organização', 'See it on the organisation’s page')}
        </Link>
      </div>
    </div>
  );
}

function SignIn() {
  const { pathname, search } = useLocation();
  return (
    <div className="card stack">
      <p className="body">{tr('Entra para partilhar. Só guardamos um código, nunca o teu email junto do que partilhas.', 'Sign in to share. We only keep a code, never your email next to what you share.')}</p>
      <Link to={`/entrar?${new URLSearchParams({ next: pathname + search })}`} state={{ backToFlow: true }} className="btn btn-dark">
        {tr('Entrar', 'Sign in')}
      </Link>
    </div>
  );
}
