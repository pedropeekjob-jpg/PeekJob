import { useState } from 'react';
import { Link } from 'react-router';
import type { ManagedOrg, PendingClaim, Plan } from '../../api/accounts';
import { tr } from '../../i18n';
import { NOTE_MIN, sinceIso } from './moderation';
import { ErrorText, NoteBox } from './ModerationParts';
import { useCardAction } from './useQueues';
import styles from './Moderation.module.css';

const approveTemplates = () => [
  tr('Domínio do email confirmado no site oficial da organização.', 'Email domain confirmed on the organisation’s official website.'),
  tr('Documento com o NIF e cargo confirmados.', 'Document with the tax number and job title confirmed.'),
];
const rejectClaimTemplates = () => [
  tr('Não conseguimos confirmar que representas a organização.', 'We couldn’t confirm that you represent the organisation.'),
  tr('O domínio do email não é da organização.', 'The email domain doesn’t belong to the organisation.'),
];

/** Como provou: o domínio do email (e se é um dos conhecidos) ou o documento com o NIF */
function proofText(c: PendingClaim) {
  if (c.method === 'document') return tr('Documento com o NIF da organização (lido e apagado)', 'Document with the organisation’s tax number (read and deleted)');
  return c.domainKnown
    ? tr(`Email confirmado em @${c.emailDomain} (domínio conhecido)`, `Email confirmed at @${c.emailDomain} (known domain)`)
    : tr(`Email confirmado em @${c.emailDomain} — confirma o domínio`, `Email confirmed at @${c.emailDomain} — check the domain`);
}

/** Pedido para gerir uma página: quem, como provou, e aprovar ou recusar com justificação */
export function ClaimCard({ item, onDecide }: { item: PendingClaim; onDecide: (a: 'approve' | 'reject', note: string) => Promise<string | null> }) {
  const [note, setNote] = useState('');
  const { busy, error, run } = useCardAction();
  const ok = note.trim().length >= NOTE_MIN;
  const go = (a: 'approve' | 'reject') => ok && run(() => onDecide(a, note.trim()));
  return (
    <article className={`card ${styles.card}`} aria-label={tr(`Pedido para gerir ${item.orgName}`, `Request to manage ${item.orgName}`)}>
      <div className={`row wrap between ${styles.cardHead}`}>
        <Link to={`/org/${item.orgId}`} className={styles.org}>
          {item.orgName}
        </Link>
        <span className="small muted">{sinceIso(item.createdAt)}</span>
      </div>
      <p className="body">
        <strong>{item.name}</strong> · {item.role}
      </p>
      <p className="small body">{proofText(item)}</p>
      <span className="small muted">
        {item.city}
        {item.nif ? ` · NIF ${item.nif}` : ''} · {item.members ? tr(`${item.members} já gere(m) a página`, `${item.members} already manage the page`) : tr('ninguém gere a página', 'nobody manages the page yet')}
      </span>
      <NoteBox
        value={note}
        onChange={setNote}
        groups={[
          { title: tr('Para aprovar', 'To approve'), items: approveTemplates() },
          { title: tr('Para recusar', 'To decline'), items: rejectClaimTemplates() },
        ]}
        label={tr('Justificação (a pessoa vê-a no painel)', 'Reason (the person sees it in the dashboard)')}
      />
      {error && <ErrorText text={error} />}
      <div className={`row wrap ${styles.actions}`}>
        <button type="button" className="btn btn-primary" disabled={!ok || busy} onClick={() => go('approve')}>
          {tr('Aprovar', 'Approve')}
        </button>
        <button type="button" className={`btn ${styles.remove}`} disabled={!ok || busy} onClick={() => go('reject')}>
          {tr('Recusar', 'Decline')}
        </button>
        {!ok && <span className="small muted">{tr('Escreve ou escolhe uma justificação.', 'Write or pick a reason.')}</span>}
      </div>
    </article>
  );
}

/** Páginas geridas: ligar ou desligar o Pro (até haver pagamentos). Nunca mexe no ranking. */
export function ManagedList({ items, onPlan }: { items: ManagedOrg[]; onPlan: (id: string, plan: Plan) => Promise<string | null> }) {
  const { busy, error, run } = useCardAction();
  if (!items.length) return null;
  return (
    <section aria-labelledby="geridas" className={styles.list}>
      <h2 id="geridas" className="h3">
        {tr('Páginas geridas', 'Managed pages')}
      </h2>
      <p className="small muted">{tr('O Pro dá tendências e comparação com o setor. Nunca muda a posição no ranking.', 'Pro adds trends and sector comparison. It never changes the ranking.')}</p>
      {error && <ErrorText text={error} />}
      <ul className={styles.managed}>
        {items.map((m) => (
          <li key={m.id} className={`row wrap between ${styles.cardHead}`}>
            <span>
              <strong>{m.name}</strong> <span className="small muted">· {m.city}</span>
            </span>
            <button
              type="button"
              className="chip"
              aria-pressed={m.plan === 'pro'}
              aria-label={tr(`Plano Pro para ${m.name}`, `Pro plan for ${m.name}`)}
              disabled={busy}
              onClick={() => run(() => onPlan(m.id, m.plan === 'pro' ? 'free' : 'pro'))}
            >
              Pro
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
}
