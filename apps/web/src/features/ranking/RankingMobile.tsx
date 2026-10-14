import { memo, useCallback, useState } from 'react';
import { Link } from 'react-router';
import { Ring } from '../../components/Data';
import { Icon } from '../../components/Icon';
import { Sheet, Switch } from '../../components/UI';
import { tr } from '../../i18n';
import type { Org } from '../../data/orgs';
import { orgTypeLabel } from '../../i18n/labels';
import { fmt, plural } from '../../lib/format';
import { countLine, filterChips, trendInfo, VERIFIED_MIN, type RankedRow } from './ranking';
import { EmptyFilters, FilterGroups, SetorChip, SortToggle } from './RankingControls';
import type { RankingFilters } from './useRanking';
import styles from './RankingMobile.module.css';

/** Uma linha do ranking (memo: ao mudar a ordem só correm as linhas cuja posição ou compatibilidade mudou) */
const RankingItem = memo(function RankingItem({ org, match, position }: { org: Org; match: number; position: number }) {
  const t = trendInfo(org.trend);
  return (
    <Link to={`/org/${org.id}`} data-ev="select_org" data-ev-org-type={org.type} className={`plain row ${styles.item}`}>
      <span className={styles.position}>
        <span className={`num ${styles.positionNum}`} data-top={position <= 3 || undefined}>
          {position}
        </span>
        <span className={`mono ${styles.trend}`} data-trend={t.kind} aria-label={t.aria}>
          {t.text}
        </span>
      </span>
      <Ring value={org.score} size={46} inner="var(--ground)" fontSize={14} ariaLabel={tr(`Nota ${fmt(org.score)} de 5, ${org.reviewsCount} avaliações`, `Score ${fmt(org.score)} out of 5, ${org.reviewsCount} reviews`)} />
      <span className={`grow ${styles.text}`}>
        <span className={`ellipsis ${styles.name}`}>{org.name}</span>
        <span className="small muted ellipsis">
          {orgTypeLabel(org.type)} · {plural(org.people, tr('pessoa', 'person'), tr('pessoas', 'people'))}
        </span>
      </span>
      <span className={styles.match}>
        <span className={`num ${styles.matchNum}`}>{match}%</span>
        <span className={styles.matchLabel}>{tr('para ti', 'for you')}</span>
      </span>
    </Link>
  );
});

/** Telemóvel: ordem, chips de resumo que abrem a folha de filtros, e a lista */
export function RankingMobile({ ranked, F }: { ranked: RankedRow[]; F: RankingFilters }) {
  const [open, setOpen] = useState(false);
  const openSheet = useCallback(() => setOpen(true), []);
  const closeSheet = useCallback(() => setOpen(false), []);
  const chips = filterChips(F.f);
  return (
    <div className={`page ${styles.page}`}>
      <div className={`row between zone zone-band ${styles.head}`}>
        <h1 className="h1">Ranking</h1>
        <Link to="/metodologia" className={`link ${styles.how}`}>
          {tr('Como calculamos', 'How we score')}
        </Link>
      </div>

      <SortToggle F={F} />

      <div className="chips">
        {chips.map((c) => (
          <button key={c.aria} type="button" className={`chip ${styles.chip}`} aria-label={tr(`${c.aria}. Abrir filtros`, `${c.aria}. Open filters`)} onClick={openSheet}>
            {c.text}
          </button>
        ))}
        <SetorChip F={F} />
        <button
          type="button"
          className={`icon-btn ${styles.filters}`}
          data-active={F.active > 0 || undefined}
          aria-label={F.active ? tr(`Filtros, ${F.active} activos`, `Filters, ${F.active} active`) : tr('Mais filtros', 'More filters')}
          onClick={openSheet}
        >
          <Icon name="filter" size={16} />
        </button>
      </div>

      <div className="stack">
        <span className={`small muted ${styles.count}`} aria-live="polite">
          {countLine(ranked.length)}
        </span>
        {ranked.length === 0 ? <EmptyFilters F={F} /> : ranked.map((row, i) => <RankingItem key={row.org.id} org={row.org} match={row.match} position={i + 1} />)}
      </div>

      <Sheet
        open={open}
        onClose={closeSheet}
        title={tr('Filtros', 'Filters')}
        footer={
          <div className={styles.sheetFoot}>
            <button type="button" className={`btn btn-dark btn-block ${styles.sheetShow}`} onClick={closeSheet}>
              {tr('Ver', 'Show')} {plural(ranked.length, tr('organização', 'organisation'), tr('organizações', 'organisations'))}
            </button>
            {F.active > 0 && (
              <button type="button" className={`link ${styles.sheetClear}`} onClick={F.clear}>
                {tr('Limpar', 'Clear')}
              </button>
            )}
          </div>
        }
      >
        <div className={styles.sheetBody}>
          {F.f.setor && (
            <div className="chips">
              <SetorChip F={F} />
            </div>
          )}
          <FilterGroups F={F} />
          <div className={`list ${styles.switches}`}>
            <Switch
              purple
              checked={F.f.resp}
              onChange={(v) => F.write({ resp: v })}
              label={tr('Respeito e inclusão 4 ou mais', 'Respect and inclusion 4 or more')}
              hint={tr('Direitos, diversidade, sem assédio', 'Rights, diversity, no harassment')}
            />
            <Switch
              checked={F.f.ver}
              onChange={(v) => F.write({ ver: v })}
              label={tr('Só avaliações verificadas', 'Verified reviews only')}
              hint={tr(`Email, contrato ou recibo (${VERIFIED_MIN}% ou mais)`, `Work email, contract or payslip (${VERIFIED_MIN}% or more)`)}
            />
          </div>
        </div>
      </Sheet>
    </div>
  );
}
