import type { FormEvent } from 'react';
import { Ring } from '../../components/Data';
import { Icon } from '../../components/Icon';
import { MapView } from '../../components/MapView';
import { NifField } from '../../components/NifField';
import { ORG_TYPES, type Org, type OrgType } from '../../data/orgs';
import { tr } from '../../i18n';
import { orgTypeLabel } from '../../i18n/labels';
import styles from './OrgPicker.module.css';
import type { NewOrg } from './useAddOrg';

/** Caixa de pesquisa da organização */
export function OrgSearchBox({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <>
      <label htmlFor="eq" className="sr-only">
        {tr('Nome da organização', 'Organisation name')}
      </label>
      <div className={`search ${styles.search}`}>
        <Icon name="search" size={18} className={styles.searchIcon} />
        <input id="eq" type="search" autoComplete="off" value={value} onChange={(e) => onChange(e.target.value)} placeholder={tr('Empresa, associação, projeto…', 'Company, association, project…')} />
      </div>
    </>
  );
}

/** Lista de resultados. No computador: anel com a nota e seleção marcada; no telemóvel: inicial do nome */
export function OrgResults({ orgs, total, query, selectedId, desktop, onPick }: { orgs: Org[]; total: number; query: string; selectedId: string | null; desktop: boolean; onPick: (o: Org) => void }) {
  return (
    <div className={styles.results}>
      {desktop && (
        <span role="status" className={`small muted ${styles.count}`}>
          {query ? tr(`${total} resultado${total === 1 ? '' : 's'}`, `${total} result${total === 1 ? '' : 's'}`) : tr('Mais procuradas', 'Most searched')}
        </span>
      )}
      {orgs.map((o) => {
        const on = selectedId === o.id;
        return (
          <button key={o.id} type="button" className={desktop ? styles.rowDesktop : styles.row} aria-pressed={desktop ? on : undefined} onClick={() => onPick(o)}>
            {desktop ? (
              <Ring value={o.score} size={44} thickness={5} muted={!o.reviewsCount} label={o.reviewsCount ? undefined : tr('nova', 'new')} fontSize={o.reviewsCount ? 14 : 11} ariaLabel={o.reviewsCount ? undefined : tr('Ainda sem avaliações', 'No reviews yet')} />
            ) : (
              <span aria-hidden="true" className={styles.initial}>
                {o.name.charAt(0)}
              </span>
            )}
            <span className={styles.rowText}>
              <span className={styles.rowName}>{o.name}</span>
              <span className="small muted">
                {orgTypeLabel(o.type)} · {o.city}
              </span>
            </span>
            <Icon name={on && desktop ? 'check' : 'next'} size={18} className={on && desktop ? styles.chevronOn : styles.chevron} />
          </button>
        );
      })}
      {query && total === 0 && <div className={styles.empty}>{tr(<>Não encontrámos «{query}». Podes adicioná-la abaixo.</>, <>We couldn’t find “{query}”. You can add it below.</>)}</div>}
    </div>
  );
}

/** Escolha do local de trabalho (mapa + lista de rádio) */
export function LocationPicker({ org, active, desktop, onPick, onOther }: { org: Org; active: string | null; desktop: boolean; onPick: (id: string) => void; onOther: () => void }) {
  const n = org.locations.length;
  return (
    <div className={`fade-up ${styles.locations}`}>
      <div className={styles.locationsHead}>
        {desktop ? <h2 className={styles.h2}>{tr('Em que local trabalhas?', 'Which location do you work at?')}</h2> : <h1 className={styles.title}>{tr('Em que local?', 'Which location?')}</h1>}
        <span className="small muted">
          {desktop ? `${org.name} · ${n === 1 ? tr('1 local', '1 location') : tr(`${n} locais`, `${n} locations`)}` : tr('A avaliação fica ligada ao local, não a ti.', 'The review is linked to the location, not to you.')}
        </span>
      </div>
      <div className={styles.map}>
        <MapView locations={org.locations} active={active} onPick={onPick} height={desktop ? 300 : 130} showLink={desktop} />
      </div>
      <div role="radiogroup" aria-label={tr('Local de trabalho', 'Workplace')} className={styles.places}>
        {org.locations.map((l) => (
          <button key={l.id} type="button" role="radio" aria-checked={l.id === active} onClick={() => onPick(l.id)} className={`${styles.place} ${desktop ? 'lift' : ''}`}>
            <span className={styles.radio} />
            <span className={styles.placeText}>
              <span className={styles.rowName}>{l.label}</span>
              <span className="small muted">{l.address}</span>
            </span>
          </button>
        ))}
      </div>
      {!desktop && (
        <button type="button" className={`link ${styles.back}`} onClick={onOther}>
          {tr('Escolher outra organização', 'Choose another organisation')}
        </button>
      )}
    </div>
  );
}

/** Formulário de nova organização (com NIF confirmado no registo europeu) */
export function AddOrgForm({
  form,
  error,
  desktop,
  onChange,
  onSubmit,
  onBack,
}: {
  form: NewOrg;
  error: string;
  desktop: boolean;
  onChange: <K extends keyof NewOrg>(k: K, v: NewOrg[K]) => void;
  onSubmit: () => void;
  onBack: () => void;
}) {
  const submit = (e: FormEvent) => {
    e.preventDefault();
    onSubmit();
  };
  return (
    <form className={`fade-up ${styles.form}`} onSubmit={submit} noValidate>
      <div className={styles.formHead}>
        {desktop ? <h2 className={styles.h2}>{tr('Adicionar organização', 'Add organisation')}</h2> : <h1 className={styles.title}>{tr('Adicionar organização', 'Add organisation')}</h1>}
        <span className="small muted">
          {desktop ? tr('Confirmamos os dados antes de aparecer no ranking.', 'We check the details before it appears in the ranking.') : tr('Também associações, voluntariado e conta própria.', 'Associations, volunteering and self-employed too.')}
        </span>
      </div>
      <div className="field">
        <label htmlFor="nn" className={styles.fieldLabel}>
          {tr('Nome', 'Name')}
        </label>
        <input className="input" id="nn" type="text" value={form.name} onChange={(e) => onChange('name', e.target.value)} placeholder={tr('Ex.: Horta Comunitária da Sé', 'E.g. Horta Comunitária da Sé')} required aria-invalid={!!error && !form.name.trim()} />
      </div>
      <div className={styles.formGrid}>
        <div className="field">
          <label htmlFor="nt" className={styles.fieldLabel}>
            {tr('Tipo', 'Type')}
          </label>
          <select id="nt" className={`input ${styles.select}`} value={form.type} onChange={(e) => onChange('type', e.target.value as OrgType)}>
            {ORG_TYPES.map((t) => (
              <option key={t} value={t}>
                {orgTypeLabel(t)}
              </option>
            ))}
          </select>
        </div>
        <div className="field">
          <label htmlFor="na" className={styles.fieldLabel}>
            {desktop ? tr('Localidade', 'Town or city') : tr('Morada ou localidade', 'Address or town')}
          </label>
          <input className="input" id="na" type="text" value={form.city} onChange={(e) => onChange('city', e.target.value)} placeholder={tr('Ex.: Porto', 'E.g. Porto')} required aria-invalid={!!error && !form.city.trim()} />
        </div>
      </div>
      <NifField
        value={form.nif}
        onChange={(v) => onChange('nif', v)}
        required={form.type === 'Nome individual'}
        invalid={!!error && form.type === 'Nome individual'}
        onOfficial={(o) => {
          if (o.name) onChange('name', o.name);
          if (o.city) onChange('city', o.city);
        }}
      />
      {error && (
        <div role="alert" className={styles.formError}>
          {error}
        </div>
      )}
      <button type="button" className={`link ${styles.back}`} onClick={onBack}>
        {tr('Voltar à pesquisa', 'Back to search')}
      </button>
      <button type="submit" hidden />
    </form>
  );
}

/** Ilustração do estado vazio (computador): anéis e lupa */
export function PickIllustration() {
  return (
    <svg aria-hidden="true" viewBox="0 0 160 160" width="160" height="160">
      <circle cx="80" cy="80" r="62" fill="none" stroke="var(--line)" strokeWidth="10" />
      <circle cx="80" cy="80" r="62" fill="none" stroke="var(--teal)" strokeWidth="10" strokeDasharray="120 400" strokeLinecap="round" transform="rotate(-90 80 80)" />
      <circle cx="72" cy="72" r="22" fill="var(--surface)" stroke="var(--ink)" strokeWidth="7" />
      <path d="M88 88l18 18" stroke="var(--ink)" strokeWidth="8" strokeLinecap="round" />
      <circle cx="122" cy="34" r="8" fill="none" stroke="var(--purple)" strokeWidth="4" />
    </svg>
  );
}
