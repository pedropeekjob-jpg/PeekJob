import { useRef, type CSSProperties } from 'react';
import { Link } from 'react-router-dom';
import { LogoAnimated } from '../../components/Brand';
import { Ring } from '../../components/Data';
import { Icon } from '../../components/Icon';
import { tr } from '../../i18n';
import { orgTypeLabel } from '../../i18n/labels';
import { ringLabel, SKELETON, TYPES, type Result, type TypeFilter } from './search';
import styles from './Search.module.css';

interface SearchBoxProps {
  id: string;
  text: string;
  onText: (v: string) => void;
  clear: () => void;
  large?: boolean;
}

/** Campo de pesquisa com botão de limpar (devolve o foco ao campo) */
export function SearchBox({ id, text, onText, clear, large = false }: SearchBoxProps) {
  const ref = useRef<HTMLInputElement>(null);
  const onClear = () => {
    clear();
    ref.current?.focus();
  };
  return (
    <div className={`search grow ${styles.box}`} data-size={large ? 'large' : undefined}>
      <Icon name="search" size={large ? 22 : 18} className={styles.boxIcon} />
      <label htmlFor={id} className="sr-only">
        {tr('Pesquisar organização', 'Search organisations')}
      </label>
      <input
        ref={ref}
        id={id}
        type="search"
        value={text}
        onChange={(e) => onText(e.target.value)}
        placeholder={tr('Nome, setor ou cidade', 'Name, sector or city')}
        autoComplete="off"
        enterKeyHint="search"
      />
      {text && (
        <button type="button" aria-label={tr('Limpar pesquisa', 'Clear search')} onClick={onClear} className={styles.clear}>
          <span className={styles.clearDot}>
            <Icon name="close" size={large ? 16 : 14} stroke={2} />
          </span>
        </button>
      )}
    </div>
  );
}

export function TypeChips({ type, pickType, small = false }: { type: TypeFilter; pickType: (t: TypeFilter) => void; small?: boolean }) {
  return (
    <div role="group" aria-label={tr('Tipo de organização', 'Type of organisation')} className="chips">
      {TYPES.map((t) => (
        <button key={t} type="button" className={`chip dark ${small ? styles.chipSmall : styles.chip}`} aria-pressed={type === t} onClick={() => pickType(t)}>
          {orgTypeLabel(t)}
        </button>
      ))}
    </div>
  );
}

function Compatibility({ value, desktop }: { value: number | null; desktop: boolean }) {
  if (value == null) return <span className={`small muted ${styles.none}`}>{tr('Sem avaliações', 'No reviews')}</span>;
  if (desktop) return <span className={`pill pill-match ${styles.pill}`}>{tr(`${value}% para ti`, `${value}% for you`)}</span>;
  return (
    <span className={styles.match}>
      <span className={`num ${styles.matchValue}`}>{value}%</span>
      <span className={styles.matchLabel}>{tr('para ti', 'for you')}</span>
    </span>
  );
}

/** Um resultado: nota, nome, tipo e cidade, compatibilidade */
export function ResultRow({ r, desktop = false }: { r: Result; desktop?: boolean }) {
  const { org } = r;
  return (
    <Link to={`/org/${org.id}`} data-ev="select_org" data-ev-org-type={org.type} className={`plain row ${desktop ? styles.resultWide : styles.result}`}>
      <Ring
        value={org.score}
        size={desktop ? 52 : 46}
        thickness={desktop ? 6 : 5}
        fontSize={desktop ? 16 : 15}
        inner={desktop ? 'var(--surface)' : 'var(--ground)'}
        muted={!org.reviewsCount}
        ariaLabel={ringLabel(org)}
      />
      <span className={`grow ${styles.names}`}>
        <span className={`ellipsis ${styles.name}`}>{org.name}</span>
        <span className="small muted ellipsis">
          {orgTypeLabel(org.type)} · {org.city}
        </span>
      </span>
      <Compatibility value={r.match} desktop={desktop} />
    </Link>
  );
}

/** Estado "a procurar": logótipo animado pequeno e cartões esqueleto */
export function Searching({ total, desktop = false }: { total: number; desktop?: boolean }) {
  return (
    <div className={`fade-up ${styles.searching}`}>
      <div role="status" className={desktop ? styles.statusWide : styles.status}>
        <LogoAnimated width={170} label={tr('A procurar', 'Searching')} />
        <div className={`num ${styles.statusTitle}`}>{tr(`A espreitar ${total} organizações…`, `Peeking at ${total} organisations…`)}</div>
        <div className="small muted">{tr('Ordenadas pelo que valorizas', 'Sorted by what you value')}</div>
      </div>
      <div className={styles.skeletons} aria-hidden="true">
        {SKELETON.map(([a, b]) => (
          <div key={`${a}-${b}`} className={`row ${styles.skeleton}`} style={{ '--a': `${a}%`, '--b': `${b}%` } as CSSProperties}>
            <span className={`sk ${styles.skRing}`} />
            <span className={`grow ${styles.skLines}`}>
              <span className={`sk ${styles.skLine1}`} />
              <span className={`sk ${styles.skLine2}`} />
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
