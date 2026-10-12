import { useMemo, useState, type FormEvent } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Shell } from '../components/Layout';
import { Icon } from '../components/Icon';
import { Ring } from '../components/Data';
import { MapView } from '../components/MapView';
import { useOrg, useOrgs, useSearch } from '../api/orgs';
import { ORG_TYPES, type Org, type OrgType } from '../data/orgs';
import { useStore } from '../lib/store';
import { useIsDesktop } from '../lib/useMedia';
import { DeskSteps, DISPLAY, FlowHead, LockLine } from './Avaliar.parts';
import { useSearchTracking } from '../analytics/useSearchTracking';
import { tr } from '../i18n';
import { orgTypeLabel } from '../i18n/labels';

type Step = 'pick' | 'confirm' | 'add';

export default function AvaliarEscolher() {
  const desktop = useIsDesktop();
  const nav = useNavigate();
  const [params] = useSearchParams();
  const orgs = useOrgs();
  const { draft, startDraft, addOrg, updateDraft } = useStore();

  // Pré-selecção: ?org= ou o rascunho actual
  const initialId = params.get('org') ?? draft.orgId;
  const initialOrg = initialId ? orgs.find((o) => o.id === initialId) : undefined;

  const [q, setQ] = useState('');
  const [step, setStep] = useState<Step>(initialOrg ? 'confirm' : 'pick');
  const [chosenId, setChosenId] = useState<string | null>(initialOrg?.id ?? null);
  const [locId, setLocId] = useState<string | null>(
    initialOrg ? (initialOrg.id === draft.orgId && draft.locationId ? draft.locationId : initialOrg.locations[0]?.id ?? null) : null,
  );
  const [addName, setAddName] = useState('');
  const [addType, setAddType] = useState<OrgType>('PME');
  const [addCity, setAddCity] = useState('');
  const [addError, setAddError] = useState('');

  const chosen = useOrg(chosenId);
  const nq = q.trim();
  const search = useSearch(nq, { includePending: true });
  useSearchTracking('avaliar', nq, search.items.length, search.loading);
  const results = useMemo(
    () => (nq ? search.items : [...orgs].sort((a, b) => b.reviewsCount - a.reviewsCount)),
    [orgs, nq, search.items],
  );
  const [busy, setBusy] = useState(false);
  // o local escolhido tem de existir na organização (em modo API os locais chegam depois)
  const effectiveLoc = chosen && chosen.locations.some((l) => l.id === locId) ? locId : chosen?.locations[0]?.id ?? null;
  const list = results.slice(0, desktop ? 5 : nq ? 6 : 4);

  const pick = (o: Org) => {
    setChosenId(o.id);
    setLocId(o.id === draft.orgId && draft.locationId ? draft.locationId : o.locations[0]?.id ?? null);
    setStep('confirm');
  };
  const startAdd = () => {
    setAddName(nq || addName);
    setAddError('');
    setStep('add');
  };
  const onQ = (v: string) => {
    setQ(v);
    if (step === 'confirm' && desktop) setStep('pick');
  };

  const next = async (e?: FormEvent) => {
    e?.preventDefault();
    if (busy) return;
    if (step === 'confirm' && chosen) {
      startDraft(chosen.id, effectiveLoc);
      nav('/avaliar/verificar');
    } else if (step === 'add') {
      if (!addName.trim() || !addCity.trim()) {
        setAddError(!addName.trim() ? tr('Escreve o nome da organização.', 'Enter the organisation’s name.') : tr('Escreve a localidade.', 'Enter the town or city.'));
        return;
      }
      setBusy(true);
      const r = await addOrg({ name: addName.trim(), type: addType, city: addCity.trim() });
      setBusy(false);
      if (!r.ok) {
        setAddError(r.status === 401 ? tr('Entra primeiro para adicionar uma organização.', 'Sign in first to add an organisation.') : r.message);
        return;
      }
      updateDraft({ locationId: 'sede' });
      nav('/avaliar/verificar');
    }
  };
  const nextLabel = step === 'add' ? tr('Adicionar e continuar', 'Add and continue') : tr('Continuar', 'Continue');

  /* ---------- Blocos ---------- */

  const searchBox = (
    <>
      <label htmlFor="eq" className="sr-only">
        {tr('Nome da organização', 'Organisation name')}
      </label>
      <div className="search" style={desktop ? { height: 58, padding: '0 18px', borderColor: 'var(--field)' } : { height: 56 }}>
        <Icon name="search" size={18} style={{ color: 'var(--muted)', flex: 'none' }} />
        <input id="eq" type="search" autoComplete="off" value={q} onChange={(e) => onQ(e.target.value)} placeholder={tr('Empresa, associação, projeto…', 'Company, association, project…')} />
      </div>
    </>
  );

  const resultsList = (
    <div className="stack">
      {desktop && (
        <span role="status" className="small muted" style={{ paddingBottom: 6 }}>
          {nq ? tr(`${results.length} resultado${results.length === 1 ? '' : 's'}`, `${results.length} result${results.length === 1 ? '' : 's'}`) : tr('Mais procuradas', 'Most searched')}
        </span>
      )}
      {list.map((o) => {
        const on = step === 'confirm' && chosenId === o.id;
        return desktop ? (
          <button
            key={o.id}
            type="button"
            className="esc-row"
            aria-pressed={on}
            onClick={() => pick(o)}
            style={{
              display: 'flex', alignItems: 'center', gap: 14, minHeight: 64, padding: '8px 12px', margin: '0 -12px', border: 0, borderRadius: 16,
              background: on ? 'var(--teal-tint)' : 'transparent', textAlign: 'left',
            }}
          >
            <Ring value={o.score} size={44} thickness={5} muted={!o.reviewsCount} label={o.reviewsCount ? undefined : tr('nova', 'new')} fontSize={o.reviewsCount ? 14 : 11} ariaLabel={o.reviewsCount ? undefined : tr('Ainda sem avaliações', 'No reviews yet')} />
            <span className="grow stack" style={{ gap: 2 }}>
              <span style={{ fontSize: 16, fontWeight: 600 }}>{o.name}</span>
              <span className="small muted">
                {orgTypeLabel(o.type)} · {o.city}
              </span>
            </span>
            <Icon name={on ? 'check' : 'next'} size={18} style={{ color: on ? 'var(--teal-dark)' : 'var(--grey)', flex: 'none' }} />
          </button>
        ) : (
          <button
            key={o.id}
            type="button"
            className="esc-row"
            onClick={() => pick(o)}
            style={{ display: 'flex', alignItems: 'center', gap: 14, minHeight: 64, padding: '0 4px', border: 0, borderBottom: '1px solid var(--line)', background: 'transparent', textAlign: 'left' }}
          >
            <span
              aria-hidden="true"
              style={{ flex: 'none', width: 40, height: 40, borderRadius: 20, border: '3px solid var(--teal)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: 15 }}
            >
              {o.name.charAt(0)}
            </span>
            <span className="grow stack" style={{ gap: 2 }}>
              <span style={{ fontSize: 16, fontWeight: 600 }}>{o.name}</span>
              <span className="small muted">
                {orgTypeLabel(o.type)} · {o.city}
              </span>
            </span>
            <Icon name="next" size={18} style={{ color: 'var(--grey)', flex: 'none' }} />
          </button>
        );
      })}
      {nq && results.length === 0 && (
        <div style={{ padding: '12px 0', fontSize: 15, lineHeight: 1.5, color: 'var(--body)' }}>{tr(<>Não encontrámos «{nq}». Podes adicioná-la abaixo.</>, <>We couldn’t find “{nq}”. You can add it below.</>)}</div>
      )}
    </div>
  );

  const locPicker = chosen && (
    <div className="stack fade-up" style={{ gap: 20 }}>
      <div className="stack" style={{ gap: desktop ? 6 : 8 }}>
        {desktop ? (
          <h2 style={{ ...DISPLAY, fontSize: 24, lineHeight: 1.1 }}>{tr('Em que local trabalhas?', 'Which location do you work at?')}</h2>
        ) : (
          <h1 style={{ ...DISPLAY, fontSize: 32, lineHeight: 1.05 }}>{tr('Em que local?', 'Which location?')}</h1>
        )}
        <span className="small muted">
          {desktop ? `${chosen.name} · ${chosen.locations.length === 1 ? tr('1 local', '1 location') : tr(`${chosen.locations.length} locais`, `${chosen.locations.length} locations`)}` : tr('A avaliação fica ligada ao local, não a ti.', 'The review is linked to the location, not to you.')}
        </span>
      </div>
      <div style={desktop ? { background: 'var(--surface)', borderRadius: 24, padding: 8 } : undefined}>
        <MapView locations={chosen.locations} active={effectiveLoc} onPick={setLocId} height={desktop ? 300 : 130} showLink={desktop} />
      </div>
      <div
        role="radiogroup"
        aria-label={tr('Local de trabalho', 'Workplace')}
        style={desktop ? { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(min(250px, 100%), 1fr))', gap: 12 } : { display: 'flex', flexDirection: 'column' }}
      >
        {chosen.locations.map((l) => {
          const on = l.id === effectiveLoc;
          return (
            <button
              key={l.id}
              type="button"
              role="radio"
              aria-checked={on}
              onClick={() => setLocId(l.id)}
              className={desktop ? 'lift' : undefined}
              style={
                desktop
                  ? { display: 'flex', alignItems: 'center', gap: 14, minHeight: 68, padding: '0 18px', borderRadius: 18, border: `2px solid ${on ? 'var(--teal)' : 'var(--line)'}`, background: on ? 'var(--teal-tint)' : 'var(--surface)', textAlign: 'left' }
                  : { display: 'flex', alignItems: 'center', gap: 14, minHeight: 64, padding: '0 4px', border: 0, borderBottom: '1px solid var(--line)', background: 'transparent', textAlign: 'left' }
              }
            >
              <span style={{ flex: 'none', width: 22, height: 22, borderRadius: 11, border: `3px solid ${on ? 'var(--ink)' : 'var(--grey)'}`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <span style={{ width: 8, height: 8, borderRadius: 4, background: on ? 'var(--teal)' : 'transparent' }} />
              </span>
              <span className="stack" style={{ gap: 2 }}>
                <span style={{ fontSize: 16, fontWeight: 600 }}>{l.label}</span>
                <span className="small muted">{l.address}</span>
              </span>
            </button>
          );
        })}
      </div>
      {!desktop && (
        <button type="button" className="link" style={{ alignSelf: 'flex-start', fontWeight: 500, fontSize: 15 }} onClick={() => setStep('pick')}>
          {tr('Escolher outra organização', 'Choose another organisation')}
        </button>
      )}
    </div>
  );

  const addForm = (
    <form className="stack fade-up" style={{ gap: desktop ? 18 : 20 }} onSubmit={next} noValidate>
      <div className="stack" style={{ gap: desktop ? 6 : 8 }}>
        {desktop ? <h2 style={{ ...DISPLAY, fontSize: 24, lineHeight: 1.1 }}>{tr('Adicionar organização', 'Add organisation')}</h2> : <h1 style={{ ...DISPLAY, fontSize: 32, lineHeight: 1.05 }}>{tr('Adicionar organização', 'Add organisation')}</h1>}
        <span className="small muted">{desktop ? tr('Confirmamos os dados antes de aparecer no ranking.', 'We check the details before it appears in the ranking.') : tr('Também associações, voluntariado e conta própria.', 'Associations, volunteering and self-employed too.')}</span>
      </div>
      <div className="field">
        <label htmlFor="nn" style={{ fontSize: 13, color: 'var(--body)' }}>
          {tr('Nome', 'Name')}
        </label>
        <input className="input" id="nn" type="text" value={addName} onChange={(e) => setAddName(e.target.value)} placeholder={tr('Ex.: Horta Comunitária da Sé', 'E.g. Horta Comunitária da Sé')} required aria-invalid={!!addError && !addName.trim()} />
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: desktop ? 'repeat(auto-fill, minmax(min(220px, 100%), 1fr))' : '1fr', gap: desktop ? 16 : 20 }}>
        <div className="field">
          <label htmlFor="nt" style={{ fontSize: 13, color: 'var(--body)' }}>
            {tr('Tipo', 'Type')}
          </label>
          <select id="nt" className="input" value={addType} onChange={(e) => setAddType(e.target.value as OrgType)} style={{ paddingLeft: 12 }}>
            {ORG_TYPES.map((t) => (
              <option key={t} value={t}>{orgTypeLabel(t)}</option>
            ))}
          </select>
        </div>
        <div className="field">
          <label htmlFor="na" style={{ fontSize: 13, color: 'var(--body)' }}>
            {desktop ? tr('Localidade', 'Town or city') : tr('Morada ou localidade', 'Address or town')}
          </label>
          <input className="input" id="na" type="text" value={addCity} onChange={(e) => setAddCity(e.target.value)} placeholder={tr('Ex.: Porto', 'E.g. Porto')} required aria-invalid={!!addError && !addCity.trim()} />
        </div>
      </div>
      {addError && (
        <div role="alert" style={{ fontSize: 14, color: 'var(--warn-text)' }}>
          {addError}
        </div>
      )}
      <button type="button" className="link" style={{ alignSelf: 'flex-start', fontWeight: desktop ? 600 : 500, fontSize: 15 }} onClick={() => setStep('pick')}>
        {tr('Voltar à pesquisa', 'Back to search')}
      </button>
      <button type="submit" hidden />
    </form>
  );

  const rowHover = <style>{`.esc-row{transition:background .15s;color:var(--ink)}.esc-row:hover{background:${desktop ? 'var(--surface)' : '#EEF1F1'}}.esc-row[aria-pressed='true']:hover{background:var(--teal-tint)}`}</style>;

  /* ---------- Desktop ---------- */
  if (desktop) {
    return (
      <Shell chrome="header">
        {rowHover}
        <div className="container" style={{ paddingBottom: 80 }}>
          <DeskSteps
            current={1}
            right={
              <button type="button" className="row" onClick={() => nav('/')} style={{ height: 44, gap: 8, border: 0, background: 'none', fontSize: 15, fontWeight: 500, color: 'var(--body)' }}>
                <Icon name="close" size={18} />
                {tr('Cancelar', 'Cancel')}
              </button>
            }
          />
          <div className="row wrap" style={{ gap: 64, alignItems: 'flex-start', paddingTop: 48 }}>
            <section aria-label={tr('Pesquisar organização', 'Search organisations')} className="stack" style={{ flex: '1 1 380px', minWidth: 0, gap: 20 }}>
              <div className="stack" style={{ gap: 12 }}>
                <h1 style={{ ...DISPLAY, fontSize: 52, lineHeight: 1, letterSpacing: '-0.01em' }}>{tr('Onde trabalhas?', 'Where do you work?')}</h1>
                <p className="lead" style={{ fontSize: 16 }}>
                  {tr('Ninguém fica a saber que foste tu.', 'No one will know it was you.')}
                </p>
              </div>
              {searchBox}
              {resultsList}
              <button type="button" className="lift row" onClick={startAdd} style={{ alignSelf: 'flex-start', gap: 10, minHeight: 48, padding: '0 4px', border: 0, background: 'transparent', fontSize: 15, fontWeight: 600, color: 'var(--teal-dark)' }}>
                <span style={{ flex: 'none', width: 28, height: 28, borderRadius: 14, border: '3px solid var(--teal)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Icon name="plus" size={14} stroke={2.4} />
                </span>
                {tr('Adicionar organização que não está cá', 'Add an organisation that isn’t listed')}
              </button>
            </section>

            <section aria-live="polite" className="stack" style={{ flex: '1.35 1 520px', minWidth: 0, gap: 24 }}>
              {step === 'pick' && (
                <div className="fade-up stack" style={{ minHeight: 380, alignItems: 'center', justifyContent: 'center', gap: 20, textAlign: 'center' }}>
                  <PickIllustration />
                  <h2 style={{ ...DISPLAY, fontSize: 24, lineHeight: 1.15 }}>{tr('Escolhe a organização à esquerda', 'Choose the organisation on the left')}</h2>
                </div>
              )}
              {step === 'confirm' && locPicker}
              {step === 'add' && addForm}
              <div className="row wrap between" style={{ gap: 16, paddingTop: 20, borderTop: '1px solid var(--line)' }}>
                <LockLine>{tr('A avaliação fica ligada ao local, não a ti.', 'The review is linked to the location, not to you.')}</LockLine>
                {step === 'pick' ? (
                  <button type="button" className="btn" disabled style={{ height: 56, padding: '0 28px' }}>
                    {tr('Escolhe uma organização', 'Choose an organisation')}
                  </button>
                ) : (
                  <button type="button" className="btn btn-primary lift" onClick={() => next()} style={{ height: 56, padding: '0 28px' }}>
                    {nextLabel} <Icon name="next" size={18} stroke={2} />
                  </button>
                )}
              </div>
            </section>
          </div>
        </div>
      </Shell>
    );
  }

  /* ---------- Mobile ---------- */
  return (
    <Shell>
      {rowHover}
      <div className="page no-nav" style={{ minHeight: '100dvh', paddingBottom: 0 }}>
        <FlowHead icon="close" label={tr('Fechar', 'Close')} onClick={() => nav('/')} right={<span className="small muted">{tr('Antes de começar', 'Before you start')}</span>} />

        {step === 'pick' && (
          <div className="stack fade-up" style={{ gap: 20 }}>
            <h1 style={{ ...DISPLAY, fontSize: 32, lineHeight: 1.05 }}>{tr('Onde trabalhas ou trabalhaste?', 'Where do you or did you work?')}</h1>
            {searchBox}
            {resultsList}
            <button type="button" className="link" style={{ alignSelf: 'flex-start', fontSize: 15 }} onClick={startAdd}>
              {tr('Não encontras? Adicionar organização', 'Can’t find it? Add organisation')}
            </button>
          </div>
        )}
        {step === 'confirm' && locPicker}
        {step === 'add' && addForm}

        {step !== 'pick' && (
          <div className="sticky-cta">
            <button type="button" className="btn btn-primary btn-block" style={{ height: 56 }} onClick={() => next()}>
              {nextLabel}
            </button>
          </div>
        )}
      </div>
    </Shell>
  );
}

/** Ilustração do estado vazio (desktop): anéis e lupa */
function PickIllustration() {
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
