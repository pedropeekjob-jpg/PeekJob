import { useCallback, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Shell } from '../components/Layout';
import { LogoAnimated } from '../components/Brand';
import { CRITERION } from '../data/criteria';
import { useStore } from '../lib/store';
import { useIsDesktop } from '../lib/useMedia';
import { tr } from '../i18n';

const AUTO_MS = 5000;

export default function APreparar() {
  const { prefs } = useStore();
  const navigate = useNavigate();
  const desktop = useIsDesktop();
  const done = useRef(false);

  const go = useCallback(() => {
    if (done.current) return;
    done.current = true;
    navigate('/explorar', { replace: true });
  }, [navigate]);

  useEffect(() => {
    const t = window.setTimeout(go, AUTO_MS);
    return () => window.clearTimeout(t);
  }, [go]);

  return (
    <Shell chrome="none">
      <div
        onClick={go}
        className="stack"
        style={{
          minHeight: '100dvh',
          alignItems: 'center',
          justifyContent: 'center',
          gap: desktop ? 36 : 28,
          padding: desktop ? '48px 16px' : 24,
          cursor: 'pointer',
          textAlign: 'center',
        }}
      >
        <LogoAnimated width={desktop ? 440 : 250} label={tr('PeekJob a procurar', 'PeekJob searching')} />
        <div role="status" className="stack" style={{ alignItems: 'center', gap: desktop ? 14 : 12 }}>
          <div className="display" style={{ fontSize: desktop ? 'clamp(30px, 3.4vw, 44px)' : 24, lineHeight: desktop ? 1.1 : 1.15 }}>
            {tr(<>A procurar o melhor{desktop ? ' ' : <br />}caminho para ti</>, <>Finding the best{desktop ? ' ' : <br />}path for you</>)}
          </div>
          <div className="body" style={{ fontSize: desktop ? 17 : 14 }}>
            {desktop ? tr('A ordenar as organizações pelo que mais valorizas', 'Sorting organisations by what you value most') : tr('A ordenar as organizações pelo que valorizas', 'Sorting organisations by what you value')}
          </div>
          {prefs.length > 0 && (
            <ol aria-label={tr('As tuas prioridades', 'Your priorities')} className="row wrap" style={{ justifyContent: 'center', gap: desktop ? 8 : 6, paddingTop: desktop ? 6 : 4, margin: 0, paddingLeft: 0, listStyle: 'none' }}>
              {prefs.map((k, i) => (
                <li
                  key={k}
                  className="row"
                  style={{ gap: 6, fontSize: 13, padding: '5px 10px 5px 5px', borderRadius: 999, background: 'var(--surface)', border: '1px solid var(--line)' }}
                >
                  <span
                    aria-hidden="true"
                    style={{ width: 20, height: 20, borderRadius: 10, border: `2px solid ${CRITERION[k].color}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 700 }}
                  >
                    {i + 1}
                  </span>
                  {CRITERION[k].label}
                </li>
              ))}
            </ol>
          )}
        </div>
        <button
          type="button"
          className="btn btn-ghost btn-sm"
          onClick={(e) => {
            e.stopPropagation();
            go();
          }}
          style={{ height: 44, marginTop: desktop ? 0 : 4 }}
        >
          {tr('Continuar', 'Continue')}
        </button>
      </div>
    </Shell>
  );
}
