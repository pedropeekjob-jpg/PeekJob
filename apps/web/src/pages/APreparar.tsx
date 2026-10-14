import { useCallback, useEffect, useRef, type CSSProperties } from 'react';
import { useNavigate } from 'react-router';
import { LogoAnimated } from '../components/Brand';
import { Shell } from '../components/Layout';
import { CRITERION } from '../data/criteria';
import { tr } from '../i18n';
import { useStore } from '../lib/store';
import { useIsDesktop } from '../lib/useMedia';
import styles from './APreparar.module.css';

export const AUTO_MS = 5000;

/** Avança para o explorar uma única vez: ao fim de AUTO_MS ou quando a pessoa carrega em Continuar */
function useAutoAdvance(to: string, ms: number) {
  const navigate = useNavigate();
  const done = useRef(false);
  const go = useCallback(() => {
    if (done.current) return;
    done.current = true;
    navigate(to, { replace: true });
  }, [navigate, to]);
  useEffect(() => {
    const t = window.setTimeout(go, ms);
    return () => window.clearTimeout(t);
  }, [go, ms]);
  return go;
}

/** Transição depois das prioridades: mostra-as e ordena as organizações por elas */
export default function APreparar() {
  const { prefs } = useStore();
  const desktop = useIsDesktop(); // só para o tamanho do logo animado (SVG com largura própria)
  const go = useAutoAdvance('/explorar', AUTO_MS);

  return (
    <Shell chrome="none">
      <div className={styles.screen}>
        <LogoAnimated width={desktop ? 440 : 250} label={tr('PeekJob a procurar', 'PeekJob searching')} />
        <div role="status" className={styles.status}>
          <div className={`display ${styles.title}`}>
            {tr('A procurar o melhor', 'Finding the best')} <span className={styles.break}>{tr('caminho para ti', 'path for you')}</span>
          </div>
          <div className={`body ${styles.text}`}>{tr('A ordenar as organizações pelo que mais valorizas', 'Sorting organisations by what you value most')}</div>
          {prefs.length > 0 && (
            <ol aria-label={tr('As tuas prioridades', 'Your priorities')} className={styles.priorities}>
              {prefs.map((k, i) => (
                <li key={k} className={styles.priority}>
                  <span aria-hidden="true" className={styles.rank} style={{ '--criterion': CRITERION[k].color } as CSSProperties}>
                    {i + 1}
                  </span>
                  {CRITERION[k].label}
                </li>
              ))}
            </ol>
          )}
        </div>
        <button type="button" className={`btn btn-ghost btn-sm ${styles.next}`} onClick={go}>
          {tr('Continuar', 'Continue')}
        </button>
      </div>
    </Shell>
  );
}
