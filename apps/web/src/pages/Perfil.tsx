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

const DISPLAY = { fontFamily: 'var(--font-display)', fontWeight: 600, margin: 0 } as const;

export default function Perfil() {
  const desktop = useIsDesktop();
  const nav = useNavigate();
  const { user, prefs, messages, myReviews, draft, logout, resetDemo } = useStore();
  const orgs = useOrgs();
  const [mineOpen, setMineOpen] = useState(false);
  const [resetDone, setResetDone] = useState(false);

  const unread = messages.filter((m) => !m.read).length;
  const orgName = (id: string) => orgs.find((o) => o.id === id)?.name ?? 'Organização';
  const prefsSummary = prefs.length ? `${CRITERION[prefs[0]].label}${prefs.length > 1 ? ` e mais ${prefs.length - 1}` : ''}` : 'Escolher';
  const verifValue = draft.verified && draft.orgId ? orgName(draft.orgId) : 'Email ou recibo';
  const lastMsgWhen = messages[0]?.when;

  const doLogout = () => {
    logout();
    nav('/entrar');
  };
  const doReset = () => {
    resetDemo();
    setResetDone(true);
  };

  const settings: { label: string; value?: string; to: string }[] = [
    { label: 'Verificação', value: verifValue, to: '/avaliar/verificar' },
    { label: 'Como calculamos', to: '/metodologia' },
    { label: 'Privacidade e dados', value: desktop ? 'Exportar ou apagar' : undefined, to: '/metodologia#privacidade' },
    { label: 'Gerir a minha organização', to: '/painel' },
  ];

  const resetBtn = (
    <div className="stack" style={{ gap: 4 }}>
      <button type="button" className="link" style={{ color: 'var(--body)', fontWeight: 500, fontSize: 15 }} onClick={doReset}>
        <Icon name="sparkle" size={16} />
        Repor dados de demonstração
      </button>
      {resetDone && (
        <span role="status" className="small" style={{ color: 'var(--teal-dark)' }}>
          Dados repostos: sessão, rascunho de exemplo e guardadas.
        </span>
      )}
    </div>
  );

  /* ---------- Sem sessão: convite ---------- */
  if (!user) {
    const invite = (
      <div className="stack" style={{ gap: 20, maxWidth: 520 }}>
        <div className="stack" style={{ gap: 8 }}>
          <h1 style={{ ...DISPLAY, fontSize: desktop ? 56 : 36, lineHeight: 1 }}>A tua conta</h1>
          <p className="lead">Entra para guardar organizações, ver as tuas avaliações e receber mensagens privadas de apoio.</p>
        </div>
        <div className="card dark stack" style={{ position: 'relative', overflow: 'hidden', gap: 8, padding: '24px 110px 24px 24px', borderRadius: 26 }}>
          <span aria-hidden="true" style={{ position: 'absolute', top: -50, right: -40, width: 150, height: 150, borderRadius: '50%', border: '14px solid var(--teal)' }} />
          <span style={{ ...DISPLAY, fontSize: 22, lineHeight: 1.15, position: 'relative' }}>Sem palavra-passe nem nome</span>
          <span style={{ fontSize: 15, color: '#C9CDD0', position: 'relative' }}>Só o teu email, que nunca aparece nas avaliações.</span>
        </div>
        <Link to="/entrar" className="btn btn-primary" style={{ height: 56, alignSelf: desktop ? 'flex-start' : 'stretch' }}>
          Entrar com email
        </Link>
        <Link to="/" className="link" style={{ alignSelf: 'flex-start' }}>
          Continuar a explorar sem conta
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
          <h1 style={{ ...DISPLAY, paddingTop: 48, fontSize: 56, lineHeight: 1, letterSpacing: '-0.01em' }}>A tua conta</h1>
          <div className="row wrap between" style={{ gap: 64, alignItems: 'flex-start', paddingTop: 40 }}>
            <div className="stack" style={{ flex: '1 1 360px', minWidth: 0, maxWidth: 440, gap: 40 }}>
              <div className="stack" style={{ position: 'relative', overflow: 'hidden', background: 'var(--ink)', color: '#fff', borderRadius: 26, padding: '28px 120px 28px 28px', gap: 8 }}>
                <div aria-hidden="true" className="float" style={{ position: 'absolute', top: -50, right: -40, width: 150, height: 150, borderRadius: '50%', border: '14px solid var(--teal)', opacity: 0.9 }} />
                <div style={{ position: 'relative', ...DISPLAY, fontSize: 24, lineHeight: 1.15, paddingTop: 8 }}>Para os outros és anónimo/a</div>
                <div style={{ position: 'relative', fontSize: 15, lineHeight: 1.5, color: '#C9CDD0' }}>Nem a PeekJob liga o teu email às avaliações.</div>
              </div>

              <Link to="/apoio" className="plain row lift" style={{ gap: 16, background: 'var(--purple-tint)', borderRadius: 22, padding: '18px 20px' }}>
                <span style={{ flex: 'none', width: 48, height: 48, borderRadius: 24, border: '4px solid var(--purple)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--purple)' }}>
                  <Icon name="mail" size={18} stroke={2} />
                </span>
                <span className="stack grow" style={{ gap: 2 }}>
                  <span style={{ fontSize: 16, fontWeight: 600 }}>Mensagens</span>
                  <span className="small" style={{ color: 'var(--purple-text)' }}>
                    Onde pedir ajuda{lastMsgWhen ? ` · ${lastMsgWhen}` : ''}
                  </span>
                </span>
                {unread > 0 && <UnreadBadge n={unread} size={28} />}
              </Link>

              <section aria-label="O que valorizo" className="stack" style={{ gap: 14 }}>
                <div className="row between">
                  <h2 style={{ ...DISPLAY, fontSize: 20 }}>O que valorizo</h2>
                  <Link to="/preferencias" className="link" style={{ fontSize: 15 }}>
                    Mudar
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
              <section aria-label="As minhas avaliações">
                <h2 style={{ ...DISPLAY, fontSize: 20, marginBottom: 8 }}>As minhas avaliações</h2>
                {myReviews.length === 0 && <p className="body">Ainda não avaliaste nenhuma organização.</p>}
                {myReviews.map((r) => (
                  <Link key={r.id} to={`/org/${r.orgId}`} className="plain row pf-row" style={{ gap: 16, padding: '14px 10px', margin: '0 -10px', borderRadius: 14, borderBottom: '1px solid var(--line)' }}>
                    <Ring value={r.avg} size={48} thickness={5} inner="var(--ground)" fontSize={15} ariaLabel={`A tua nota ${fmt(r.avg)} de 5`} />
                    <span className="stack grow" style={{ gap: 2 }}>
                      <span style={{ fontSize: 16, fontWeight: 600 }}>{orgName(r.orgId)}</span>
                      <span className="small muted">{r.when}</span>
                    </span>
                    <span className="small" style={{ color: 'var(--up)', fontWeight: 500 }}>
                      Publicada
                    </span>
                  </Link>
                ))}
              </section>

              <section aria-label="Definições">
                <h2 style={{ ...DISPLAY, fontSize: 20, marginBottom: 8 }}>Definições</h2>
                {settings.map((s) => (
                  <Link key={s.label} to={s.to} className="plain row between pf-row" style={{ gap: 12, minHeight: 56, padding: '0 10px', margin: '0 -10px', borderRadius: 14, borderBottom: '1px solid var(--line)' }}>
                    <span style={{ fontSize: 16 }}>{s.label}</span>
                    <span className="row small muted" style={{ gap: 8 }}>
                      {s.value}
                      <Icon name="next" size={16} style={{ color: 'var(--grey)' }} />
                    </span>
                  </Link>
                ))}
                <AnalyticsSwitch />
                <button type="button" onClick={doLogout} className="row between pf-row" style={{ width: 'calc(100% + 20px)', minHeight: 56, padding: '0 10px', margin: '0 -10px', border: 0, borderRadius: 14, background: 'transparent', fontSize: 16, fontWeight: 500, color: 'var(--down)', textAlign: 'left' }}>
                  Terminar sessão
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
          <h1 style={{ ...DISPLAY, fontSize: 36, lineHeight: 1 }}>A tua conta</h1>
          <div className="row small muted" style={{ gap: 6 }}>
            <Icon name="lock" size={14} />
            Para os outros és anónimo/a.
          </div>
        </div>

        <section aria-label="A tua atividade" className="stack">
          <MRow to="/apoio" label="Mensagens" style={rowStyle}>
            {unread > 0 ? <UnreadBadge n={unread} size={24} /> : <span className="small muted">Sem novas</span>}
          </MRow>
          <MRow to="/preferencias" label="O que valorizo" style={rowStyle}>
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
              As minhas avaliações
            </span>
            <span className="small muted">{myReviews.length}</span>
            <Icon name="next" size={16} style={{ color: 'var(--grey)', transform: mineOpen ? 'rotate(90deg)' : undefined, transition: 'transform .2s' }} />
          </button>
          {mineOpen && (
            <div className="stack fade-up" style={{ padding: '0 0 8px 16px' }}>
              {myReviews.length === 0 && <span className="small muted" style={{ padding: '12px 0' }}>Ainda não avaliaste nenhuma organização.</span>}
              {myReviews.map((r) => (
                <Link key={r.id} to={`/org/${r.orgId}`} className="plain row" style={{ gap: 12, minHeight: 48 }}>
                  <span className="grow" style={{ fontSize: 15 }}>
                    {orgName(r.orgId)}
                  </span>
                  <span className="small muted">Publicada · {r.when}</span>
                </Link>
              ))}
            </div>
          )}
          <MRow to="/avaliar/verificar" label="Verificação" style={{ ...rowStyle, borderBottom: '1px solid var(--line)' }}>
            <span className="small muted">{verifValue}</span>
          </MRow>
        </section>

        <section aria-label="Mais" className="stack">
          {settings.slice(1).map((s) => (
            <MRow key={s.label} to={s.to} label={s.label} style={rowStyle} />
          ))}
          <AnalyticsSwitch />
          <button
            type="button"
            onClick={doLogout}
            className="row between"
            style={{ ...rowStyle, width: '100%', padding: 0, border: 0, borderTop: '1px solid var(--line)', borderBottom: '1px solid var(--line)', background: 'transparent', fontSize: 15, fontWeight: 500, color: 'var(--down)', textAlign: 'left' }}
          >
            Terminar sessão
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
      aria-label={`${n} ${n === 1 ? 'mensagem nova' : 'mensagens novas'}`}
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
