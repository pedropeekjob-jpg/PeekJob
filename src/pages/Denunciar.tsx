import { useId, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useOrg } from '../api/orgs';
import { Icon } from '../components/Icon';
import { Shell } from '../components/Layout';
import { REPORT_REASONS } from '../data/content';
import type { Org } from '../data/orgs';
import { useIsDesktop } from '../lib/useMedia';

const MAX = 500;

/** Referência curta e estável para cada denúncia (no POC, derivada do id e da hora) */
const makeRef = (seed: string) => {
  let h = Date.now() % 100000;
  for (const ch of seed) h = (h * 31 + ch.charCodeAt(0)) % 9000;
  return `PJ-D-${1000 + h}`;
};

function findTarget(org: Org | undefined, reviewId: string | undefined) {
  if (!org || !reviewId) return null;
  const r = org.reviews.find((x) => x.id === reviewId);
  if (r) return { kind: 'avaliação' as const, title: r.title, meta: `${r.role} · ${r.when}` };
  const i = org.interviews.find((x) => x.id === reviewId);
  if (i) return { kind: 'entrevista' as const, title: i.body, meta: `Entrevista · ${i.role} · ${i.when}` };
  return null;
}

export default function Denunciar() {
  const { id, reviewId } = useParams();
  const org = useOrg(id);
  const target = findTarget(org, reviewId);
  const desktop = useIsDesktop();
  const nav = useNavigate();
  const fieldId = useId();

  const [reason, setReason] = useState<string | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [detail, setDetail] = useState('');
  const [tried, setTried] = useState(false);
  const [sent, setSent] = useState<string | null>(null);
  const [steps, setSteps] = useState(false);

  const orgPath = org ? `/org/${org.id}` : '/ranking';
  const reasonLabel = REPORT_REASONS.find((r) => r.id === reason)?.label;

  const send = () => {
    if (!reason) {
      setTried(true);
      return;
    }
    setSent(makeRef(`${id}/${reviewId}/${reason}`));
    window.scrollTo(0, 0);
  };

  if (!org || !target) {
    return (
      <Shell chrome="full">
        <div className={desktop ? 'container dpage' : 'page no-nav'}>
          <div className="stack" style={{ gap: 16, maxWidth: 560 }}>
            <h1 className="h1">Não encontrámos o que querias denunciar.</h1>
            <p className="lead">Pode já ter sido retirado pela moderação. Se continuares a ver algo errado, volta à página da organização e tenta de novo.</p>
            <Link to={orgPath} className="btn btn-dark" style={{ alignSelf: 'flex-start' }}>
              {org ? `Voltar a ${org.name}` : 'Ver o ranking'}
            </Link>
          </div>
        </div>
      </Shell>
    );
  }

  /* ---------- Blocos partilhados ---------- */

  const reasons = (
    <div
      role="radiogroup"
      aria-label="Motivo"
      aria-describedby={tried && !reason ? 'reason-err' : undefined}
      style={
        desktop
          ? { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(min(300px, 100%), 1fr))', gap: 10 }
          : { display: 'flex', flexDirection: 'column' }
      }
    >
      {REPORT_REASONS.map((r) => {
        const on = reason === r.id;
        return (
          <button
            key={r.id}
            type="button"
            role="radio"
            aria-checked={on}
            onClick={() => {
              setReason(r.id);
              setTried(false);
            }}
            className="row"
            style={
              desktop
                ? { gap: 12, minHeight: 64, padding: '8px 16px', borderRadius: 16, border: `2px solid ${on ? 'var(--teal)' : 'var(--line)'}`, background: 'var(--surface)', textAlign: 'left', fontSize: 15, fontWeight: on ? 600 : 500 }
                : { gap: 12, minHeight: 56, padding: '6px 0', border: 0, borderBottom: '1px solid var(--line)', background: 'transparent', textAlign: 'left', fontSize: 15, fontWeight: on ? 600 : 400 }
            }
          >
            {desktop ? (
              <span aria-hidden="true" style={{ flex: 'none', width: 20, height: 20, borderRadius: 10, border: `${on ? 6 : 2}px solid ${on ? 'var(--teal)' : 'var(--grey)'}`, boxSizing: 'border-box' }} />
            ) : (
              <span
                aria-hidden="true"
                style={{ flex: 'none', width: 22, height: 22, borderRadius: 11, border: `3px solid ${on ? 'var(--ink)' : 'var(--grey)'}`, boxSizing: 'border-box', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
              >
                <span style={{ width: 8, height: 8, borderRadius: 4, background: on ? 'var(--teal)' : 'transparent' }} />
              </span>
            )}
            <span className="stack" style={{ gap: 1 }}>
              <span>{r.label}</span>
              {r.hint && (
                <span className="small muted" style={{ fontWeight: 400 }}>
                  {r.hint}
                </span>
              )}
            </span>
          </button>
        );
      })}
    </div>
  );

  const reasonError =
    tried && !reason ? (
      <span id="reason-err" role="alert" className="small" style={{ color: 'var(--warn-text)', fontWeight: 600 }}>
        Escolhe um motivo para enviar.
      </span>
    ) : null;

  const textarea = (
    <textarea
      id={fieldId}
      className="textarea"
      rows={3}
      maxLength={MAX}
      value={detail}
      onChange={(e) => setDetail(e.target.value)}
      placeholder="Sem nomes nem dados pessoais, por favor."
      style={{ minHeight: desktop ? 110 : 90, borderRadius: 16 }}
    />
  );

  const illegal = (
    <section aria-labelledby="ilegal-h" className="card purple stack" style={{ gap: 12, padding: desktop ? 24 : 20, border: 0 }}>
      <h2 id="ilegal-h" className="h2" style={{ fontSize: 20, color: 'var(--purple-text)' }}>
        Viveste algo ilegal no trabalho?
      </h2>
      <p style={{ margin: 0, fontSize: 15, lineHeight: 1.5, color: 'var(--purple-text)' }}>
        Salários em atraso, assédio ou discriminação têm entidades próprias: a ACT, a CITE e a APAV podem ajudar. A PeekJob não apresenta queixas.
      </p>
      <Link to="/apoio" className="btn btn-purple lift" style={{ alignSelf: 'flex-start', height: 52, borderRadius: 16, fontSize: 15 }}>
        Ver onde pedir apoio
      </Link>
      <span className="small" style={{ color: 'var(--purple-text)' }}>
        Em perigo imediato, liga 112.
      </span>
    </section>
  );

  const quote = (
    <blockquote className="stack" style={{ margin: 0, padding: '4px 0 4px 16px', borderLeft: '3px solid var(--field)', gap: 2 }}>
      <span style={{ fontSize: desktop ? 16 : 15, fontWeight: 600 }}>“{target.title}”</span>
      <span className="small muted">{target.meta}</span>
    </blockquote>
  );

  const confirm = (
    <div className="stack fade-up" style={{ gap: desktop ? 20 : 16 }} role="status">
      <span
        aria-hidden="true"
        style={{ width: desktop ? 80 : 64, height: desktop ? 80 : 64, borderRadius: '50%', background: 'var(--teal)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
      >
        <span style={{ width: desktop ? 64 : 50, height: desktop ? 64 : 50, borderRadius: '50%', background: 'var(--ground)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Icon name="check" size={desktop ? 28 : 24} stroke={2.4} />
        </span>
      </span>
      <h1 className="h1" style={{ fontSize: desktop ? 48 : 32 }}>
        Recebemos a tua denúncia.
      </h1>
      <p className="body" style={{ margin: 0, fontSize: desktop ? 16 : 15, lineHeight: 1.55, maxWidth: 520 }}>
        Motivo: <strong style={{ color: 'var(--ink)', fontWeight: 600 }}>{reasonLabel}</strong>. Uma pessoa revê-a em até 48 horas. Vês a decisão nas tuas mensagens.
      </p>
      <span className="mono small muted">Referência {sent}</span>
      <Link to={orgPath} className={'btn btn-dark lift' + (desktop ? '' : ' btn-block')} style={{ alignSelf: desktop ? 'flex-start' : undefined, marginTop: 8, height: 56 }}>
        Voltar à organização
      </Link>
    </div>
  );

  /* ---------- Desktop ---------- */

  if (desktop) {
    return (
      <Shell chrome="full">
        <div className="container" style={{ paddingTop: 8, paddingBottom: 80 }}>
          <Link to={orgPath} className="row" style={{ display: 'inline-flex', gap: 6, minHeight: 44, textDecoration: 'none', fontSize: 15, fontWeight: 500, color: 'var(--body)' }}>
            <Icon name="back" size={16} /> {org.name}
          </Link>
          <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 680px) minmax(280px, 340px)', justifyContent: 'space-between', gap: 64, alignItems: 'start', paddingTop: 24 }}>
            <section aria-label={`Denunciar ${target.kind}`}>
              {sent ? (
                confirm
              ) : (
                <div className="stack" style={{ gap: 28 }}>
                  <div className="stack" style={{ gap: 16 }}>
                    <h1 className="h1" style={{ fontSize: 48, lineHeight: 1 }}>
                      O que está errado?
                    </h1>
                    {quote}
                  </div>
                  <div className="stack" style={{ gap: 8 }}>
                    {reasons}
                    {reasonError}
                  </div>
                  <div className="stack" style={{ gap: 8 }}>
                    <div className="row between" style={{ alignItems: 'baseline' }}>
                      <label htmlFor={fieldId} style={{ fontSize: 15, fontWeight: 600 }}>
                        Comentário <span style={{ fontWeight: 400, color: 'var(--muted)' }}>(opcional)</span>
                      </label>
                      <span className="mono small muted" aria-live="polite">
                        {detail.length}/{MAX}
                      </span>
                    </div>
                    {textarea}
                  </div>
                  <div className="row wrap" style={{ gap: 12 }}>
                    <button type="button" className="btn btn-dark lift" style={{ height: 56, padding: '0 28px' }} onClick={send} aria-disabled={!reason}>
                      Enviar denúncia
                    </button>
                    <button type="button" className="link" style={{ padding: '0 12px', color: 'var(--body)' }} onClick={() => nav(orgPath)}>
                      Cancelar
                    </button>
                  </div>
                </div>
              )}
            </section>

            <aside className="stack" style={{ gap: 48, paddingTop: 8 }}>
              <section aria-labelledby="mod-h" className="stack" style={{ gap: 8 }}>
                <h2 id="mod-h" className="h2" style={{ fontSize: 20 }}>
                  Como moderamos
                </h2>
                <span className="body" style={{ fontSize: 15 }}>
                  Uma pessoa revê em até 48 horas. É anónimo.
                </span>
                {steps && <ModSteps />}
                <button type="button" className="link" aria-expanded={steps} aria-controls="mod-steps" onClick={() => setSteps(!steps)} style={{ alignSelf: 'flex-start' }}>
                  {steps ? 'Esconder os passos' : 'Ver os 3 passos'}
                </button>
              </section>
              {illegal}
            </aside>
          </div>
        </div>
      </Shell>
    );
  }

  /* ---------- Mobile: folha sobre fundo escuro ---------- */

  return (
    <Shell chrome="none">
      <div style={{ minHeight: '100dvh', background: '#3A4248', display: 'flex', flexDirection: 'column' }}>
        <Link to={orgPath} aria-label="Fechar" style={{ flex: 'none', height: 72, display: 'block' }} />
        <div
          role="dialog"
          aria-modal="false"
          aria-labelledby="den-title"
          style={{ flex: 1, background: 'var(--ground)', borderRadius: '28px 28px 0 0', display: 'flex', flexDirection: 'column' }}
        >
          <div className="row" style={{ justifyContent: 'center', paddingTop: 10 }} aria-hidden="true">
            <span style={{ width: 40, height: 5, borderRadius: 3, background: 'var(--field)' }} />
          </div>
          <div className="stack" style={{ flex: 1, gap: 20, padding: '16px 20px 24px', maxWidth: 560, width: '100%', margin: '0 auto' }}>
            {sent ? (
              <>
                <span id="den-title" className="sr-only">
                  Denúncia enviada
                </span>
                <div style={{ paddingTop: 20 }}>{confirm}</div>
                {illegal}
              </>
            ) : (
              <>
                <div className="row between" style={{ alignItems: 'flex-start', gap: 12 }}>
                  <div className="stack" style={{ gap: 8 }}>
                    <h1 id="den-title" className="h1" style={{ fontSize: 32 }}>
                      O que está errado?
                    </h1>
                    {quote}
                  </div>
                  <Link to={orgPath} className="icon-btn bare" aria-label="Fechar" style={{ marginRight: -10 }}>
                    <Icon name="close" />
                  </Link>
                </div>
                <div className="stack" style={{ gap: 8 }}>
                  {reasons}
                  {reasonError}
                </div>
                {detailOpen ? (
                  <div className="field fade-up">
                    <div className="row between" style={{ alignItems: 'baseline' }}>
                      <label htmlFor={fieldId} className="small muted">
                        Detalhe (opcional)
                      </label>
                      <span className="mono small muted">
                        {detail.length}/{MAX}
                      </span>
                    </div>
                    {textarea}
                  </div>
                ) : (
                  <button type="button" className="link" style={{ alignSelf: 'flex-start', fontSize: 15 }} onClick={() => setDetailOpen(true)} aria-expanded={false}>
                    <Icon name="plus" size={16} /> Adicionar detalhe
                  </button>
                )}
                {illegal}
                <button type="button" className="btn btn-dark btn-block" style={{ marginTop: 'auto', height: 56 }} onClick={send} aria-disabled={!reason}>
                  Enviar denúncia
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </Shell>
  );
}

function ModSteps() {
  const steps = [
    { t: 'Revisão humana', d: 'Uma pessoa lê a avaliação e o motivo em até 48 horas.' },
    { t: 'Decisão com regras públicas', d: 'Mantemos, editamos dados pessoais ou retiramos.' },
    { t: 'Recebes a resposta', d: 'Vês a decisão e o motivo nas tuas mensagens.' },
  ];
  return (
    <ol id="mod-steps" className="stack fade-up" style={{ margin: '8px 0 0', padding: 0, listStyle: 'none', gap: 14 }}>
      {steps.map((s, i) => (
        <li key={s.t} className="row" style={{ gap: 12, alignItems: 'flex-start' }}>
          <span
            aria-hidden="true"
            style={{ flex: 'none', width: 26, height: 26, borderRadius: 13, border: '3px solid var(--teal)', boxSizing: 'border-box', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 700 }}
          >
            {i + 1}
          </span>
          <span className="stack" style={{ gap: 2 }}>
            <span style={{ fontSize: 15, fontWeight: 600 }}>{s.t}</span>
            <span className="small body" style={{ lineHeight: 1.45 }}>
              {s.d}
            </span>
          </span>
        </li>
      ))}
    </ol>
  );
}
