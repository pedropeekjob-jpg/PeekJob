import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Shell } from '../components/Layout';
import { Icon } from '../components/Icon';
import { Ring } from '../components/Data';
import { Empty } from '../components/UI';
import { useOrg } from '../api/orgs';
import { useStore } from '../lib/store';
import { fmt, plural } from '../lib/format';
import { useIsDesktop } from '../lib/useMedia';
import { DISPLAY, FlowHead, MiniSteps, NotesGrid } from './Avaliar.parts';

export default function AvaliarFeito() {
  const desktop = useIsDesktop();
  const nav = useNavigate();
  const { myReviews, lastPublished, user, messages } = useStore();
  const review = lastPublished ? myReviews.find((r) => r.id === lastPublished) : undefined;
  const org = useOrg(review?.orgId);
  const [open, setOpen] = useState(false);

  if (!review) {
    return (
      <Shell chrome="header">
        <div className={desktop ? 'container dpage' : 'page no-nav'}>
          {!desktop && <FlowHead icon="close" label="Fechar e voltar ao início" onClick={() => nav('/')} />}
          <Empty
            title="Ainda não publicaste nenhuma avaliação"
            body="Leva uns 2 minutos e ninguém fica a saber que foste tu."
            action={
              <Link to="/avaliar" className="btn btn-primary" style={{ alignSelf: 'flex-start', marginTop: 12 }}>
                Avaliar onde trabalho
              </Link>
            }
          />
        </div>
      </Shell>
    );
  }

  const name = org?.name ?? 'A organização';
  const total = (org?.reviewsCount ?? 0) + 1;
  const unread = messages.filter((m) => !m.read).length || 1;
  const ringAria = `A tua nota média: ${fmt(review.avg)} de 5`;
  const orgLink = org ? `/org/${org.id}` : '/';

  const supportCard = review.flagged ? (
    user ? (
      <Link to="/apoio" className="plain row lift" style={{ gap: desktop ? 16 : 14, background: 'var(--purple)', color: '#fff', borderRadius: desktop ? 24 : 20, padding: desktop ? 22 : 16 }}>
        <span style={{ flex: 'none', width: desktop ? 44 : 40, height: desktop ? 44 : 40, borderRadius: 22, border: '4px solid #fff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Icon name="mail" size={16} stroke={2} />
        </span>
        <span className="stack grow" style={{ gap: 2 }}>
          <span style={{ fontSize: 16, fontWeight: 600 }}>Tens {plural(unread, 'mensagem privada', 'mensagens privadas')}</span>
          <span style={{ fontSize: 13, color: '#E0CCEE' }}>Onde pedir ajuda</span>
        </span>
        <Icon name="next" size={18} />
      </Link>
    ) : (
      <section className="stack" aria-label="Apoio" style={{ background: 'var(--purple-tint)', border: '1px solid var(--purple-line)', borderRadius: desktop ? 24 : 20, padding: desktop ? 22 : 18, gap: 10 }}>
        <span style={{ fontSize: 16, fontWeight: 600, color: 'var(--purple-text)' }}>O que descreveste pode ser ilegal</span>
        <span className="small body" style={{ lineHeight: 1.5 }}>
          Entra com o teu email para receberes os contactos de apoio numa mensagem privada. Ninguém mais a vê.
        </span>
        <div className="row wrap" style={{ gap: '4px 16px' }}>
          <Link to="/entrar" className="btn btn-purple btn-sm" style={{ height: 44 }}>
            Entrar
          </Link>
          <Link to="/apoio" className="link" style={{ color: 'var(--purple-text)' }}>
            Ver onde pedir ajuda agora <Icon name="next" size={16} />
          </Link>
        </div>
      </section>
    )
  ) : null;

  const notesToggle = (
    <button
      type="button"
      aria-expanded={open}
      onClick={() => setOpen(!open)}
      className={desktop ? 'link' : 'row between'}
      style={desktop ? { fontSize: 15 } : { width: '100%', minHeight: 52, padding: 0, border: 0, background: 'transparent', fontSize: 15, fontWeight: 600 }}
    >
      {open ? 'Esconder as tuas notas' : 'Ver as tuas 8 notas'}
      <Icon name="down" size={18} style={{ transform: open ? 'rotate(180deg)' : undefined, transition: 'transform .15s' }} />
    </button>
  );

  const ringAnim = <style>{`.done-ring{animation:doneRing 1.2s cubic-bezier(.2,.8,.2,1) both}@keyframes doneRing{from{transform:rotate(-90deg) scale(.85);opacity:0}to{transform:none;opacity:1}}`}</style>;

  /* ---------- Desktop ---------- */
  if (desktop) {
    return (
      <Shell chrome="header">
        {ringAnim}
        <div className="container fade-up" style={{ paddingBottom: 80 }}>
          <div className="row wrap" style={{ gap: 56, alignItems: 'flex-start', paddingTop: 56 }}>
            <div className="stack" style={{ flex: '1.6 1 560px', minWidth: 0, gap: 28 }}>
              <div className="row wrap" style={{ gap: 28 }}>
                <span className="done-ring">
                  <Ring value={review.avg} size={160} thickness={15} inner="var(--ground)" fontSize={48} ariaLabel={ringAria} />
                </span>
                <div className="stack" style={{ gap: 10, minWidth: 0 }}>
                  <h1 style={{ ...DISPLAY, fontSize: 56, lineHeight: 1 }}>Publicado. Obrigado.</h1>
                  <p className="lead" style={{ fontSize: 16 }}>
                    Ninguém sabe que foste tu. {name} passa a ter {plural(total, 'avaliação', 'avaliações')}.
                  </p>
                </div>
              </div>
              <div className="row wrap" style={{ gap: '8px 24px' }}>{notesToggle}</div>
              {open && <NotesGrid desktop scores={review.scores} />}
            </div>
            <aside className="stack" style={{ flex: '1 1 320px', minWidth: 0, gap: 14 }}>
              {supportCard}
              <Link to={orgLink} className="btn btn-dark lift" style={{ height: 56 }}>
                Ver na página da organização
              </Link>
              <Link to="/" className="btn" style={{ height: 48, background: 'none', color: 'var(--teal-text)', fontWeight: 500, fontSize: 15 }}>
                Voltar ao início
              </Link>
            </aside>
          </div>
        </div>
      </Shell>
    );
  }

  /* ---------- Mobile ---------- */
  return (
    <Shell>
      {ringAnim}
      <div className="page no-nav" style={{ minHeight: '100dvh', paddingBottom: 0, gap: 28 }}>
        <FlowHead icon="close" label="Fechar e voltar ao início" onClick={() => nav('/')} right={<MiniSteps current={3} done />} />
        <div className="stack" style={{ alignItems: 'center', gap: 16, textAlign: 'center', paddingTop: 12 }}>
          <span className="done-ring">
            <Ring value={review.avg} size={132} thickness={12} inner="var(--ground)" fontSize={38} ariaLabel={ringAria} />
          </span>
          <h1 style={{ ...DISPLAY, fontSize: 36, lineHeight: 1 }}>Publicado. Obrigado.</h1>
          <div style={{ fontSize: 15, color: 'var(--body)' }}>
            {name} passa a ter {plural(total, 'avaliação', 'avaliações')}.
          </div>
        </div>

        {supportCard}

        <section aria-label="As tuas notas" className="stack" style={{ borderTop: '1px solid var(--line)' }}>
          {notesToggle}
          {open && <NotesGrid scores={review.scores} />}
        </section>

        <div className="sticky-cta stack" style={{ gap: 4 }}>
          <Link to={orgLink} className="btn btn-dark btn-block" style={{ height: 56 }}>
            Ver na página da organização
          </Link>
          <Link to="/" className="btn btn-block" style={{ height: 44, background: 'none', color: 'var(--body)', fontWeight: 500, fontSize: 14 }}>
            Voltar ao início
          </Link>
        </div>
      </div>
    </Shell>
  );
}
