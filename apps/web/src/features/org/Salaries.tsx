import { useMemo, type CSSProperties } from 'react';
import { Empty, MoreToggle } from '../../components/UI';
import type { Org } from '../../data/orgs';
import { tr } from '../../i18n';
import { euros, plural } from '../../lib/format';
import { useToggle } from '../../lib/useToggle';
import { BigRing } from '../../components/Score';
import { hiddenExtra, hiddenNote, MIN_SALARIES, paidOnTimeCount, salaryAria, salaryEmptyBody, salaryScale, salaryTotal } from './org';
import styles from './Salaries.module.css';

type Band = Org['salaries'][number];

/** Barra de uma função: linha, intervalo mín.–máx. e ponto no valor do meio (posições em % via variáveis CSS) */
function SalaryBar({ s, pos, large }: { s: Band; pos: (v: number) => number; large: boolean }) {
  const l = pos(s.min);
  const r = pos(s.max);
  const vars = { '--l': `${l}%`, '--w': `${r - l}%`, '--m': `${pos(s.median)}%` } as CSSProperties;
  return (
    <div role="img" aria-label={salaryAria(s)} className={large ? styles.barLarge : styles.bar} style={vars}>
      <div className={styles.track} />
      <div className={styles.range} />
      <div className={styles.median} />
    </div>
  );
}

function DesktopBand({ s, pos }: { s: Band; pos: (v: number) => number }) {
  return (
    <div className={styles.rowDesktop}>
      <div className={styles.who}>
        <span className={styles.role}>{s.role}</span>
        <span className={`num ${styles.medianDesktop}`}>{euros(s.median)}</span>
        <span className="small muted">{plural(s.count, tr('salário', 'salary'), tr('salários', 'salaries'))}</span>
      </div>
      <div className={styles.barCol}>
        <SalaryBar s={s} pos={pos} large />
        <div className={`mono small muted ${styles.ends}`} style={{ '--l': `${pos(s.min)}%`, '--r': `${pos(s.max)}%` } as CSSProperties} aria-hidden="true">
          <span className={styles.endMin}>{euros(s.min)}</span>
          <span className={styles.endMax}>{euros(s.max)}</span>
        </div>
      </div>
    </div>
  );
}

function MobileBand({ s, pos }: { s: Band; pos: (v: number) => number }) {
  return (
    <div className={styles.row}>
      <div className={`row between ${styles.rowHead}`}>
        <span className={styles.roleMobile}>
          {s.role} <span className={`small muted ${styles.count}`}>· {s.count}</span>
        </span>
        <span className={`num ${styles.medianMobile}`}>{euros(s.median)}</span>
      </div>
      <SalaryBar s={s} pos={pos} large={false} />
      <div className="row between mono small muted" aria-hidden="true">
        <span>{euros(s.min)}</span>
        <span>{euros(s.max)}</span>
      </div>
    </div>
  );
}

/** Funções com salários suficientes, numa escala comum; as restantes explicadas em nota */
function SalaryBands({ org, desktop }: { org: Org; desktop: boolean }) {
  const { shown, pos } = useMemo(() => salaryScale(org), [org]);
  const extra = useMemo(() => hiddenExtra(org), [org]);
  const [note, toggleNote] = useToggle();
  if (!shown.length) {
    const volunteer = org.type === 'Voluntariado';
    return (
      <Empty
        title={volunteer ? tr('Aqui o trabalho é voluntário.', 'The work here is voluntary.') : tr('Ainda não há salários suficientes.', 'Not enough salaries yet.')}
        body={
          volunteer
            ? tr('Não há salários para mostrar. Vê as avaliações para saber como é o dia a dia.', 'There are no salaries to show. Read the reviews to see what day-to-day work is like.')
            : salaryEmptyBody(org)
        }
      />
    );
  }
  const Band = desktop ? DesktopBand : MobileBand;
  return (
    <div className="stack">
      {shown.map((s) => (
        <Band key={s.role} s={s} pos={pos} />
      ))}
      {desktop ? (
        <div className={styles.noteDesktop}>
          <MoreToggle open={note} onToggle={toggleNote} label={tr('Porque não aparecem outras funções?', 'Why aren’t other roles shown?')} openLabel={tr('Esconder', 'Hide')} controls="sal-note" />
          {note && (
            <p id="sal-note" className={`body fade-up ${styles.noteText}`}>
              {hiddenNote(org)}
            </p>
          )}
        </div>
      ) : (
        <p className={`small muted ${styles.note}`}>
          {tr(`Valor grande = valor do meio. Só funções com ${MIN_SALARIES}+ salários.`, `Big number = median. Only roles with ${MIN_SALARIES}+ salaries.`)}
          {extra ? tr(` Ainda não aparece: ${extra}.`, ` Not shown yet: ${extra}.`) : ''}
        </p>
      )}
    </div>
  );
}

function PaidOnTime({ pct, large }: { pct: number; large: boolean }) {
  return (
    <BigRing value={pct} pct size={large ? 160 : 92} thickness={large ? 14 : 8} ariaLabel={tr(`${pct}% dizem que o salário chega a horas`, `${pct}% say their pay arrives on time`)}>
      <span className={large ? styles.paidLarge : styles.paid}>{pct}%</span>
    </BigRing>
  );
}

export function MobileSalaries({ org }: { org: Org }) {
  const n = salaryTotal(org);
  return (
    <>
      {org.paidOnTimePct != null && n > 0 && (
        <section aria-label={tr('Pontualidade', 'Paid on time')} className={`row ${styles.headline}`}>
          <PaidOnTime pct={org.paidOnTimePct} large={false} />
          <div className={styles.headlineText}>
            <span className={`h2 ${styles.headlineTitle}`}>{tr('recebem a horas', 'get paid on time')}</span>
            <span className="small muted">
              {plural(n, tr('salário', 'salary'), tr('salários', 'salaries'))} · {tr('bruto mensal', 'gross per month')}
            </span>
          </div>
        </section>
      )}
      <section aria-label={tr('Salários por função', 'Salaries by role')}>
        <SalaryBands org={org} desktop={false} />
      </section>
    </>
  );
}

export function DesktopSalaries({ org }: { org: Org }) {
  const n = salaryTotal(org);
  return (
    <>
      <section aria-labelledby="quanto" className="stack">
        <h2 id="quanto" className={`h2 ${styles.mainTitle}`}>
          {tr('Quanto se ganha', 'What people earn')}
        </h2>
        <span className={`small muted ${styles.subtitle}`}>{tr('Bruto mensal · o ponto é o valor do meio', 'Gross per month · the dot is the median')}</span>
        <SalaryBands org={org} desktop />
      </section>
      {org.paidOnTimePct != null && n > 0 && (
        <aside aria-labelledby="a-horas" className={styles.aside}>
          <PaidOnTime pct={org.paidOnTimePct} large />
          <h2 id="a-horas" className={`h2 ${styles.asideTitle}`}>
            {tr('Salário pago a horas', 'Pay on time')}
          </h2>
          <span className="small muted">
            {tr(`Segundo ${paidOnTimeCount(org)} de ${plural(n, 'pessoa', 'pessoas')}.`, `According to ${paidOnTimeCount(org)} of ${plural(n, 'person', 'people')}.`)}
          </span>
        </aside>
      )}
    </>
  );
}
