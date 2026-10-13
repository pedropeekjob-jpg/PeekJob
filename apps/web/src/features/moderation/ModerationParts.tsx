import { useState } from 'react';
import { Link } from 'react-router-dom';
import type { PendingOrg, ReportedReview } from '../../api/moderation';
import { Icon } from '../../components/Icon';
import { tr } from '../../i18n';
import { orgTypeLabel, tagLabel } from '../../i18n/labels';
import { keepTemplates, NOTE_MIN, orgDetails, reasonLabel, rejectTemplates, REJECT_NOTE_MIN, removeTemplates, reportsText, reviewersText, sinceIso, type Decision } from './moderation';
import { useCardAction, type Queue } from './useQueues';
import styles from './Moderation.module.css';

export function QueueTabs({ tab, reports, orgs, onChange }: { tab: Queue; reports: number; orgs: number; onChange: (q: Queue) => void }) {
  return (
    <div role="tablist" aria-label={tr('Filas', 'Queues')} className={styles.tabs}>
      <button type="button" role="tab" aria-selected={tab === 'reports'} onClick={() => onChange('reports')}>
        {tr('Denúncias', 'Reports')} <span className={styles.count}>{reports}</span>
      </button>
      <button type="button" role="tab" aria-selected={tab === 'orgs'} onClick={() => onChange('orgs')}>
        {tr('Organizações novas', 'New organisations')} <span className={styles.count}>{orgs}</span>
      </button>
    </div>
  );
}

export function Notice({ text }: { text: string }) {
  return (
    <div role="status" className={styles.done}>
      <Icon name="check" size={18} stroke={2.2} /> {text}
    </div>
  );
}

export function ErrorText({ text }: { text: string }) {
  return (
    <span role="alert" className={styles.error}>
      {text}
    </span>
  );
}

export function LoadingCards() {
  return (
    <div className={styles.loading} role="status" aria-label={tr('A carregar', 'Loading')}>
      <span className={`sk ${styles.sk}`} />
      <span className={`sk ${styles.sk}`} />
    </div>
  );
}

export function Skeleton() {
  return <span className={`sk ${styles.sk}`} />;
}

/** Justificação: modelos frequentes (em grupos) ou texto livre */
function NoteBox({ value, onChange, groups, label }: { value: string; onChange: (v: string) => void; groups: { title?: string; items: string[] }[]; label: string }) {
  return (
    <div className={styles.note}>
      <span className={`small ${styles.noteLabel}`}>{label}</span>
      {groups.map((g) => (
        <div key={g.title ?? g.items[0]} className={styles.noteGroup}>
          {g.title && <span className="small muted">{g.title}</span>}
          <div className="chips">
            {g.items.map((t) => (
              <button key={t} type="button" className="chip" aria-pressed={value === t} onClick={() => onChange(t)}>
                {t}
              </button>
            ))}
          </div>
        </div>
      ))}
      <textarea className="textarea" rows={2} maxLength={1000} value={value} onChange={(e) => onChange(e.target.value)} placeholder={tr('Ou escreve a justificação…', 'Or write the reason…')} />
    </div>
  );
}

/** Denúncias sobre uma avaliação: texto, motivos e decisão com justificação */
export function ReportCard({ item, onDecide }: { item: ReportedReview; onDecide: (a: Decision, note: string) => Promise<string | null> }) {
  const [note, setNote] = useState('');
  const { busy, error, run } = useCardAction();
  const ok = note.trim().length >= NOTE_MIN;
  const go = (a: Decision) => ok && run(() => onDecide(a, note.trim()));
  return (
    <article className={`card ${styles.card}`} aria-label={tr(`Denúncias sobre uma avaliação de ${item.orgName}`, `Reports about a review of ${item.orgName}`)}>
      <div className={`row wrap between ${styles.cardHead}`}>
        <Link to={`/org/${item.orgId}`} className={styles.org}>
          {item.orgName}
        </Link>
        <span className="small muted">
          <span className={styles.badge}>{reportsText(item.count)}</span> · {tr('primeira', 'first')} {sinceIso(item.firstReportedAt)}
        </span>
      </div>
      <blockquote className={styles.quote}>“{item.text || tr('(sem texto)', '(no text)')}”</blockquote>
      {item.tags.length > 0 && (
        <div className="chips">
          {item.tags.map((t) => (
            <span key={t} className="pill">
              {tagLabel(t)}
            </span>
          ))}
        </div>
      )}
      <ul className={styles.reports}>
        {item.reports.map((r) => (
          <li key={r.id}>
            <strong>{reasonLabel(r.reason)}</strong>
            {r.details && <span> — {r.details}</span>}
            <span className="small muted"> · {sinceIso(r.createdAt)}</span>
          </li>
        ))}
      </ul>
      <NoteBox
        value={note}
        onChange={setNote}
        groups={[
          { title: tr('Para remover', 'To remove'), items: removeTemplates() },
          { title: tr('Para manter', 'To keep'), items: keepTemplates() },
        ]}
        label={tr('Justificação (obrigatória)', 'Reason (required)')}
      />
      {error && <ErrorText text={error} />}
      <div className={`row wrap ${styles.actions}`}>
        <button type="button" className={`btn ${styles.remove}`} disabled={!ok || busy} onClick={() => go('remove')}>
          {tr('Remover avaliação', 'Remove review')}
        </button>
        <button type="button" className="btn btn-ghost" disabled={!ok || busy} onClick={() => go('keep')}>
          {tr('Manter', 'Keep')}
        </button>
        {!ok && <span className="small muted">{tr('Escreve ou escolhe uma justificação.', 'Write or pick a reason.')}</span>}
      </div>
    </article>
  );
}

/** Organização nova: dados, possíveis duplicados, aprovar/fundir/rejeitar */
export function OrgCard({
  org,
  onApprove,
  onReject,
  onMerge,
}: {
  org: PendingOrg;
  onApprove: () => Promise<string | null>;
  onReject: (note: string) => Promise<string | null>;
  onMerge: (targetId: string, targetName: string) => Promise<string | null>;
}) {
  const [rejecting, setRejecting] = useState(false);
  const [note, setNote] = useState('');
  const { busy, error, run } = useCardAction();
  return (
    <article className={`card ${styles.card}`} aria-label={org.name}>
      <div className={`row wrap between ${styles.cardHead}`}>
        <h2 className={`${styles.org} ${styles.orgTitle}`}>{org.name}</h2>
        <span className="small muted">
          {tr('criada', 'added')} {sinceIso(org.createdAt)}
        </span>
      </div>
      <p className={`body ${styles.details}`}>{orgDetails(orgTypeLabel(org.type), org)}</p>
      <span className="small muted">
        {reviewersText(org.reviewers)}
        {' · '}
        {tr('fica pública sozinha com 3 pessoas ou NIF confirmado', 'goes public by itself with 3 people or a confirmed NIF')}
      </span>

      {org.duplicates.length > 0 && (
        <div className={styles.dups}>
          <strong className="small">{tr('Pode ser a mesma que:', 'It may be the same as:')}</strong>
          {org.duplicates.map((d) => (
            <div key={d.id} className={`row wrap between ${styles.cardHead}`}>
              <span>
                {d.name} · {d.city} <span className="pill">{d.status === 'active' ? tr('pública', 'public') : tr('pendente', 'pending')}</span>
              </span>
              <button type="button" className={`btn btn-ghost ${styles.small}`} disabled={busy} onClick={() => run(() => onMerge(d.id, d.name))}>
                {tr('Fundir nesta', 'Merge into this one')}
              </button>
            </div>
          ))}
        </div>
      )}

      {rejecting && <NoteBox value={note} onChange={setNote} groups={[{ items: rejectTemplates() }]} label={tr('Porque rejeitas? (fica registado)', 'Why are you rejecting it? (it is recorded)')} />}
      {error && <ErrorText text={error} />}
      <div className={`row wrap ${styles.actions}`}>
        {rejecting ? (
          <>
            <button type="button" className={`btn ${styles.remove}`} disabled={busy || note.trim().length < REJECT_NOTE_MIN} onClick={() => run(() => onReject(note.trim()))}>
              {tr('Rejeitar', 'Reject')}
            </button>
            <button type="button" className="btn btn-ghost" disabled={busy} onClick={() => setRejecting(false)}>
              {tr('Cancelar', 'Cancel')}
            </button>
          </>
        ) : (
          <>
            <button type="button" className="btn btn-primary" disabled={busy} onClick={() => run(onApprove)}>
              {tr('Aprovar', 'Approve')}
            </button>
            <button type="button" className="btn btn-ghost" disabled={busy} onClick={() => setRejecting(true)}>
              {tr('Rejeitar', 'Reject')}
            </button>
          </>
        )}
      </div>
    </article>
  );
}
