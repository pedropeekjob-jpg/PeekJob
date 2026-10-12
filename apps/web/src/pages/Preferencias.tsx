import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Shell } from '../components/Layout';
import { Logo } from '../components/Brand';
import { CRITERIA, CRITERION, type CriterionKey } from '../data/criteria';
import { useStore } from '../lib/store';
import { useIsDesktop } from '../lib/useMedia';

const tintOf = (k: CriterionKey) => (k === 'respeito' ? 'var(--purple-tint)' : 'var(--teal-tint)');

export default function Preferencias() {
  const { prefs, setPrefs, finishOnboarding } = useStore();
  const navigate = useNavigate();
  const desktop = useIsDesktop();
  const [picks, setPicks] = useState<CriterionKey[]>(prefs);

  const pick = (k: CriterionKey) =>
    setPicks((p) => (p.includes(k) ? p.filter((x) => x !== k) : p.length < 3 ? [...p, k] : p));
  const confirm = () => {
    setPrefs(picks);
    navigate('/a-preparar');
  };
  const skip = () => {
    finishOnboarding();
    navigate('/explorar');
  };

  const n = picks.length;
  const view = { picks, pick, confirm, skip, n };
  return <Shell chrome="none">{desktop ? <DesktopPrefs {...view} /> : <MobilePrefs {...view} />}</Shell>;
}

interface ViewProps {
  picks: CriterionKey[];
  pick: (k: CriterionKey) => void;
  confirm: () => void;
  skip: () => void;
  n: number;
}

function MobilePrefs({ picks, pick, confirm, skip, n }: ViewProps) {
  return (
    <div style={{ minHeight: '100dvh', display: 'flex', flexDirection: 'column', maxWidth: 560, margin: '0 auto' }}>
      <div className="stack" style={{ flex: 1, gap: 28, padding: '24px 20px 24px' }}>
        <div className="row between">
          <Logo height={44} />
          <button type="button" onClick={skip} className="link" style={{ color: 'var(--muted)', fontWeight: 500, fontSize: 15, padding: '12px 4px' }}>
            Saltar
          </button>
        </div>
        <div className="stack" style={{ gap: 8 }}>
          <h1 className="h1" style={{ letterSpacing: '-0.02em' }}>
            O que mais valorizas num trabalho?
          </h1>
          <p className="body" style={{ margin: 0, fontSize: 15 }}>
            Escolhe 3, por ordem.
          </p>
        </div>

        <div role="group" aria-label="Escolhe 3 prioridades" style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 10 }}>
          {CRITERIA.map((c) => {
            const i = picks.indexOf(c.key);
            const on = i !== -1;
            return (
              <button
                key={c.key}
                type="button"
                className="pj-opt"
                aria-pressed={on}
                title={c.hint}
                onClick={() => pick(c.key)}
                style={{
                  position: 'relative',
                  display: 'flex',
                  alignItems: 'center',
                  minHeight: 60,
                  padding: '0 44px 0 16px',
                  borderRadius: 18,
                  border: `2px solid ${on ? 'var(--teal)' : 'var(--line)'}`,
                  background: on ? 'var(--teal-tint)' : 'var(--surface)',
                  textAlign: 'left',
                  fontSize: 15,
                  fontWeight: 600,
                  lineHeight: 1.25,
                }}
              >
                {c.label}
                {on && (
                  <>
                    <span className="sr-only">, prioridade {i + 1}</span>
                    <RankBadge n={i + 1} color="var(--teal)" size={26} style={{ position: 'absolute', top: '50%', right: 12, marginTop: -13 }} />
                  </>
                )}
              </button>
            );
          })}
        </div>
      </div>

      <div className="stack" style={{ position: 'sticky', bottom: 0, gap: 8, padding: '14px 20px calc(22px + env(safe-area-inset-bottom))', borderTop: '1px solid var(--line)', background: 'var(--ground)' }}>
        <div aria-live="polite" className="small muted" style={{ textAlign: 'center' }}>
          {n === 3 ? picks.map((k) => CRITERION[k].label).join(' · ') : `${n} de 3 · toca de novo para tirar`}
        </div>
        <CTA n={n} onConfirm={confirm} block />
      </div>
      <style>{OPT_CSS}</style>
    </div>
  );
}

function DesktopPrefs({ picks, pick, confirm, skip, n }: ViewProps) {
  return (
    <div className="container" style={{ paddingBottom: 64 }}>
      <header className="row between" style={{ gap: 16, paddingTop: 22, paddingBottom: 22 }}>
        <Link to="/" aria-label="PeekJob, início" onClick={(e) => { e.preventDefault(); skip(); }}>
          <Logo height={52} />
        </Link>
        <button type="button" onClick={skip} className="link" style={{ color: 'var(--body)', fontWeight: 500, fontSize: 15 }}>
          Saltar por agora
        </button>
      </header>

      <div className="row wrap" style={{ gap: 64, alignItems: 'flex-start', paddingTop: 48 }}>
        <div className="stack" style={{ flex: '1 1 340px', minWidth: 0, gap: 16 }}>
          <h1 className="display" style={{ fontSize: 'clamp(40px, 4vw, 56px)', letterSpacing: '-0.01em' }}>
            O que mais valorizas num trabalho?
          </h1>
          <p className="body" style={{ margin: 0, fontSize: 16 }}>
            Escolhe 3, por ordem. Ordenamos tudo por isso.
          </p>
          <ol aria-label="As tuas escolhas" className="stack" style={{ margin: 0, padding: '16px 0 0', listStyle: 'none' }}>
            {[0, 1, 2].map((i) => {
              const k = picks[i];
              const c = k ? CRITERION[k] : null;
              return (
                <li key={i} className="row" style={{ gap: 14, height: 52, borderBottom: '1px solid var(--line)' }}>
                  <RankBadge n={i + 1} color={c ? c.color : '#C9CDD0'} size={30} border={4} />
                  <span style={{ fontSize: 16, fontWeight: c ? 600 : 400, color: c ? 'var(--ink)' : 'var(--muted)' }}>{c ? c.label : 'Por escolher'}</span>
                </li>
              );
            })}
          </ol>
        </div>

        <div className="stack" style={{ flex: '1.4 1 520px', minWidth: 0, gap: 24 }}>
          <div role="group" aria-label="Escolhe 3 prioridades" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(min(280px, 100%), 1fr))', gap: 12 }}>
            {CRITERIA.map((c) => {
              const i = picks.indexOf(c.key);
              const on = i !== -1;
              return (
                <button
                  key={c.key}
                  type="button"
                  className="pj-opt pj-opt-d"
                  aria-pressed={on}
                  onClick={() => pick(c.key)}
                  style={{
                    position: 'relative',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'flex-start',
                    gap: 4,
                    minHeight: 88,
                    padding: '16px 18px',
                    borderRadius: 22,
                    border: `2px solid ${on ? c.color : 'var(--line)'}`,
                    background: on ? tintOf(c.key) : 'var(--surface)',
                    textAlign: 'left',
                  }}
                >
                  <span className="row num" style={{ gap: 8, fontSize: 20 }}>
                    <span aria-hidden="true" style={{ width: 10, height: 10, borderRadius: 5, background: c.color }} />
                    {c.label}
                  </span>
                  <span style={{ fontSize: 13, lineHeight: 1.4, color: 'var(--body)', paddingRight: 30 }}>{c.hint}</span>
                  {on && (
                    <>
                      <span className="sr-only">, prioridade {i + 1}</span>
                      <RankBadge n={i + 1} color={c.color} size={30} border={4} style={{ position: 'absolute', top: 14, right: 14 }} />
                    </>
                  )}
                </button>
              );
            })}
          </div>
          <div className="row wrap between" style={{ gap: 16 }}>
            <span aria-live="polite" className="small muted">
              {n} de 3 · clica de novo para tirar
            </span>
            <CTA n={n} onConfirm={confirm} />
          </div>
        </div>
      </div>
      <style>{OPT_CSS}</style>
    </div>
  );
}

function CTA({ n, onConfirm, block = false }: { n: number; onConfirm: () => void; block?: boolean }) {
  const ready = n === 3;
  return (
    <button
      type="button"
      className={'btn ' + (ready ? 'btn-primary' : '') + (block ? ' btn-block' : '')}
      disabled={!ready}
      onClick={onConfirm}
      style={{ height: block ? 56 : 58, padding: block ? undefined : '0 28px' }}
    >
      {ready ? 'Ver organizações para mim' : `Escolhe mais ${3 - n}`}
    </button>
  );
}

function RankBadge({ n, color, size, border = 3, style }: { n: number; color: string; size: number; border?: number; style?: React.CSSProperties }) {
  return (
    <span
      aria-hidden="true"
      style={{
        flex: 'none',
        width: size,
        height: size,
        borderRadius: size / 2,
        border: `${border}px solid ${color}`,
        background: 'var(--surface)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontFamily: 'var(--font-display)',
        fontWeight: 700,
        fontSize: size > 28 ? 14 : 13,
        color: 'var(--ink)',
        ...style,
      }}
    >
      {n}
    </span>
  );
}

const OPT_CSS = `
.pj-opt{color:var(--ink);cursor:pointer;transition:border-color .15s,background .15s,transform .2s cubic-bezier(.2,.8,.2,1)}
.pj-opt:active{transform:scale(.98)}
.pj-opt-d:hover{transform:translateY(-2px)}
`;
