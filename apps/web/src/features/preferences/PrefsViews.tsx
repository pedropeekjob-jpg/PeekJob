import type { MouseEvent } from 'react';
import { Link } from 'react-router';
import { Logo } from '../../components/Brand';
import { CRITERION } from '../../data/criteria';
import { tr } from '../../i18n';
import { EMPTY_RANK, MAX_PICKS, statusText } from './prefs';
import { Cta, Options, RankBadge } from './PrefsParts';
import type { PrefsPicker } from './usePrefsPicker';
import styles from './Prefs.module.css';

const TITLE = () => tr('O que mais valorizas num trabalho?', 'What do you value most in a job?');

/** Telemóvel: opções em grelha e barra fixa em baixo */
export function PrefsMobile({ p }: { p: PrefsPicker }) {
  return (
    <div className={styles.mobile}>
      <div className={styles.mobileBody}>
        <div className="row between">
          <Logo height={44} />
          <button type="button" onClick={p.skip} className={`link ${styles.skip}`}>
            {tr('Saltar', 'Skip')}
          </button>
        </div>
        <div className={styles.intro}>
          <h1 className={`h1 ${styles.title}`}>{TITLE()}</h1>
          <p className={`body ${styles.lead}`}>{tr('Escolhe 3, por ordem.', 'Choose 3, in order.')}</p>
        </div>
        <Options picks={p.picks} pick={p.pick} desktop={false} />
      </div>

      <div className={styles.bar}>
        <div aria-live="polite" className={`small muted ${styles.center}`}>
          {statusText(p.picks, false)}
        </div>
        <Cta picks={p.picks} onConfirm={p.confirm} block />
      </div>
    </div>
  );
}

/** Computador: escolhas por ordem à esquerda, cartões à direita */
export function PrefsDesktop({ p }: { p: PrefsPicker }) {
  const onLogo = (e: MouseEvent) => {
    e.preventDefault();
    p.skip();
  };
  return (
    <div className={`container ${styles.desktop}`}>
      <header className={`row between ${styles.header}`}>
        <Link to="/" aria-label={tr('PeekJob, início', 'PeekJob, home')} onClick={onLogo}>
          <Logo height={52} />
        </Link>
        <button type="button" onClick={p.skip} className={`link ${styles.skipWide}`}>
          {tr('Saltar por agora', 'Skip for now')}
        </button>
      </header>

      <div className={`row wrap ${styles.columns}`}>
        <div className={styles.summary}>
          <h1 className={`display ${styles.titleWide}`}>{TITLE()}</h1>
          <p className={`body ${styles.leadWide}`}>{tr('Escolhe 3, por ordem. Ordenamos tudo por isso.', 'Choose 3, in order. We sort everything by them.')}</p>
          <ol aria-label={tr('As tuas escolhas', 'Your choices')} className={styles.chosen}>
            {Array.from({ length: MAX_PICKS }, (_, i) => {
              const c = p.picks[i] ? CRITERION[p.picks[i]] : null;
              return (
                <li key={i} className={`row ${styles.slot}`}>
                  <RankBadge n={i + 1} color={c ? c.color : EMPTY_RANK} large />
                  <span className={styles.slotLabel} data-empty={c ? undefined : true}>
                    {c ? c.label : tr('Por escolher', 'Not chosen yet')}
                  </span>
                </li>
              );
            })}
          </ol>
        </div>

        <div className={styles.choices}>
          <Options picks={p.picks} pick={p.pick} desktop />
          <div className={`row wrap between ${styles.footer}`}>
            <span aria-live="polite" className="small muted">
              {statusText(p.picks, true)}
            </span>
            <Cta picks={p.picks} onConfirm={p.confirm} />
          </div>
        </div>
      </div>
    </div>
  );
}
