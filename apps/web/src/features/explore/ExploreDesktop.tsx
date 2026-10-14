import { useState, type CSSProperties, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Ring } from '../../components/Data';
import { Icon } from '../../components/Icon';
import { CRITERIA } from '../../data/criteria';
import { WEEK_TAGS } from '../../data/content';
import { ORG_BY_ID } from '../../data/orgs';
import { tr } from '../../i18n';
import { orgTypeLabel } from '../../i18n/labels';
import { useStore } from '../../lib/store';
import { useFlip } from '../../lib/useFlip';
import { useToggle } from '../../lib/useToggle';
import { MoreToggle } from '../../components/UI';
import { MAX_PREFS, prefsLine, prefsStatus, promises, pulseTicks, STARS, type Tick } from './explore';
import { useForYou, useMovers } from './useExplore';
import styles from './Explore.module.css';

function HeroSearch() {
  const navigate = useNavigate();
  const [q, setQ] = useState('');
  const onSearch = (e: FormEvent) => {
    e.preventDefault();
    const t = q.trim();
    navigate(t ? `/pesquisa?q=${encodeURIComponent(t)}` : '/pesquisa');
  };
  return (
    <form role="search" onSubmit={onSearch} className={`search ${styles.heroSearch}`}>
      <Icon name="search" size={20} className={styles.searchIcon} />
      <label htmlFor="hero-q" className="sr-only">
        {tr('Pesquisar organização', 'Search organisations')}
      </label>
      <input id="hero-q" type="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder={tr('Nome, setor ou cidade', 'Name, sector or city')} autoComplete="off" />
      <button type="submit" className={`btn btn-dark ${styles.searchButton}`}>
        {tr('Procurar', 'Search')}
      </button>
    </form>
  );
}

/** Anéis a flutuar com organizações de exemplo (decoração) */
function Stars() {
  return (
    <div aria-hidden="true" className={styles.stars}>
      <span className={styles.orbit} />
      {STARS.map((s) => {
        const org = ORG_BY_ID[s.id];
        if (!org) return null;
        return (
          <span key={`${s.id}-${s.size}`} className={`float ${styles.star}`} style={{ '--x': s.x, '--y': s.y, '--delay': s.delay } as CSSProperties}>
            <span className={styles.starRing}>
              <Ring value={s.value(org)} size={s.size} thickness={Math.max(8, Math.round(s.size * 0.09))} fontSize={Math.round(s.size * 0.24)} color={s.purple ? 'var(--purple)' : 'var(--teal)'} />
            </span>
            <span className={styles.starLabel} data-purple={s.purple || undefined}>
              {s.label?.() ?? org.name}
            </span>
          </span>
        );
      })}
    </div>
  );
}

function TickItem({ t, copy }: { t: Tick; copy: number }) {
  const inner = (
    <>
      <span className={styles.tickLabel}>{t.label}</span>
      <span className={`mono ${styles.tickDelta}`} data-up={t.up || undefined}>
        {t.d}
      </span>
    </>
  );
  // a segunda cópia só existe para a fita não ter fim; não conta para leitores de ecrã nem para o teclado
  const hidden = copy ? true : undefined;
  return t.to ? (
    <Link to={t.to} className={`plain row ${styles.tick}`} data-copy={copy} aria-hidden={hidden} tabIndex={copy ? -1 : undefined}>
      {inner}
    </Link>
  ) : (
    <span className={`row ${styles.tick} ${styles.tickTag}`} data-copy={copy} aria-hidden={hidden}>
      {inner}
    </span>
  );
}

/** Pulso da semana: fita contínua (pára com o rato ou o foco; com "reduzir movimento" fica parada) */
function PulseTicker() {
  const { ups, downs } = useMovers();
  const ticks = pulseTicks(ups, downs, WEEK_TAGS);
  return (
    <section aria-label={tr('Pulso da semana', 'This week’s pulse')} className={`row ${styles.pulse}`}>
      <span className={styles.pulseTitle}>{tr('Esta semana', 'This week')}</span>
      <div className={`grow ${styles.tickWrap}`}>
        <div className={styles.ticker}>
          {[0, 1].map((copy) => ticks.map((t) => <TickItem key={copy + t.key} t={t} copy={copy} />))}
        </div>
      </div>
      <Link to="/ranking" className={`link ${styles.small14}`}>
        Ranking →
      </Link>
    </section>
  );
}

/** Escolher até 3 prioridades aqui mesmo; a lista reordena-se com animação */
function PrefPicker() {
  const { prefs, togglePref } = useStore();
  const n = prefs.length;
  return (
    <div role="group" aria-label={tr('O que valorizas, até 3', 'What you value, up to 3')} className={`row wrap ${styles.prefs}`}>
      {CRITERIA.map((c) => {
        const i = prefs.indexOf(c.key);
        const on = i !== -1;
        const full = !on && n >= MAX_PREFS;
        return (
          <button
            key={c.key}
            type="button"
            aria-pressed={on}
            aria-disabled={full || undefined}
            title={full ? tr('Já escolheste 3. Tira uma para trocar.', 'You’ve picked 3. Remove one to swap.') : c.hint}
            onClick={() => togglePref(c.key)}
            className={`row ${styles.pref}`}
            data-respeito={c.key === 'respeito' || undefined}
            style={{ '--c': c.color } as CSSProperties}
          >
            <span aria-hidden="true" className={styles.prefNum}>
              {on ? i + 1 : ''}
            </span>
            {c.label}
            {on && <span className="sr-only">{tr(`, prioridade ${i + 1}`, `, priority ${i + 1}`)}</span>}
          </button>
        );
      })}
      <span aria-live="polite" className={`small muted ${styles.prefsStatus}`}>
        {prefsStatus(n)}
      </span>
    </div>
  );
}

/** O que valorizas numa linha; escolher fica a um clique (as 8 opções só aparecem quando se pedem) */
function PrefsSummary() {
  const { prefs } = useStore();
  const [open, toggle] = useToggle();
  return (
    <div className={styles.prefsSummary}>
      <div className={`row wrap ${styles.prefsLine}`}>
        <span className="small muted">{prefsLine(prefs)}</span>
        <MoreToggle open={open} onToggle={toggle} label={tr('Mudar', 'Change')} openLabel={tr('Fechar', 'Close')} controls="prefs-picker" />
      </div>
      {open && (
        <div id="prefs-picker" className="fade-up">
          <PrefPicker />
        </div>
      )}
    </div>
  );
}

function ForYou() {
  const list = useForYou().slice(0, 4);
  const flip = useFlip(list.map((x) => x.org.id).join('|'));
  return (
    <section className={styles.forYou} aria-labelledby="para-ti-d">
      <div className={`row wrap between ${styles.forYouHead}`}>
        <h2 id="para-ti-d" className={`display ${styles.forYouTitle}`}>
          {tr('Para ti', 'For you')}
        </h2>
      </div>
      <PrefsSummary />
      <div className={styles.grid}>
        {list.map(({ org, match }) => (
          <Link key={org.id} ref={flip(org.id)} to={`/org/${org.id}`} data-ev="select_org" data-ev-org-type={org.type} className={`plain card lift row ${styles.gridCard}`}>
            <Ring value={org.score} size={60} thickness={6} fontSize={18} />
            <span className={`grow ${styles.gridText}`}>
              <span className={`ellipsis ${styles.gridName}`}>{org.name}</span>
              <span className="small muted">
                {orgTypeLabel(org.type)} · {org.city}
              </span>
            </span>
            <span className={`pill pill-match ${styles.gridPill}`}>{tr(`${match}% para ti`, `${match}% for you`)}</span>
          </Link>
        ))}
      </div>
      <Link to="/pesquisa" className={`link ${styles.start} ${styles.small15}`}>
        {tr('Ver mais organizações →', 'Show more organisations →')}
      </Link>
    </section>
  );
}

function NotForSale() {
  return (
    <section className={`row wrap ${styles.promise}`}>
      <div className={styles.promiseHead}>
        <h2 className={`display ${styles.promiseTitle}`}>{tr('A nota não está à venda.', 'The score is not for sale.')}</h2>
        <Link to="/metodologia" className={`link ${styles.promiseLink}`}>
          {tr('Ver como calculamos →', 'See how we score →')}
        </Link>
      </div>
      <ul className={styles.promiseList}>
        {promises().map((p) => (
          <li key={p.t} className={`row ${styles.promiseItem}`}>
            <span aria-hidden="true" className={styles.promiseDot} data-purple={p.purple || undefined} />
            <span className={styles.promiseText}>
              <span className={styles.strong}>{p.t}</span>
              <span className={styles.promiseNote}> — {p.d}</span>
            </span>
          </li>
        ))}
      </ul>
    </section>
  );
}

/** Computador: topo com pesquisa, pulso da semana, para ti (com as prioridades) e a promessa */
export function ExploreDesktop() {
  return (
    <div className={`container ${styles.container}`}>
      <section className={`row wrap ${styles.hero}`}>
        <div className={styles.heroText}>
          <h1 className={`display ${styles.heroTitle}`}>{tr('Como é trabalhar lá dentro, contado por quem lá trabalha.', 'What it’s like to work there, told by the people who do.')}</h1>
          <p className={`body ${styles.heroLead}`}>{tr('Avaliações anónimas de PME, associações e voluntariado.', 'Anonymous reviews of SMEs, associations and volunteering.')}</p>
          <HeroSearch />
        </div>
        <Stars />
      </section>
      <PulseTicker />
      <ForYou />
      <NotForSale />
    </div>
  );
}
