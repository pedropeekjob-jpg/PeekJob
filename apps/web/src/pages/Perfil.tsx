import { useState, type ReactNode } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Shell } from '../components/Layout';
import { Icon } from '../components/Icon';
import { Ring } from '../components/Data';
import { useOrgs } from '../api/orgs';
import { CRITERION } from '../data/criteria';
import { useStore } from '../lib/store';
import { fmt } from '../lib/format';
import { useIsDesktop } from '../lib/useMedia';
import { AnalyticsSwitch } from '../components/ConsentBanner';
import { LangSwitch, tr } from '../i18n';
import { whenLabel } from '../i18n/labels';

const DISPLAY = { fontFamily: 'var(--font-display)', fontWeight: 600, margin: 0 } as const;

export default function Perfil() {
  const desktop = useIsDesktop();
  const nav = useNavigate();
  const { user, prefs, messages, myReviews, draft, logout, resetDemo } = useStore();
  const orgs = useOrgs();
  const [mineOpen, setMineOpen] = useState(false);
  const [resetDone, setResetDone] = useState(false);

  const unread = messages.filter((m) => !m.read).length;
  const orgName = (id: string) => orgs.find((o) => o.id === id)?.name ?? tr('Organização', 'Organisation');
  const prefsSummary = prefs.length
    ? `${CRITERION[prefs[0]].label}${prefs.length > 1 ? tr(` e mais ${prefs.length - 1}`, ` and ${prefs.length - 1} more`) : ''}`
    : tr('Escolher', 'Choose');
  const verifValue = draft.verified && draft.orgId ? orgName(draft.orgId) : tr('Email ou recibo', 'Email or payslip');
  const lastMsgWhen = messages[0]?.when ? whenLabel(messages[0].when) : undefined;

  const doLogout = () => {
    logout();
    nav('/entrar');
  };
  const doReset = () => {
    resetDemo();
    setResetDone(true);
  };

  const settings: { label: string; value?: string; to: string }[] = [
    { label: tr('Verificação', 'Verification'), value: verifValue, to: '/avaliar/verificar' },
    { label: tr('Como calculamos', 'How we score'), to: '/metodologia' },
    { label: tr('Privacidade e dados', 'Privacy and data'), value: desktop ? tr('Exportar ou apagar', 'Export or delete') : undefined, to: '/metodologia#privacidade' },
    { label: tr('Gerir a minha organização', 'Manage my organisation'), to: '/painel' },
  ];

  const resetBtn = (
    <div className="stack" style={{ gap: 4 }}>
      <button type="button" className="link" style={{ color: 'var(--body)', fontWeight: 500, fontSize: 15 }} onClick={doReset}>
        <Icon name="sparkle" size={16} />
        {tr('Repor dados de demonstração', 'Reset demo data')}
      </button>
      {resetDone && (
        <span role="status" className="small" style={{ color: 'var(--teal-dark)' }}>
          {tr('Dados repostos: sessão, rascunho de exemplo e guardadas.', 'Data reset: session, sample draft and saved.')}
        </span>
      )}
    </div>
  );

  /* ---------- Sem sessão: convite ---------- */
  if (!user) {
    const invite = (
      <div className="stack" style={{ gap: 20, maxWidth: 520 }}>
        <div className="stack" style={{ gap: 8 }}>
          <h1 style={{ ...DISPLAY, fontSize: desktop ? 56 : 36, lineHeight: 1 }}>{tr('A tua conta', 'Your account')}</h1>
          <p className="lead">{tr('Entra para guardar organizações, ver as tuas avaliações e receber mensagens privadas de apoio.', 'Sign in to save organisations, see your reviews and get private support messages.')}</p>
        </div>
        <div className="card dark stack" style={{ position: 'relative', overflow: 'hidden', gap: 8, padding: '24px 110px 24px 24px', borderRadius: 26 }}>
          <span aria-hidden="true" style={{ position: 'absolute', top: -50, right: -40, width: 150, height: 150, borderRadius: '50%', border: '14px solid var(--teal)' }} />
          <span style={{ ...DISPLAY, fontSize: 22, lineHeight: 1.15, position: 'relative' }}>{tr('Sem palavra-passe nem nome', 'No password, no name')}</span>
          <span style={{ fontSize: 15, color: '#C9CDD0', position: 'relative' }}>{tr('Só o teu email, que nunca aparece nas avaliações.', 'Just your email, which never appears in reviews.')}</span>
        </div>
        <Link to="/entrar" className="btn btn-primary" style={{ height: 56, alignSelf: desktop ? 'flex-start' : 'stretch' }}>
          {tr('Entrar com email', 'Sign in with email')}
        </Link>
        <Link to="/" className="link" style={{ alignSelf: 'flex-start' }}>
          {tr('Continuar a explorar sem conta', 'Keep exploring without an account')}
        </Link>
        {resetBtn}
      </div>
    );
    return (
      <Shell nav>
        <div className={desktop ? 'container dpage' : 'page'} style={{ paddingTop: desktop ? 48 : 28 }}>
          {invite}
        </div>
      </Shell>
    );
  }

  /* ---------- Desktop ---------- */
  if (desktop) {
    return (
      <Shell nav>
        <style>{`.pf-row{transition:background .15s}.pf-row:hover{background:var(--surface)}`}</style>
        <div className="container" style={{ paddingBottom: 80 }}>
          <h1 style={{ ...DISPLAY, paddingTop: 48, fontSize: 56, lineHeight: 1, letterSpacing: '-0.01em' }}>{tr('A tua conta', 'Your account')}</h1>
          <div className="row wrap between" style={{ gap: 64, alignItems: 'flex-start', paddingTop: 40 }}>
            <div className="stack" style={{ flex: '1 1 360px', minWidth: 0, maxWidth: 440, gap: 40 }}>
              <div className="stack" style={{ position: 'relative', overflow: 'hidden', background: 'var(--ink)', color: '#fff', borderRadius: 26, padding: '28px 120px 28px 28px', gap: 8 }}>
                <div aria-hidden="true" className="float" style={{ position: 'absolute', top: -50, right: -40, width: 150, height: 150, borderRadius: '50%', border: '14px solid var(--teal)', opacity: 0.9 }} />
                <div style={{ position: 'relative', ...DISPLAY, fontSize: 24, lineHeight: 1.15, paddingTop: 8 }}>{tr('Para os outros és anónimo/a', 'To others you’re anonymous')}</div>
                <div style={{ position: 'relative', fontSize: 15, lineHeight: 1.5, color: '#C9CDD0' }}>{tr('Nem a PeekJob liga o teu email às avaliações.', 'Not even PeekJob links your email to your reviews.')}</div>
              </div>

              <Link to="/apoio" className="plain row lift" style={{ gap: 16, background: 'var(--purple-tint)', borderRadius: 22, padding: '18px 20px' }}>
                <span style={{ flex: 'none', width: 48, height: 48, borderRadius: 24, border: '4px solid var(--purple)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--purple)' }}>
                  <Icon name="mail" size={18} stroke={2} />
                </span>
                <span className="stack grow" style={{ gap: 2 }}>
                  <span style={{ fontSize: 16, fontWeight: 600 }}>{tr('Mensagens', 'Messages')}</span>
                  <span className="small" style={{ color: 'var(--purple-text)' }}>
                    {tr('Onde pedir ajuda', 'Where to get help')}{lastMsgWhen ? ` · ${lastMsgWhen}` : ''}
                  </span>
                </span>
                {unread > 0 && <UnreadBadge n={unread} size={28} />}
              </Link>

              <section aria-label={tr('O que valorizo', 'What I value')} className="stack" style={{ gap: 14 }}>
                <div className="row between">
                  <h2 style={{ ...DISPLAY, fontSize: 20 }}>{tr('O que valorizo', 'What I value')}</h2>
                  <Link to="/preferencias" className="link" style={{ fontSize: 15 }}>
                    {tr('Mudar', 'Change')}
                  </Link>
                </div>
                <div className="chips">
                  {prefs.map((k, i) => (
                    <span key={k} className="row" style={{ gap: 8, fontSize: 15, padding: '6px 14px 6px 6px', borderRadius: 999, background: 'var(--surface)', border: '1px solid var(--line)' }}>
                      <span style={{ width: 26, height: 26, borderRadius: 13, border: `3px solid ${CRITERION[k].color}`, display: 'flex', alignItems: 'center', justifyContent: 'center', ...DISPLAY, fontSize: 13 }}>{i + 1}</span>
                      {CRITERION[k].label}
                    </span>
                  ))}
                </div>
              </section>

              {resetBtn}
            </div>

            <div className="stack" style={{ flex: '1.3 1 480px', minWidth: 0, maxWidth: 640, gap: 48 }}>
              <section aria-label={tr('As minhas avaliações', 'My reviews')}>
                <h2 style={{ ...DISPLAY, fontSize: 20, marginBottom: 8 }}>{tr('As minhas avaliações', 'My reviews')}</h2>
                {myReviews.length === 0 && <p className="body">{tr('Ainda não avaliaste nenhuma organização.', 'You haven’t reviewed any organisation yet.')}</p>}
                {myReviews.map((r) => (
                  <Link key={r.id} to={`/org/${r.orgId}`} className="plain row pf-row" style={{ gap: 16, padding: '14px 10px', margin: '0 -10px', borderRadius: 14, borderBottom: '1px solid var(--line)' }}>
                    <Ring value={r.avg} size={48} thickness={5} inner="var(--ground)" fontSize={15} ariaLabel={tr(`A tua nota ${fmt(r.avg)} de 5`, `Your score ${fmt(r.avg)} out of 5`)} />
                    <span className="stack grow" style={{ gap: 2 }}>
                      <span style={{ fontSize: 16, fontWeight: 600 }}>{orgName(r.orgId)}</span>
                      <span className="small muted">{whenLabel(r.when)}</span>
                    </span>
                    <span className="small" style={{ color: 'var(--up)', fontWeight: 500 }}>
                      {tr('Publicada', 'Published')}
                    </span>
                  </Link>
                ))}
              </section>

              <section aria-label={tr('Definições', 'Settings')}>
                <h2 style={{ ...DISPLAY, fontSize: 20, marginBottom: 8 }}>{tr('Definições', 'Settings')}</h2>
                {settings.map((s) => (
                  <Link key={s.label} to={s.to} className="plain row between pf-row" style={{ gap: 12, minHeight: 56, padding: '0 10px', margin: '0 -10px', borderRadius: 14, borderBottom: '1px solid var(--line)' }}>
                    <span style={{ fontSize: 16 }}>{s.label}</span>
                    <span className="row small muted" style={{ gap: 8 }}>
                      {s.value}
                      <Icon name="next" size={16} style={{ color: 'var(--grey)' }} />
                    </span>
                  </Link>
                ))}
                <div className="row between" style={{ gap: 12, minHeight: 56, borderBottom: '1px solid var(--line)' }}>
                  <span style={{ fontSize: 16 }}>{tr('Idioma', 'Language')}</span>
                  <LangSwitch />
                </div>
                <AnalyticsSwitch />
                <button type="button" onClick={doLogout} className="row between pf-row" style={{ width: 'calc(100% + 20px)', minHeight: 56, padding: '0 10px', margin: '0 -10px', border: 0, borderRadius: 14, background: 'transparent', fontSize: 16, fontWeight: 500, color: 'var(--down)', textAlign: 'left' }}>
                  {tr('Terminar sessão', 'Sign out')}
                  <span className="small muted" style={{ fontWeight: 400 }}>
                    {user.email}
                  </span>
                </button>
              </section>
            </div>
          </div>
        </div>
      </Shell>
    );
  }

  /* ---------- Mobile ---------- */
  const rowStyle = { gap: 12, minHeight: 52, borderTop: '1px solid var(--line)' } as const;
  return (
    <Shell nav>
      <div className="page" style={{ paddingTop: 28 }}>
        <div className="stack" style={{ gap: 8 }}>
          <h1 style={{ ...DISPLAY, fontSize: 36, lineHeight: 1 }}>{tr('A tua conta', 'Your account')}</h1>
          <div className="row small muted" style={{ gap: 6 }}>
            <Icon name="lock" size={14} />
            {tr('Para os outros és anónimo/a.', 'To others you’re anonymous.')}
          </div>
        </div>

        <section aria-label={tr('A tua atividade', 'Your activity')} className="stack">
          <MRow to="/apoio" label={tr('Mensagens', 'Messages')} style={rowStyle}>
            {unread > 0 ? <UnreadBadge n={unread} size={24} /> : <span className="small muted">{tr('Sem novas', 'None new')}</span>}
          </MRow>
          <MRow to="/preferencias" label={tr('O que valorizo', 'What I value')} style={rowStyle}>
            <span className="small muted ellipsis" style={{ maxWidth: 190 }}>
              {prefsSummary}
            </span>
          </MRow>
          <button
            type="button"
            onClick={() => setMineOpen(!mineOpen)}
            aria-expanded={mineOpen}
            className="row"
            style={{ ...rowStyle, padding: 0, border: 0, borderTop: '1px solid var(--line)', background: 'transparent', textAlign: 'left', width: '100%' }}
          >
            <span className="grow" style={{ fontSize: 15 }}>
              {tr('As minhas avaliações', 'My reviews')}
            </span>
            <span className="small muted">{myReviews.length}</span>
            <Icon name="next" size={16} style={{ color: 'var(--grey)', transform: mineOpen ? 'rotate(90deg)' : undefined, transition: 'transform .2s' }} />
          </button>
          {mineOpen && (
            <div className="stack fade-up" style={{ padding: '0 0 8px 16px' }}>
              {myReviews.length === 0 && <span className="small muted" style={{ padding: '12px 0' }}>{tr('Ainda não avaliaste nenhuma organização.', 'You haven’t reviewed any organisation yet.')}</span>}
              {myReviews.map((r) => (
                <Link key={r.id} to={`/org/${r.orgId}`} className="plain row" style={{ gap: 12, minHeight: 48 }}>
                  <span className="grow" style={{ fontSize: 15 }}>
                    {orgName(r.orgId)}
                  </span>
                  <span className="small muted">{tr('Publicada', 'Published')} · {whenLabel(r.when)}</span>
                </Link>
              ))}
            </div>
          )}
          <MRow to="/avaliar/verificar" label={tr('Verificação', 'Verification')} style={{ ...rowStyle, borderBottom: '1px solid var(--line)' }}>
            <span className="small muted">{verifValue}</span>
          </MRow>
        </section>

        <section aria-label={tr('Mais', 'More')} className="stack">
          {settings.slice(1).map((s) => (
            <MRow key={s.label} to={s.to} label={s.label} style={rowStyle} />
          ))}
          <div className="row between" style={rowStyle}>
            <span style={{ fontSize: 15 }}>{tr('Idioma', 'Language')}</span>
            <LangSwitch />
          </div>
          <AnalyticsSwitch />
          <button
            type="button"
            onClick={doLogout}
            className="row between"
            style={{ ...rowStyle, width: '100%', padding: 0, border: 0, borderTop: '1px solid var(--line)', borderBottom: '1px solid var(--line)', background: 'transparent', fontSize: 15, fontWeight: 500, color: 'var(--down)', textAlign: 'left' }}
          >
            {tr('Terminar sessão', 'Sign out')}
            <span className="small muted" style={{ fontWeight: 400 }}>
              {user.email}
            </span>
          </button>
          <div style={{ paddingTop: 8 }}>{resetBtn}</div>
        </section>
      </div>
    </Shell>
  );
}

function UnreadBadge({ n, size }: { n: number; size: number }) {
  return (
    <span
      aria-label={`${n} ${n === 1 ? tr('mensagem nova', 'new message') : tr('mensagens novas', 'new messages')}`}
      style={{ minWidth: size, height: size, padding: '0 6px', borderRadius: size / 2, background: 'var(--purple)', color: '#fff', fontSize: 13, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
    >
      {n}
    </span>
  );
}

function MRow({ to, label, children, style }: { to: string; label: string; children?: ReactNode; style: React.CSSProperties }) {
  return (
    <Link to={to} className="plain row" style={style}>
      <span className="grow" style={{ fontSize: 15 }}>
        {label}
      </span>
      {children}
      <Icon name="next" size={16} style={{ color: 'var(--grey)', flex: 'none' }} />
    </Link>
  );
}
