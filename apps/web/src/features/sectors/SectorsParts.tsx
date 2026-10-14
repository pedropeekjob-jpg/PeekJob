import { Link } from 'react-router';
import { Ring } from '../../components/Data';
import type { OrgType } from '../../data/orgs';
import { tr } from '../../i18n';
import { orgTypeLabel, sectorLabel } from '../../i18n/labels';
import { fmt, plural } from '../../lib/format';
import { sectorHref, type Aggregate, type SectorSort } from './sectors';
import styles from './Sectors.module.css';

const orgsText = (n: number) => plural(n, tr('organização', 'organisation'), tr('organizações', 'organisations'));

/** Cartão de um tipo de organização (carregar escolhe; outra vez tira o filtro) */
export function TypeCard({ t, n, score, on, desktop, onToggle }: Aggregate & { t: OrgType; on: boolean; desktop: boolean; onToggle: (t: OrgType) => void }) {
  return (
    <button type="button" className={`lift ${styles.type}`} aria-pressed={on} onClick={() => onToggle(t)}>
      <Ring
        value={score}
        size={desktop ? 60 : 48}
        muted={!n}
        inner={on ? 'var(--teal-tint)' : 'var(--surface)'}
        ariaLabel={n ? tr(`Nota média ${fmt(score)} de 5`, `Average score ${fmt(score)} out of 5`) : tr('Ainda sem nota', 'No score yet')}
      />
      <span className={styles.typeText}>
        <span className={`num ${styles.typeName}`}>{orgTypeLabel(t)}</span>
        <span className="small muted">{orgsText(n)}</span>
      </span>
    </button>
  );
}

const SORTS: [SectorSort, () => string, () => string][] = [
  ['nota', () => tr('Melhor nota', 'Top score'), () => tr('Melhor nota', 'Top score')],
  ['resp', () => tr('Mais respeito', 'Most respect'), () => tr('Mais respeito', 'Most respect')],
  ['n', () => tr('Mais organizações', 'Most organisations'), () => tr('Mais org.', 'Most orgs')],
];

/** Melhor nota · Mais respeito · Mais organizações (texto curto no telemóvel) */
export function SectorSortToggle({ sort, desktop, onChange }: { sort: SectorSort; desktop: boolean; onChange: (s: SectorSort) => void }) {
  return (
    <div className={`segmented ${styles.sort}`} role="group" aria-label={tr('Ordenar setores', 'Sort sectors')}>
      {SORTS.map(([k, long, short]) => (
        <button key={k} type="button" aria-pressed={sort === k} onClick={() => onChange(k)}>
          {desktop ? long() : short()}
        </button>
      ))}
    </div>
  );
}

/** Um setor: nota média, n.º de organizações e Respeito; liga ao ranking filtrado */
export function SectorRow({ s, type }: { s: Aggregate & { name: string }; type: OrgType | null }) {
  return (
    <Link to={sectorHref(type, s.name)} className={`plain row ${styles.sector}`}>
      <Ring value={s.score} size={52} fontSize={16} ariaLabel={tr(`Nota média ${fmt(s.score)} de 5`, `Average score ${fmt(s.score)} out of 5`)} />
      <span className={`grow ${styles.sectorText}`}>
        <span className={`ellipsis ${styles.sectorName}`}>{sectorLabel(s.name)}</span>
        <span className="small muted">{orgsText(s.n)}</span>
      </span>
      <span className={`row small ${styles.resp}`} aria-label={tr(`Respeito e inclusão ${fmt(s.resp)} de 5`, `Respect and inclusion ${fmt(s.resp)} out of 5`)}>
        <span aria-hidden="true" className={styles.respDot} />
        <span aria-hidden="true">{tr('Respeito', 'Respect')}</span>
        <span className={`mono ${styles.respValue}`} aria-hidden="true">
          {fmt(s.resp)}
        </span>
      </span>
    </Link>
  );
}
