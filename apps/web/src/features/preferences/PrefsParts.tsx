import type { CSSProperties } from 'react';
import { CRITERIA, type CriterionKey } from '../../data/criteria';
import { tr } from '../../i18n';
import { ctaText, isComplete, rankText, tintOf } from './prefs';
import styles from './Prefs.module.css';

/** Número da prioridade num anel com a cor do critério */
export function RankBadge({ n, color, large = false, className = '' }: { n: number; color: string; large?: boolean; className?: string }) {
  return (
    <span aria-hidden="true" className={`${large ? styles.badgeLarge : styles.badge} ${className}`} style={{ '--c': color } as CSSProperties}>
      {n}
    </span>
  );
}

export function Cta({ picks, onConfirm, block = false }: { picks: CriterionKey[]; onConfirm: () => void; block?: boolean }) {
  const ready = isComplete(picks);
  return (
    <button type="button" className={`btn${ready ? ' btn-primary' : ''} ${block ? `btn-block ${styles.ctaBlock}` : styles.cta}`} disabled={!ready} onClick={onConfirm}>
      {ctaText(picks)}
    </button>
  );
}

interface OptionsProps {
  picks: CriterionKey[];
  pick: (k: CriterionKey) => void;
  desktop: boolean;
}

/** As 8 opções: botões compactos no telemóvel, cartões com a explicação no computador */
export function Options({ picks, pick, desktop }: OptionsProps) {
  return (
    <div role="group" aria-label={tr('Escolhe 3 prioridades', 'Choose 3 priorities')} className={desktop ? styles.cards : styles.grid}>
      {CRITERIA.map((c) => {
        const i = picks.indexOf(c.key);
        const on = i !== -1;
        const rank = on && (
          <>
            <span className="sr-only">{rankText(i)}</span>
            <RankBadge n={i + 1} color={desktop ? c.color : 'var(--teal)'} large={desktop} className={styles.rank} />
          </>
        );
        return desktop ? (
          <button
            key={c.key}
            type="button"
            className={styles.card}
            aria-pressed={on}
            aria-describedby={`pref-hint-${c.key}`}
            onClick={() => pick(c.key)}
            style={{ '--c': c.color, '--tint': tintOf(c.key) } as CSSProperties}
          >
            <span className={`row num ${styles.cardTitle}`}>
              <span aria-hidden="true" className={styles.cardDot} />
              {c.label}
            </span>
            {/* a explicação é a descrição do botão (o nome fica só o critério e a prioridade) */}
            <span id={`pref-hint-${c.key}`} aria-hidden="true" className={styles.cardHint}>
              {c.hint}
            </span>
            {rank}
          </button>
        ) : (
          <button key={c.key} type="button" className={styles.option} aria-pressed={on} title={c.hint} onClick={() => pick(c.key)}>
            {c.label}
            {rank}
          </button>
        );
      })}
    </div>
  );
}
