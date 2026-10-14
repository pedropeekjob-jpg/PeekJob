import { useEffect, useState, type FormEvent } from 'react';
import { Link } from 'react-router';
import type { Claim } from '../../api/accounts';
import { useOrg, useSearch } from '../../api/orgs';
import { tr } from '../../i18n';
import { useClaim, type ClaimForm } from './useClaim';
import styles from './Painel.module.css';

const STATUS: Record<Claim['status'], () => string> = {
  pending: () => tr('Em análise pela moderação', 'Being reviewed by moderation'),
  approved: () => tr('Aprovado', 'Approved'),
  rejected: () => tr('Recusado', 'Declined'),
};

/** Os pedidos já feitos e o estado de cada um */
function ClaimList({ claims }: { claims: Claim[] }) {
  if (!claims.length) return null;
  return (
    <section aria-labelledby="pedidos">
      <h2 id="pedidos" className="h3">
        {tr('Os teus pedidos', 'Your requests')}
      </h2>
      <ul className={styles.claims}>
        {claims.map((c) => (
          <li key={c.id} className={styles.claimItem}>
            <strong>{c.orgName}</strong>
            <span className={`small ${styles.claimStatus}`} data-status={c.status}>
              {STATUS[c.status]()}
              {c.note ? ` — ${c.note}` : ''}
            </span>
          </li>
        ))}
      </ul>
    </section>
  );
}

/** Procurar e escolher a organização (ou a que veio no endereço) */
function OrgChoice({ form, suggested }: { form: ClaimForm; suggested: string | null }) {
  const [q, setQ] = useState('');
  const { items } = useSearch(q);
  const pre = useOrg(suggested);
  const { org, pick } = form;
  useEffect(() => {
    if (pre && !org) pick(pre);
  }, [pre, org, pick]);
  return (
    <div className="field">
      <label htmlFor="claim-q">{tr('Organização', 'Organisation')}</label>
      <input id="claim-q" type="search" className="input" value={q} onChange={(e) => setQ(e.target.value)} placeholder={org ? org.name : tr('Procura pelo nome', 'Search by name')} />
      <ul className={styles.results}>
        {(q.trim() ? items.slice(0, 5) : org ? [org] : []).map((o) => (
          <li key={o.id}>
            <button type="button" className={styles.result} aria-pressed={org?.id === o.id} onClick={() => pick(o)}>
              <strong>{o.name}</strong> <span className="small muted">· {o.city}</span>
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}

function ClaimFields({ form }: { form: ClaimForm }) {
  return (
    <>
      <div className="field">
        <label htmlFor="claim-name">{tr('O teu nome', 'Your name')}</label>
        <input id="claim-name" className="input" autoComplete="name" value={form.name} onChange={(e) => form.setName(e.target.value)} />
      </div>
      <div className="field">
        <label htmlFor="claim-role">{tr('Cargo', 'Job title')}</label>
        <input id="claim-role" className="input" autoComplete="organization-title" value={form.role} onChange={(e) => form.setRole(e.target.value)} placeholder={tr('Ex.: Gerente', 'E.g. Manager')} />
      </div>
      <fieldset className={styles.form}>
        <legend className="field-label">{tr('Como provas que representas a organização?', 'How do you show you represent the organisation?')}</legend>
        <div className={`row wrap ${styles.methods}`}>
          <button type="button" className={styles.method} aria-pressed={form.method === 'email'} onClick={() => form.setMethod('email')}>
            {tr('Email da organização', 'Organisation email')}
          </button>
          <button type="button" className={styles.method} aria-pressed={form.method === 'document'} onClick={() => form.setMethod('document')}>
            {tr('Documento com o NIF', 'Document with the tax number')}
          </button>
        </div>
        {form.method === 'email' ? (
          <div className="field">
            <label htmlFor="claim-email">{tr('Email de trabalho', 'Work email')}</label>
            <input id="claim-email" type="email" className="input" autoComplete="email" value={form.email} onChange={(e) => form.setEmail(e.target.value)} aria-describedby="claim-email-hint" />
            <span id="claim-email-hint" className="small muted">
              {tr('Com o domínio da organização (não serve Gmail, Sapo…). Não guardamos o email.', 'With the organisation’s domain (not Gmail, Outlook…). We don’t store the email.')}
            </span>
          </div>
        ) : (
          <div className="field">
            <label htmlFor="claim-file">{tr('Certidão, declaração ou ata (PDF ou fotografia)', 'Certificate, declaration or minutes (PDF or photo)')}</label>
            <input id="claim-file" type="file" accept="application/pdf,image/jpeg,image/png,image/webp" onChange={(e) => form.setFile(e.target.files?.[0] ?? null)} aria-describedby="claim-file-hint" />
            <span id="claim-file-hint" className="small muted">
              {tr('Lemos o NIF e apagamos o ficheiro: nunca é guardado.', 'We read the tax number and delete the file: it is never stored.')}
            </span>
          </div>
        )}
      </fieldset>
    </>
  );
}

function submitLabel(form: ClaimForm) {
  if (form.step === 'code') return tr('Confirmar e enviar pedido', 'Confirm and send request');
  return form.method === 'email' ? tr('Receber código', 'Get code') : tr('Enviar pedido', 'Send request');
}

/** Pedir para gerir a página da organização (a moderação confirma) */
export function ClaimView({ claims, suggested, onSent }: { claims: Claim[]; suggested: string | null; onSent: () => void }) {
  const form = useClaim(onSent);
  const submit = (e: FormEvent) => {
    e.preventDefault();
    void (form.step === 'code' ? form.confirm() : form.send());
  };
  return (
    <div className={styles.gate}>
      <h1 className={`h1 ${styles.gateTitle}`}>{tr('Gerir a página da tua organização', 'Manage your organisation’s page')}</h1>
      <p className="lead">
        {tr('Respondes em público às avaliações e vês o pulso da semana. Nunca sabes quem avaliou.', 'Reply publicly to reviews and see the weekly pulse. You never find out who reviewed.')}{' '}
        <Link to="/para-organizacoes" className="link">
          {tr('Como funciona', 'How it works')}
        </Link>
      </p>
      <ClaimList claims={claims} />
      {form.step === 'sent' ? (
        <div role="status" className="card">
          <strong>{tr('Pedido enviado.', 'Request sent.')}</strong> {tr('A moderação confirma em poucos dias; vês aqui a resposta.', 'Moderation confirms within a few days; you’ll see the answer here.')}
        </div>
      ) : (
        <form className={styles.form} onSubmit={submit} noValidate>
          {form.step === 'form' ? (
            <>
              <OrgChoice form={form} suggested={suggested} />
              <ClaimFields form={form} />
            </>
          ) : (
            <div className="field">
              <label htmlFor="claim-code">{tr('Código que recebeste por email', 'Code you received by email')}</label>
              <input id="claim-code" className="input mono" inputMode="numeric" autoComplete="one-time-code" value={form.code} onChange={(e) => form.setCode(e.target.value)} />
            </div>
          )}
          {form.error && (
            <div role="alert" className="card warn">
              {form.error}
            </div>
          )}
          <button type="submit" className="btn btn-dark" disabled={form.step === 'code' ? !form.canConfirm : !form.canSend}>
            {submitLabel(form)}
          </button>
        </form>
      )}
    </div>
  );
}
