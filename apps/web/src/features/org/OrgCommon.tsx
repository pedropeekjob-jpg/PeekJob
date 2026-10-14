import { Link } from 'react-router';
import { Icon } from '../../components/Icon';
import type { Org } from '../../data/orgs';
import { tr } from '../../i18n';
import { tagLabel } from '../../i18n/labels';
import { useStore } from '../../lib/store';
import { BigRing } from '../../components/Score';
import { salaryTotal, type OrgTab } from './org';
import styles from './OrgCommon.module.css';

/** Guardar / Guardada */
export function SaveButton({ org, large = false }: { org: Org; large?: boolean }) {
  const { saved, toggleSave } = useStore();
  const on = saved.includes(org.id);
  return (
    <button type="button" aria-pressed={on} onClick={() => toggleSave(org.id)} className={`btn lift ${large ? styles.saveLarge : styles.save}`}>
      <Icon name="bookmark" size={large ? 18 : 16} filled={on} />
      {on ? tr('Guardada', 'Saved') : tr('Guardar', 'Save')}
    </button>
  );
}

/** Avaliações · Entrevistas · Salários (com contagens no computador) */
export function OrgTabs({ org, tab, desktop }: { org: Org; tab: OrgTab; desktop: boolean }) {
  const items: [OrgTab, string, string, number][] = [
    ['avaliacoes', tr('Avaliações', 'Reviews'), `/org/${org.id}`, org.reviewsCount],
    ['entrevistas', tr('Entrevistas', 'Interviews'), `/org/${org.id}/entrevistas`, org.interviews.length],
    ['salarios', tr('Salários', 'Salaries'), `/org/${org.id}/salarios`, salaryTotal(org)],
  ];
  return (
    <nav aria-label={tr('Secções', 'Sections')} className={`tabs ${styles.tabs}`}>
      {items.map(([k, label, to, n]) => (
        <Link key={k} to={to} replace className={`tab ${styles.tab}`} aria-current={tab === k ? 'page' : undefined}>
          {label}
          {desktop && <span className={`mono ${styles.tabCount}`}>{n}</span>}
        </Link>
      ))}
    </nav>
  );
}

/** Locais: um só (morada) ou vários (escolher) */
export function LocationList({ org, active, onPick }: { org: Org; active: string; onPick: (id: string) => void }) {
  if (org.locations.length < 2) {
    const l = org.locations[0];
    if (!l) return null;
    return (
      <div className={`row ${styles.single}`}>
        <Icon name="pin" size={20} className={styles.pin} />
        <span className={styles.placeText}>
          <span className={styles.placeLabel}>{l.label}</span>
          <span className="small muted">{l.address}</span>
        </span>
      </div>
    );
  }
  return (
    <div role="radiogroup" aria-label={tr('Locais', 'Locations')} className="stack">
      {org.locations.map((l) => (
        <button key={l.id} type="button" role="radio" aria-checked={l.id === active} onClick={() => onPick(l.id)} className={`row ${styles.place}`}>
          <span aria-hidden="true" className={styles.radio} />
          <span className={styles.placeText}>
            <span className={styles.placeLabel}>{l.label}</span>
            <span className="small muted">{l.address}</span>
          </span>
        </button>
      ))}
    </div>
  );
}

/** O que dizem sobre respeito e inclusão (etiquetas com contagem) */
export function RespeitoTags({ org }: { org: Org }) {
  if (!org.respeitoTags.length) return <span className={`small ${styles.noTags}`}>{tr('Ainda sem etiquetas de respeito.', 'No respect tags yet.')}</span>;
  return (
    <ul className={`chips ${styles.respTags}`} aria-label={tr('O que dizem sobre respeito e inclusão', 'What people say about respect and inclusion')}>
      {org.respeitoTags.map((t) => (
        <li key={t.label} className={styles.respTag}>
          {tagLabel(t.label)}{' '}
          <span className={`mono ${styles.respCount}`} aria-label={tr(`${t.n} pessoas`, `${t.n} ${t.n === 1 ? 'person' : 'people'}`)}>
            {t.n}
          </span>
        </li>
      ))}
    </ul>
  );
}

/** Resposta da organização a uma avaliação */
export function OrgReply({ org, reviewId }: { org: Org; reviewId: string }) {
  const { replies } = useStore();
  const text = replies[reviewId];
  if (!text) return null;
  return (
    <div className={`stack ${styles.reply}`}>
      <span className={`small ${styles.replyFrom}`}>
        {tr('Resposta de', 'Reply from')} {org.name}
      </span>
      <span className={`body ${styles.replyText}`}>{text}</span>
    </div>
  );
}

/** 404 simpático da organização */
export function OrgNotFound({ id, desktop }: { id?: string; desktop: boolean }) {
  const searched = id ? <span className={`mono ${styles.searched}`}>{id}</span> : null;
  return (
    <div className={desktop ? 'container dpage' : 'page'}>
      <div className={`stack fade-up ${styles.notFound}`}>
        <BigRing value={0} size={desktop ? 120 : 96} muted ariaLabel={tr('Organização não encontrada', 'Organisation not found')}>
          <span className={styles.notFoundMark}>?</span>
        </BigRing>
        <h1 className="h1">{tr('Não encontrámos esta organização.', 'We couldn’t find this organisation.')}</h1>
        <p className="lead">
          {tr(
            <>Pode ter mudado de nome ou ainda não estar na PeekJob{searched ? <> (procurámos por {searched})</> : null}. Se trabalhas lá, podes ser a primeira pessoa a avaliar.</>,
            <>It may have changed its name or not be on PeekJob yet{searched ? <> (we searched for {searched})</> : null}. If you work there, you can be the first to review it.</>,
          )}
        </p>
        <div className={`row wrap ${styles.notFoundActions}`}>
          <Link to="/pesquisa" className="btn btn-primary">
            <Icon name="search" size={18} /> {tr('Procurar organizações', 'Search organisations')}
          </Link>
          <Link to="/avaliar" className="btn btn-ghost">
            {tr('Adicionar e avaliar', 'Add and review')}
          </Link>
        </div>
        <Link to="/ranking" className="link">
          {tr('Ver o ranking', 'See the ranking')} <Icon name="next" size={16} />
        </Link>
      </div>
    </div>
  );
}

/** Esqueleto enquanto a organização carrega */
export function OrgLoading() {
  return (
    <div className="page" role="status">
      <span className={`sk ${styles.skHead}`} />
      <span className={`sk ${styles.skBody}`} />
    </div>
  );
}
