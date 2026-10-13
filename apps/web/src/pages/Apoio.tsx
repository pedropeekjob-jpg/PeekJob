import { useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Shell } from '../components/Layout';
import { Icon } from '../components/Icon';
import { Accordion } from '../components/UI';
import { SUPPORT, supportTips } from '../data/content';
import { useStore, type SupportMessage } from '../lib/store';
import { useIsDesktop } from '../lib/useMedia';
import { tr } from '../i18n';
import { flagLabel } from '../i18n/labels';

const DISPLAY = { fontFamily: 'var(--font-display)', fontWeight: 600, margin: 0 } as const;

export default function Apoio() {
  const desktop = useIsDesktop();
  const nav = useNavigate();
  const { messages, markMessagesRead } = useStore();
  // As mensagens podem chegar do servidor depois de o ecrã abrir: usar sempre as atuais
  const msg = messages.find((m) => (m.type ?? 'support') === 'support');
  const notices = messages.filter((m) => m.type === 'moderation');

  useEffect(() => {
    markMessagesRead();
  }, [markMessagesRead, messages.length]);

  const back = () => {
    const idx = (window.history.state as { idx?: number } | null)?.idx ?? 0;
    if (idx > 0) nav(-1);
    else nav('/perfil');
  };

  const intro = msg
    ? tr(
        `O que descreveste pode configurar ${msg.kinds.map(flagLabel).join(' e ')}. Estas entidades ajudam${desktop ? '-te' : ''}, sem custos.`,
        `What you described may amount to ${msg.kinds.map(flagLabel).join(' and ')}. These organisations can help${desktop ? ' you' : ''}, free of charge.`,
      )
    : tr(
        'Se algo no teu trabalho pode ser ilegal — salários em atraso, assédio, discriminação — estas entidades ajudam, sem custos.',
        'If something at your work may be illegal — late pay, harassment, discrimination — these organisations can help, free of charge.',
      );

  const tips = (
    <Accordion
      items={[
        {
          title: <span style={{ ...DISPLAY, fontSize: desktop ? 22 : 20 }}>{tr('O que pode ajudar', 'What can help')}</span>,
          body: (
            <ul className="stack" style={{ margin: 0, padding: 0, listStyle: 'none', gap: desktop ? 12 : 8 }}>
              {[...supportTips(), ...(desktop ? [tr('Confirma horários e contactos no site de cada entidade.', 'Check opening hours and contact details on each organisation’s website.')] : [])].map((t) => (
                <li key={t} className="row" style={{ gap: 12, alignItems: 'flex-start', fontSize: 15, lineHeight: 1.45, color: 'var(--body)' }}>
                  <span aria-hidden="true" style={{ flex: 'none', marginTop: 6, width: 12, height: 12, borderRadius: 6, border: '3px solid var(--purple)' }} />
                  {t}
                </li>
              ))}
            </ul>
          ),
        },
      ]}
    />
  );

  const privateBadge = (
    <span className="row" style={{ gap: 8, fontSize: 13, fontWeight: 600, padding: desktop ? '8px 14px' : '6px 10px', borderRadius: 999, background: 'var(--purple-text)' }}>
      <Icon name="lock" size={12} stroke={2.2} />
      {tr('Só tu vês esta mensagem', 'Only you can see this message')}
    </span>
  );

  const found = msg?.found.length ? (
    <p style={{ margin: 0, fontSize: 13, color: '#E0CCEE' }}>
      {tr('Na tua avaliação: ', 'In your review: ')}{msg.found.map(flagLabel).join(', ')}.
    </p>
  ) : null;

  const disclaimer = tr(
    'A PeekJob não apresenta queixas por ti nem partilha esta mensagem com a organização — não é uma entidade de denúncia.',
    'PeekJob doesn’t file complaints for you or share this message with the organisation — we’re not a reporting body.',
  );

  /* ---------- Desktop ---------- */
  if (desktop) {
    return (
      <Shell chrome="header">
        <section aria-labelledby="apoio-titulo" style={{ position: 'relative', overflow: 'hidden', background: 'var(--purple)', color: '#fff', marginTop: 8 }}>
          <svg aria-hidden="true" viewBox="0 0 520 520" width="440" height="440" style={{ position: 'absolute', right: -100, top: -140 }}>
            <circle cx="260" cy="260" r="200" fill="none" stroke="#7B45A6" strokeWidth="40" />
            <circle cx="260" cy="260" r="110" fill="none" stroke="#8E5BB5" strokeWidth="22" />
          </svg>
          <div className="container stack" style={{ position: 'relative', paddingTop: 28, paddingBottom: 72, gap: 20 }}>
            <div className="row wrap" style={{ gap: 14 }}>
              <button type="button" onClick={back} className="row" style={{ height: 44, padding: '0 16px 0 12px', borderRadius: 22, border: '1px solid #A47BC4', background: 'transparent', gap: 8, color: '#fff', fontSize: 14, fontWeight: 600 }}>
                <Icon name="back" size={18} />
                {tr('Voltar', 'Back')}
              </button>
              {privateBadge}
            </div>
            <h1 id="apoio-titulo" style={{ ...DISPLAY, maxWidth: 760, fontSize: 56, lineHeight: 1.02, letterSpacing: '-0.01em' }}>
              {tr('Não tens de passar por isto sozinho/a.', 'You don’t have to go through this alone.')}
            </h1>
            <p style={{ margin: 0, maxWidth: 620, fontSize: 16, lineHeight: 1.55, color: '#F0E6F7' }}>{intro}</p>
            {found}
          </div>
        </section>

        <div className="container" style={{ paddingBottom: 64 }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(min(320px, 100%), 1fr))', gap: 20, marginTop: -36, position: 'relative' }}>
            {SUPPORT.map((o) => (
              <article key={o.short} className="card stack" style={{ borderRadius: 28, padding: 28, gap: 14, border: 0, boxShadow: '0 10px 30px -22px rgba(1,11,19,.4)' }}>
                <div className="row" style={{ gap: 14 }}>
                  <span aria-hidden="true" style={{ flex: 'none', width: 52, height: 52, borderRadius: 26, border: `5px solid ${o.color}` }} />
                  <span className="stack" style={{ gap: 3, minWidth: 0 }}>
                    <span style={{ ...DISPLAY, fontSize: 24, lineHeight: 1 }}>{o.name}</span>
                    <span style={{ fontSize: 13, lineHeight: 1.35, color: 'var(--muted)' }}>{o.full}</span>
                  </span>
                </div>
                <div style={{ fontSize: 15, lineHeight: 1.5, color: 'var(--body)', flex: 1 }}>
                  {o.what} {o.note}
                </div>
                <div className="row wrap" style={{ gap: 8 }}>
                  {o.tel && (
                    <a className="btn btn-dark lift" href={o.tel} aria-label={tr(`Ligar para ${o.name}, ${o.phone}`, `Call ${o.name}, ${o.phone}`)} style={{ height: 48, borderRadius: 16, padding: '0 16px', fontFamily: 'var(--font-mono)', fontWeight: 500, fontSize: 15 }}>
                      <Icon name="phone" size={16} />
                      {o.phone}
                    </a>
                  )}
                  <a className="btn btn-ghost lift" href={o.url} target="_blank" rel="noreferrer" style={{ height: 48, borderRadius: 16, padding: '0 16px', fontSize: 15 }}>
                    {o.site} <Icon name="external" size={14} />
                  </a>
                  {o.email && (
                    <a className="link" href={`mailto:${o.email}`} style={{ fontSize: 15, padding: '0 4px', minHeight: 48 }}>
                      {o.email}
                    </a>
                  )}
                </div>
              </article>
            ))}
          </div>

          <div className="row wrap" style={{ gap: '20px 48px', alignItems: 'flex-start', paddingTop: 48 }}>
            <a href="tel:112" className="plain row lift" style={{ flex: '1 1 320px', gap: 18 }}>
              <span style={{ flex: 'none', width: 76, height: 76, borderRadius: 38, border: '6px solid var(--down)', display: 'flex', alignItems: 'center', justifyContent: 'center', ...DISPLAY, fontWeight: 700, fontSize: 24, color: 'var(--warn-text)' }}>112</span>
              <span className="stack" style={{ gap: 4 }}>
                <span style={{ ...DISPLAY, fontSize: 22, color: 'var(--warn-text)' }}>{tr('Estás em perigo agora?', 'Are you in danger right now?')}</span>
                <span style={{ fontSize: 15, color: 'var(--body)' }}>{tr('Liga 112. É gratuito.', 'Call 112. It’s free.')}</span>
              </span>
            </a>
            <section className="stack" style={{ flex: '1.4 1 420px', minWidth: 0, borderBottom: '1px solid var(--line)' }}>
              <ModerationNotices notices={notices} />
              {tips}
            </section>
          </div>

          <div className="row wrap between" style={{ gap: 16, marginTop: 48, paddingTop: 20, borderTop: '1px solid var(--line)' }}>
            <p className="small muted" style={{ margin: 0, maxWidth: 760, lineHeight: 1.6 }}>
              {disclaimer}
            </p>
            <Link to="/perfil" className="link" style={{ fontSize: 15 }}>
              {tr('Voltar ao perfil', 'Back to profile')} <Icon name="next" size={16} />
            </Link>
          </div>
        </div>
      </Shell>
    );
  }

  /* ---------- Mobile ---------- */
  return (
    <Shell>
      <section aria-labelledby="apoio-titulo" style={{ background: 'var(--purple)', color: '#fff' }}>
        <div className="stack" style={{ maxWidth: 560, margin: '0 auto', padding: '20px 20px 28px', gap: 16 }}>
          <div className="row between">
            <button type="button" aria-label={tr('Voltar', 'Back')} onClick={back} className="icon-btn" style={{ background: 'transparent', borderColor: '#8E5BB5', color: '#fff' }}>
              <Icon name="back" size={18} />
            </button>
            {privateBadge}
          </div>
          <h1 id="apoio-titulo" style={{ ...DISPLAY, fontSize: 32, lineHeight: 1.08 }}>
            {tr('Não tens de passar por isto sozinho/a.', 'You don’t have to go through this alone.')}
          </h1>
          <p style={{ margin: 0, fontSize: 15, lineHeight: 1.45, color: '#F0E6F7' }}>{intro}</p>
          {found}
        </div>
      </section>

      <div className="page no-nav" style={{ paddingTop: 8, gap: 0 }}>
        {SUPPORT.map((o) => (
          <article key={o.short} className="stack" style={{ gap: 8, padding: '14px 0', borderBottom: '1px solid var(--line)' }}>
            <div className="row" style={{ gap: 12 }}>
              <span style={{ flex: 'none', width: 44, height: 44, borderRadius: 22, border: `4px solid ${o.color}`, display: 'flex', alignItems: 'center', justifyContent: 'center', ...DISPLAY, fontWeight: 700, fontSize: 12 }}>{o.short}</span>
              <span className="stack grow" style={{ gap: 2 }}>
                <span style={{ fontSize: 15, fontWeight: 600, lineHeight: 1.25 }}>{o.what}</span>
                <span className="small muted">
                  {o.short} — {o.full}
                </span>
              </span>
            </div>
            <div className="row wrap" style={{ gap: 8, paddingLeft: 56 }}>
              {o.tel && (
                <a href={o.tel} aria-label={tr(`Ligar para ${o.name}, ${o.phone}`, `Call ${o.name}, ${o.phone}`)} className="btn btn-dark" style={{ height: 44, padding: '0 14px', borderRadius: 14, fontFamily: 'var(--font-mono)', fontWeight: 500, fontSize: 15 }}>
                  <Icon name="phone" size={16} />
                  {o.phone}
                </a>
              )}
              <a href={o.url} target="_blank" rel="noreferrer" className="link" style={{ padding: '0 12px', fontSize: 15 }}>
                {o.site} <Icon name="external" size={14} />
              </a>
            </div>
            <div className="small muted" style={{ paddingLeft: 56 }}>
              {o.note}
              {o.email && (
                <>
                  {' · '}
                  <a href={`mailto:${o.email}`} style={{ fontWeight: 600 }}>
                    {o.email}
                  </a>
                </>
              )}
            </div>
          </article>
        ))}

        <div className="row" style={{ gap: 14, padding: '16px 0', borderBottom: '1px solid var(--line)' }}>
          <a href="tel:112" aria-label={tr('Ligar 112', 'Call 112')} className="plain" style={{ flex: 'none', width: 44, height: 44, borderRadius: 22, border: '4px solid var(--down)', display: 'flex', alignItems: 'center', justifyContent: 'center', ...DISPLAY, fontWeight: 700, fontSize: 13, color: 'var(--warn-text)' }}>
            112
          </a>
          <span style={{ fontSize: 15, color: 'var(--body)' }}>
            {tr(
              <>Em perigo agora? Liga <strong style={{ color: 'var(--ink)' }}>112</strong>.</>,
              <>In danger right now? Call <strong style={{ color: 'var(--ink)' }}>112</strong>.</>,
            )}
          </span>
        </div>

        <ModerationNotices notices={notices} />
        <section style={{ borderBottom: '1px solid var(--line)' }}>{tips}</section>

        <p className="small muted" style={{ margin: 0, paddingTop: 20, lineHeight: 1.5 }}>
          {disclaimer}
        </p>
      </div>
    </Shell>
  );
}

/** Avisos da moderação: avaliação removida (com o motivo) ou resultado de uma denúncia */
function ModerationNotices({ notices }: { notices: SupportMessage[] }) {
  if (!notices.length) return null;
  return (
    <section aria-labelledby="mod-notices" className="stack" style={{ gap: 12 }}>
      <h2 id="mod-notices" style={{ ...DISPLAY, fontSize: 20 }}>{tr('Avisos da moderação', 'Moderation notices')}</h2>
      {notices.map((n) => {
        const org = n.orgName ?? n.details?.orgName ?? tr('uma organização', 'an organisation');
        const title =
          n.details?.decision === 'removed'
            ? tr(`A tua avaliação de ${org} foi removida.`, `Your review of ${org} was removed.`)
            : n.details?.decision === 'upheld'
              ? tr(`A tua denúncia sobre ${org} foi aceite: a avaliação foi removida.`, `Your report about ${org} was upheld: the review was removed.`)
              : tr(`Analisámos a tua denúncia sobre ${org}: a avaliação mantém-se.`, `We reviewed your report about ${org}: the review stays.`);
        return (
          <div key={n.id} className="card stack" style={{ gap: 6, padding: 18 }}>
            <strong style={{ fontSize: 16 }}>{title}</strong>
            {n.details?.note && (
              <span className="body" style={{ fontSize: 15 }}>
                {tr('Motivo: ', 'Reason: ')}
                {n.details.note}
              </span>
            )}
            <span className="small muted">{n.when}</span>
          </div>
        );
      })}
    </section>
  );
}
