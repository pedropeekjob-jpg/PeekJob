import type { ReactNode } from 'react';
import { Link } from 'react-router';
import { apiMode } from '../api/http';
import { Shell } from '../components/Layout';
import { Empty, TopBar } from '../components/UI';
import { AppealCard, LoadingCards, Notice, OrgCard, QueueTabs, ReportCard, Skeleton } from '../features/moderation/ModerationParts';
import styles from '../features/moderation/Moderation.module.css';
import { useQueues } from '../features/moderation/useQueues';
import { tr } from '../i18n';
import { useStore } from '../lib/store';
import { useIsDesktop } from '../lib/useMedia';

/** Backoffice de moderação: denúncias e organizações novas (só para moderadores) */
export default function Moderacao() {
  const desktop = useIsDesktop();
  const { user, remote } = useStore();

  const page = (children: ReactNode) => (
    <Shell nav={!desktop}>
      <div className={`${desktop ? 'container dpage' : 'page'} ${styles.mod}`}>
        {!desktop && <TopBar back="/perfil" title={tr('Moderação', 'Moderation')} />}
        {children}
      </div>
    </Shell>
  );

  // Espera pela sessão antes de decidir (evita mostrar "sem acesso" por engano)
  if (apiMode && !remote.ready) return page(<Skeleton />);
  if (apiMode && user?.role !== 'moderator') {
    return page(
      <Empty
        title={user ? tr('Esta área é só para moderadores.', 'This area is for moderators only.') : tr('Entra para continuar.', 'Sign in to continue.')}
        action={
          user ? undefined : (
            <Link to="/entrar" className={`btn btn-dark ${styles.signIn}`}>
              {tr('Entrar', 'Sign in')}
            </Link>
          )
        }
      />,
    );
  }
  return page(<Queues desktop={desktop} />);
}

/** As filas só carregam para moderadores */
function Queues({ desktop }: { desktop: boolean }) {
  const q = useQueues();
  return (
    <>
      <header className={styles.header}>
        {desktop && <h1 className={`h1 ${styles.title}`}>{tr('Moderação', 'Moderation')}</h1>}
        <p className={`lead ${styles.lead}`}>
          {tr(
            'Decide com as regras públicas. Cada decisão leva uma justificação, que chega a quem escreveu e a quem denunciou.',
            'Decide by the public rules. Every decision needs a reason, which is sent to the author and to whoever reported it.',
          )}
        </p>
        {!apiMode && <span className="small muted">{tr('Demonstração: dados de exemplo; as decisões não são guardadas.', 'Demo: sample data; decisions are not saved.')}</span>}
      </header>

      <QueueTabs tab={q.tab} reports={q.reports.length} orgs={q.orgs.length} appeals={q.appeals.length} onChange={q.setTab} />
      {q.notice && <Notice text={q.notice} />}
      {q.error && (
        <div role="alert" className={styles.error}>
          {q.error}
        </div>
      )}
      <QueueBody q={q} />
    </>
  );
}

function QueueBody({ q }: { q: ReturnType<typeof useQueues> }) {
  if (q.loading) return <LoadingCards />;
  if (q.tab === 'reports') {
    if (!q.reports.length) return <Empty title={tr('Sem denúncias por analisar.', 'No reports to review.')} body={tr('Quando alguém denunciar uma avaliação, aparece aqui.', 'When someone reports a review, it shows up here.')} />;
    return (
      <div className={styles.list}>
        {q.reports.map((r) => (
          <ReportCard key={r.contentId} item={r} onDecide={(action, note) => q.decide(r, action, note)} />
        ))}
      </div>
    );
  }
  if (q.tab === 'appeals') {
    if (!q.appeals.length) {
      return (
        <Empty
          title={tr('Sem pedidos de revisão.', 'No appeals.')}
          body={tr('Quem é afetado por uma decisão pode pedir que seja revista durante 6 meses; os pedidos aparecem aqui.', 'Anyone affected by a decision can ask for it to be reviewed within 6 months; appeals show up here.')}
        />
      );
    }
    return (
      <div className={styles.list}>
        {q.appeals.map((a) => (
          <AppealCard key={a.id} item={a} onDecide={(action, note) => q.decideAppeal(a.id, action, note)} />
        ))}
      </div>
    );
  }
  if (!q.orgs.length) {
    return (
      <Empty
        title={tr('Sem organizações novas por rever.', 'No new organisations to review.')}
        body={tr('As organizações criadas por quem avalia aparecem aqui até serem aprovadas.', 'Organisations added by reviewers show up here until they are approved.')}
      />
    );
  }
  return (
    <div className={styles.list}>
      {q.orgs.map((o) => (
        <OrgCard key={o.id} org={o} onApprove={() => q.approve(o)} onReject={(note) => q.reject(o, note)} onMerge={(id, name) => q.merge(o, id, name)} />
      ))}
    </div>
  );
}
