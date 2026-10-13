import { useState } from 'react';
import { Link } from 'react-router-dom';
import { apiMode } from '../api/http';
import { useModeration, type PendingOrg, type ReportedReview } from '../api/moderation';
import { Icon } from '../components/Icon';
import { Shell } from '../components/Layout';
import { Empty, TopBar } from '../components/UI';
import { REPORT_REASONS } from '../data/content';
import { tr } from '../i18n';
import { orgTypeLabel, tagLabel } from '../i18n/labels';
import { ago, plural } from '../lib/format';
import { useStore } from '../lib/store';
import { useIsDesktop } from '../lib/useMedia';
import '../styles/moderation.css';

const sinceIso = (iso: string) => ago(Math.floor((Date.now() - new Date(iso).getTime()) / 86400000));
const reasonLabel = (id: string) => REPORT_REASONS.find((r) => r.id === id)?.label ?? (id === 'ilegal' ? tr('Possível ilegalidade', 'Possibly illegal') : tr('Outro motivo', 'Other reason'));

/** Justificações frequentes (o texto chega a quem escreveu e a quem denunciou) */
const removeTemplates = () => [
  tr('Identifica uma pessoa pelo nome ou por detalhes.', 'It identifies a person by name or by details.'),
  tr('Usa linguagem ofensiva ou insultos.', 'It uses offensive language or insults.'),
  tr('Contém dados privados (moradas, telefones, saúde).', 'It contains private data (addresses, phone numbers, health).'),
];
const keepTemplates = () => [
  tr('Não viola as regras: é uma crítica ao trabalho, sem ataques pessoais.', 'It doesn’t break the rules: it criticises the work, without personal attacks.'),
  tr('Não há indícios de que seja falsa.', 'There is no sign that it is fake.'),
];

/** Backoffice de moderação: denúncias e organizações novas */
export default function Moderacao() {
  const desktop = useIsDesktop();
  const { user, remote } = useStore();

  const page = (children: React.ReactNode) => (
    <Shell nav={!desktop}>
      <div className={desktop ? 'container dpage mod' : 'page mod'}>
        {!desktop && <TopBar back="/perfil" title={tr('Moderação', 'Moderation')} />}
        {children}
      </div>
    </Shell>
  );

  // Espera pela sessão antes de decidir (evita mostrar "sem acesso" por engano)
  if (apiMode && !remote.ready) return page(<span className="sk" style={{ height: 180, borderRadius: 20 }} />);
  if (apiMode && user?.role !== 'moderator') {
    return page(
      <Empty
        title={user ? tr('Esta área é só para moderadores.', 'This area is for moderators only.') : tr('Entra para continuar.', 'Sign in to continue.')}
        action={!user ? <Link to="/entrar" className="btn btn-dark" style={{ alignSelf: 'flex-start' }}>{tr('Entrar', 'Sign in')}</Link> : undefined}
      />,
    );
  }
  return page(<Queues desktop={desktop} />);
}

/** As filas só carregam para moderadores */
function Queues({ desktop }: { desktop: boolean }) {
  const m = useModeration();
  const [tab, setTab] = useState<'reports' | 'orgs'>('reports');
  const [done, setDone] = useState('');

  const notify = (msg: string) => {
    setDone(msg);
    window.setTimeout(() => setDone(''), 5000);
  };

  return (
    <>
      <header className="stack" style={{ gap: 8 }}>
        {desktop && <h1 className="h1" style={{ fontSize: 44 }}>{tr('Moderação', 'Moderation')}</h1>}
        <p className="lead" style={{ margin: 0 }}>
          {tr(
            'Decide com as regras públicas. Cada decisão leva uma justificação, que chega a quem escreveu e a quem denunciou.',
            'Decide by the public rules. Every decision needs a reason, which is sent to the author and to whoever reported it.',
          )}
        </p>
        {!apiMode && <span className="small muted">{tr('Demonstração: dados de exemplo; as decisões não são guardadas.', 'Demo: sample data; decisions are not saved.')}</span>}
      </header>

      <div role="tablist" aria-label={tr('Filas', 'Queues')} className="mod-tabs">
        <button type="button" role="tab" aria-selected={tab === 'reports'} onClick={() => setTab('reports')}>
          {tr('Denúncias', 'Reports')} <span className="mod-count">{m.reports.length}</span>
        </button>
        <button type="button" role="tab" aria-selected={tab === 'orgs'} onClick={() => setTab('orgs')}>
          {tr('Organizações novas', 'New organisations')} <span className="mod-count">{m.orgs.length}</span>
        </button>
      </div>

      {done && (
        <div role="status" className="mod-done">
          <Icon name="check" size={18} stroke={2.2} /> {done}
        </div>
      )}
      {m.error && <div role="alert" className="mod-error">{m.error}</div>}
      {m.loading ? (
        <div className="stack" style={{ gap: 12 }} role="status" aria-label={tr('A carregar', 'Loading')}>
          <span className="sk" style={{ height: 180, borderRadius: 20 }} />
          <span className="sk" style={{ height: 180, borderRadius: 20 }} />
        </div>
      ) : tab === 'reports' ? (
        m.reports.length ? (
          <div className="mod-list">
            {m.reports.map((r) => (
              <ReportCard key={r.reviewId} item={r} onDecide={async (action, note) => {
                const err = await m.decide(r.reviewId, action, note);
                if (!err) notify(action === 'remove' ? tr('Avaliação removida. Avisámos quem escreveu e quem denunciou.', 'Review removed. We let the author and the reporters know.') : tr('Avaliação mantida. Avisámos quem denunciou.', 'Review kept. We let the reporters know.'));
                return err;
              }} />
            ))}
          </div>
        ) : (
          <Empty title={tr('Sem denúncias por analisar.', 'No reports to review.')} body={tr('Quando alguém denunciar uma avaliação, aparece aqui.', 'When someone reports a review, it shows up here.')} />
        )
      ) : m.orgs.length ? (
        <div className="mod-list">
          {m.orgs.map((o) => (
            <OrgCard
              key={o.id}
              org={o}
              onApprove={async () => {
                const err = await m.approve(o.id);
                if (!err) notify(tr(`${o.name} está agora pública.`, `${o.name} is now public.`));
                return err;
              }}
              onReject={async (note) => {
                const err = await m.reject(o.id, note);
                if (!err) notify(tr(`${o.name} foi rejeitada.`, `${o.name} was rejected.`));
                return err;
              }}
              onMerge={async (targetId, targetName) => {
                const err = await m.merge(o.id, targetId);
                if (!err) notify(tr(`Fundida em ${targetName}. O nome antigo continua a ser encontrado.`, `Merged into ${targetName}. The old name can still be found.`));
                return err;
              }}
            />
          ))}
        </div>
      ) : (
        <Empty title={tr('Sem organizações novas por rever.', 'No new organisations to review.')} body={tr('As organizações criadas por quem avalia aparecem aqui até serem aprovadas.', 'Organisations added by reviewers show up here until they are approved.')} />
      )}
    </>
  );
}

function NoteBox({ value, onChange, groups, label }: { value: string; onChange: (v: string) => void; groups: { title?: string; items: string[] }[]; label: string }) {
  return (
    <div className="stack" style={{ gap: 8 }}>
      <span className="small" style={{ fontWeight: 600 }}>{label}</span>
      {groups.map((g, i) => (
        <div key={i} className="stack" style={{ gap: 6 }}>
          {g.title && <span className="small muted">{g.title}</span>}
          <div className="chips" style={{ flexWrap: 'wrap' }}>
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

function ReportCard({ item, onDecide }: { item: ReportedReview; onDecide: (a: 'remove' | 'keep', note: string) => Promise<string | null> }) {
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const ok = note.trim().length >= 10;
  const go = async (a: 'remove' | 'keep') => {
    if (!ok || busy) return;
    setBusy(true);
    setErr((await onDecide(a, note.trim())) ?? '');
    setBusy(false);
  };
  return (
    <article className="card mod-card" aria-label={tr(`Denúncias sobre uma avaliação de ${item.orgName}`, `Reports about a review of ${item.orgName}`)}>
      <div className="row wrap between" style={{ gap: 8 }}>
        <Link to={`/org/${item.orgId}`} className="mod-org">{item.orgName}</Link>
        <span className="small muted">
          <span className="mod-badge">{plural(item.count, tr('denúncia', 'report'), tr('denúncias', 'reports'))}</span> · {tr('primeira', 'first')} {sinceIso(item.firstReportedAt)}
        </span>
      </div>
      <blockquote className="mod-quote">“{item.text || tr('(sem texto)', '(no text)')}”</blockquote>
      {item.tags.length > 0 && (
        <div className="chips">{item.tags.map((t) => <span key={t} className="pill">{tagLabel(t)}</span>)}</div>
      )}
      <ul className="mod-reports">
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
      {err && <span role="alert" className="mod-error">{err}</span>}
      <div className="row wrap" style={{ gap: 10 }}>
        <button type="button" className="btn mod-remove" disabled={!ok || busy} onClick={() => go('remove')}>
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

function OrgCard({
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
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const act = async (f: () => Promise<string | null>) => {
    if (busy) return;
    setBusy(true);
    setErr((await f()) ?? '');
    setBusy(false);
  };
  return (
    <article className="card mod-card" aria-label={org.name}>
      <div className="row wrap between" style={{ gap: 8 }}>
        <h2 className="mod-org" style={{ margin: 0 }}>{org.name}</h2>
        <span className="small muted">{tr('criada', 'added')} {sinceIso(org.createdAt)}</span>
      </div>
      <p className="body" style={{ margin: 0 }}>
        {orgTypeLabel(org.type)} · {org.city}
        {org.address ? ` · ${org.address}` : ''}
        {org.nif ? ` · NIF ${org.nif}` : ''}
      </p>
      <span className="small muted">
        {org.reviewers
          ? plural(org.reviewers, tr('pessoa já avaliou', 'person has reviewed it'), tr('pessoas já avaliaram', 'people have reviewed it'))
          : tr('Ainda sem avaliações', 'No reviews yet')}
        {' · '}
        {tr('fica pública sozinha com 3 pessoas ou NIF confirmado', 'goes public by itself with 3 people or a confirmed NIF')}
      </span>

      {org.duplicates.length > 0 && (
        <div className="mod-dups">
          <strong className="small">{tr('Pode ser a mesma que:', 'It may be the same as:')}</strong>
          {org.duplicates.map((d) => (
            <div key={d.id} className="row wrap between" style={{ gap: 8 }}>
              <span>
                {d.name} · {d.city}{' '}
                <span className="pill">{d.status === 'active' ? tr('pública', 'public') : tr('pendente', 'pending')}</span>
              </span>
              <button type="button" className="btn btn-ghost mod-small" disabled={busy} onClick={() => act(() => onMerge(d.id, d.name))}>
                {tr('Fundir nesta', 'Merge into this one')}
              </button>
            </div>
          ))}
        </div>
      )}

      {rejecting && (
        <NoteBox
          value={note}
          onChange={setNote}
          groups={[
            {
              items: [
                tr('Não encontrámos esta organização.', 'We couldn’t find this organisation.'),
                tr('Parece criada para difamar.', 'It looks like it was created to defame.'),
                tr('É uma pessoa, não uma organização.', 'It is a person, not an organisation.'),
              ],
            },
          ]}
          label={tr('Porque rejeitas? (fica registado)', 'Why are you rejecting it? (it is recorded)')}
        />
      )}
      {err && <span role="alert" className="mod-error">{err}</span>}
      <div className="row wrap" style={{ gap: 10 }}>
        {!rejecting ? (
          <>
            <button type="button" className="btn btn-primary" disabled={busy} onClick={() => act(onApprove)}>
              {tr('Aprovar', 'Approve')}
            </button>
            <button type="button" className="btn btn-ghost" disabled={busy} onClick={() => setRejecting(true)}>
              {tr('Rejeitar', 'Reject')}
            </button>
          </>
        ) : (
          <>
            <button type="button" className="btn mod-remove" disabled={busy || note.trim().length < 5} onClick={() => act(() => onReject(note.trim()))}>
              {tr('Rejeitar', 'Reject')}
            </button>
            <button type="button" className="btn btn-ghost" disabled={busy} onClick={() => setRejecting(false)}>
              {tr('Cancelar', 'Cancel')}
            </button>
          </>
        )}
      </div>
    </article>
  );
}
