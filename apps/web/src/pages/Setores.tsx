import { Link } from 'react-router-dom';
import { Icon } from '../components/Icon';
import { Shell } from '../components/Layout';
import { rankingHref } from '../features/sectors/sectors';
import { SectorRow, SectorSortToggle, TypeCard } from '../features/sectors/SectorsParts';
import styles from '../features/sectors/Sectors.module.css';
import { useSectors } from '../features/sectors/useSectors';
import { tr } from '../i18n';
import { orgTypeLabel } from '../i18n/labels';
import { plural } from '../lib/format';
import { useIsDesktop } from '../lib/useMedia';

/** Tipos de organização e setores, com ligações ao ranking filtrado */
export default function Setores() {
  const desktop = useIsDesktop();
  const { types, sectors, type, sort, setSort, toggleType, clearType } = useSectors();

  return (
    <Shell nav>
      <div className={desktop ? `container ${styles.container}` : `page ${styles.page}`}>
        <div className={`zone zone-band ${styles.head}`}>
          <h1 className={`h1 ${styles.title}`}>{tr('Encontra o teu tipo de lugar.', 'Find your kind of place.')}</h1>
          <p className={`lead ${styles.lead}`}>{tr('Escolhe um tipo e compara os setores.', 'Pick a type and compare sectors.')}</p>
        </div>

        <section aria-labelledby="t-tipos" className={styles.types}>
          <h2 id="t-tipos" className={`h2 ${styles.h2}`}>
            {tr('Tipo de organização', 'Type of organisation')}
          </h2>
          <div role="group" aria-label={tr('Tipo de organização', 'Type of organisation')} className={`grid-auto ${styles.typeGrid}`}>
            {types.map((c) => (
              <TypeCard key={c.t} {...c} on={type === c.t} desktop={desktop} onToggle={toggleType} />
            ))}
          </div>
          <div className={`row wrap ${styles.typeActions}`}>
            <Link to={rankingHref(type)} className={`btn btn-dark ${styles.rankingLink}`}>
              {tr('Ver ranking', 'View ranking')} · {type ? orgTypeLabel(type) : tr('todos os tipos', 'all types')} <Icon name="next" size={18} />
            </Link>
            {type && (
              <button type="button" className={`btn btn-ghost ${styles.allTypes}`} onClick={clearType}>
                {tr('Mostrar todos os tipos', 'Show all types')}
              </button>
            )}
          </div>
        </section>

        <section aria-labelledby="t-setores" className={styles.sectors}>
          <div className={`row wrap between ${styles.sectorsHead}`}>
            <div className={`row wrap ${styles.sectorsTitle}`}>
              <h2 id="t-setores" className={`h2 ${styles.h2}`}>
                {tr('Setores', 'Sectors')}
              </h2>
              <span aria-live="polite" className="small muted">
                {type ? tr(`${sectors.length} com ${type}`, `${sectors.length} with ${orgTypeLabel(type)}`) : plural(sectors.length, tr('setor', 'sector'), tr('setores', 'sectors'))}
              </span>
            </div>
            <SectorSortToggle sort={sort} desktop={desktop} onChange={setSort} />
          </div>

          {sectors.length === 0 ? (
            <div className={`body ${styles.empty}`}>{tr('Ainda não há organizações deste tipo com avaliações.', 'No organisations of this type have reviews yet.')}</div>
          ) : (
            <div className={styles.list}>
              {sectors.map((s) => (
                <SectorRow key={s.name} s={s} type={type} />
              ))}
            </div>
          )}
        </section>
      </div>
    </Shell>
  );
}
