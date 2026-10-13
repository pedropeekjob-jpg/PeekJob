import { Link } from 'react-router-dom';
import { Ring } from '../../components/Data';
import { Icon } from '../../components/Icon';
import { CRITERION } from '../../data/criteria';
import type { Org } from '../../data/orgs';
import { tr } from '../../i18n';
import { fmt } from '../../lib/format';
import { useToggle } from '../../lib/useToggle';
import { CritLine, PrioMark } from '../../components/Score';
import { MoreToggle } from '../../components/UI';
import { dotFill, harassmentLine } from './org';
import { RespeitoTags } from './OrgCommon';
import { useCriteria } from './useOrgPage';
import styles from './Criteria.module.css';

const DOTS = [0, 1, 2, 3, 4];

/** Telemóvel: respeito e inclusão em destaque (abre as etiquetas), prioridades e "ver os 8" */
export function MobileCriteria({ org }: { org: Org }) {
  const { prefs, rest, prio, value } = useCriteria(org);
  const [resp, toggleResp] = useToggle();
  const [all, toggleAll] = useToggle();
  const r = org.scores.respeito;
  const R = CRITERION.respeito;
  const respPrio = prio('respeito');
  return (
    <section aria-labelledby="o-que-importa" className={styles.mobile}>
      <h2 id="o-que-importa" className={`h2 ${styles.mobileTitle}`}>
        {tr('O que mais te importa', 'What matters most to you')}
      </h2>

      <button type="button" aria-expanded={resp} aria-controls="resp-tags" onClick={toggleResp} className={`row ${styles.respButton}`}>
        {respPrio ? <PrioMark n={respPrio} color={R.color} /> : null}
        <span className="grow">{R.label}</span>
        <span aria-hidden="true" className={styles.dots}>
          {DOTS.map((k) => (
            <span key={k} className={styles.dot} data-fill={dotFill(r, k)} />
          ))}
        </span>
        <span className={`mono ${styles.respValue}`} aria-label={r == null ? tr('sem dados', 'no data') : tr(`${fmt(r)} de 5`, `${fmt(r)} out of 5`)}>
          {r == null ? '—' : fmt(r)}
        </span>
        <Icon name="down" size={16} stroke={2} className={styles.chevron} />
      </button>
      {resp && (
        <div id="resp-tags" className={`fade-up ${styles.respTags}`}>
          <span className={`small ${styles.harassment}`}>{harassmentLine(org)}</span>
          <RespeitoTags org={org} />
        </div>
      )}

      {prefs
        .filter((k) => k !== 'respeito')
        .map((k) => (
          <CritLine key={k} k={k} value={value(k)} priority={prio(k)} border minHeight={44} />
        ))}
      {all && (
        <div id="crit-rest" className="stack fade-up">
          {rest
            .filter((k) => k !== 'respeito')
            .map((k) => (
              <CritLine key={k} k={k} value={value(k)} border minHeight={44} muted />
            ))}
        </div>
      )}
      <MoreToggle open={all} onToggle={toggleAll} label={tr('Ver os 8 critérios', 'See all 8 criteria')} openLabel={tr('Mostrar menos', 'Show less')} controls="crit-rest" />
    </section>
  );
}

/** Computador: cartão de respeito e inclusão */
export function DesktopRespeito({ org }: { org: Org }) {
  const [open, toggle] = useToggle();
  const r = org.scores.respeito ?? 0;
  return (
    <section aria-labelledby="resp-h" className={styles.respCard}>
      <div className={`row ${styles.respHead}`}>
        <Ring value={r} size={64} color="var(--purple)" track="var(--purple-line)" inner="var(--purple-tint)" fontSize={20} ariaLabel={tr(`Respeito e inclusão ${fmt(r)} de 5`, `Respect and inclusion ${fmt(r)} out of 5`)} />
        <span className={styles.respHeadText}>
          <h2 id="resp-h" className={`h2 ${styles.respTitle}`}>
            {tr('Respeito e inclusão', 'Respect and inclusion')}
          </h2>
          <span className={`small ${styles.respLine}`}>{harassmentLine(org)}</span>
        </span>
      </div>
      <button type="button" className={`link ${styles.respLink}`} aria-expanded={open} aria-controls="resp-tags-d" onClick={toggle}>
        {open ? tr('Esconder o que dizem', 'Hide what people say') : tr('Ver o que dizem', 'See what people say')}
        <Icon name="down" size={16} className={styles.chevronFast} />
      </button>
      {open && (
        <div id="resp-tags-d" className="fade-up">
          <RespeitoTags org={org} />
        </div>
      )}
    </section>
  );
}

/** Computador: as prioridades da pessoa e os restantes critérios */
export function DesktopCriteria({ org }: { org: Org }) {
  const { prefs, rest, prio, value } = useCriteria(org);
  const [all, toggleAll] = useToggle();
  return (
    <section aria-labelledby="prio-h" className={styles.desktop}>
      <h2 id="prio-h" className={`h2 ${styles.desktopTitle}`}>
        {tr('As tuas prioridades', 'Your priorities')}
      </h2>
      {prefs.map((k) => (
        <CritLine key={k} k={k} value={value(k)} priority={prio(k)} bold />
      ))}
      {all && (
        <div id="crit-rest-d" className={`fade-up ${styles.rest}`}>
          {rest.map((k) => (
            <CritLine key={k} k={k} value={value(k)} muted />
          ))}
        </div>
      )}
      <MoreToggle open={all} onToggle={toggleAll} label={tr('Ver os 8 critérios', 'See all 8 criteria')} openLabel={tr('Mostrar só as prioridades', 'Show only priorities')} controls="crit-rest-d" />
      <Link to="/preferencias" className={`small ${styles.prefsLink}`}>
        {tr('Mudar as minhas prioridades', 'Change my priorities')}
      </Link>
    </section>
  );
}
