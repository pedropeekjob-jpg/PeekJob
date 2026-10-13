import type { CSSProperties } from 'react';
import { Link } from 'react-router-dom';
import { Icon } from '../../components/Icon';
import { Accordion } from '../../components/UI';
import { SUPPORT } from '../../data/content';
import { tr } from '../../i18n';
import type { SupportMessage } from '../../lib/store';
import { DISCLAIMER, noticeTitle, tips } from './support';
import styles from './Support.module.css';

type Entity = (typeof SUPPORT)[number];
const callLabel = (o: Entity) => tr(`Ligar para ${o.name}, ${o.phone}`, `Call ${o.name}, ${o.phone}`);

export function PrivateBadge() {
  return (
    <span className={`row ${styles.badge}`}>
      <Icon name="lock" size={12} stroke={2.2} />
      {tr('Só tu vês esta mensagem', 'Only you can see this message')}
    </span>
  );
}

export function Found({ text }: { text: string | null }) {
  return text ? <p className={styles.found}>{text}</p> : null;
}

/** O que pode ajudar (acordeão) */
export function Tips({ desktop }: { desktop: boolean }) {
  return (
    <Accordion
      items={[
        {
          title: <span className={styles.tipsTitle}>{tr('O que pode ajudar', 'What can help')}</span>,
          body: (
            <ul className={styles.tips}>
              {tips(desktop).map((t) => (
                <li key={t} className={`row ${styles.tip}`}>
                  <span aria-hidden="true" className={styles.tipDot} />
                  {t}
                </li>
              ))}
            </ul>
          ),
        },
      ]}
    />
  );
}

/** Avisos da moderação: avaliação removida (com o motivo) ou resultado de uma denúncia */
export function ModerationNotices({ notices }: { notices: SupportMessage[] }) {
  if (!notices.length) return null;
  return (
    <section aria-labelledby="mod-notices" className={styles.notices}>
      <h2 id="mod-notices" className={styles.noticesTitle}>
        {tr('Avisos da moderação', 'Moderation notices')}
      </h2>
      {notices.map((n) => (
        <div key={n.id} className={`card ${styles.notice}`}>
          <strong className={styles.noticeTitle}>{noticeTitle(n)}</strong>
          {n.details?.note && (
            <span className={`body ${styles.noticeNote}`}>
              {tr('Motivo: ', 'Reason: ')}
              {n.details.note}
            </span>
          )}
          <span className="small muted">{n.when}</span>
        </div>
      ))}
    </section>
  );
}

/** Computador: cartão de uma entidade */
export function EntityCard({ o }: { o: Entity }) {
  return (
    <article className={`card ${styles.card}`} style={{ '--c': o.color } as CSSProperties}>
      <div className={`row ${styles.cardHead}`}>
        <span aria-hidden="true" className={styles.cardRing} />
        <span className={styles.cardNames}>
          <span className={styles.cardName}>{o.name}</span>
          <span className={styles.cardFull}>{o.full}</span>
        </span>
      </div>
      <div className={styles.cardText}>
        {o.what} {o.note}
      </div>
      <div className={`row wrap ${styles.cardActions}`}>
        {o.tel && (
          <a className={`btn btn-dark lift ${styles.cardButton} ${styles.phone}`} href={o.tel} aria-label={callLabel(o)}>
            <Icon name="phone" size={16} />
            {o.phone}
          </a>
        )}
        <a className={`btn btn-ghost lift ${styles.cardButton}`} href={o.url} target="_blank" rel="noreferrer">
          {o.site} <Icon name="external" size={14} />
        </a>
        {o.email && (
          <a className={`link ${styles.cardEmail}`} href={`mailto:${o.email}`}>
            {o.email}
          </a>
        )}
      </div>
    </article>
  );
}

/** Telemóvel: uma entidade em lista */
export function EntityRow({ o }: { o: Entity }) {
  return (
    <article className={styles.row} style={{ '--c': o.color } as CSSProperties}>
      <div className={`row ${styles.rowHead}`}>
        <span className={styles.rowRing}>{o.short}</span>
        <span className={`grow ${styles.rowNames}`}>
          <span className={styles.rowWhat}>{o.what}</span>
          <span className="small muted">
            {o.short} — {o.full}
          </span>
        </span>
      </div>
      <div className={`row wrap ${styles.rowActions}`}>
        {o.tel && (
          <a href={o.tel} aria-label={callLabel(o)} className={`btn btn-dark ${styles.rowButton} ${styles.phone}`}>
            <Icon name="phone" size={16} />
            {o.phone}
          </a>
        )}
        <a href={o.url} target="_blank" rel="noreferrer" className={`link ${styles.rowSite}`}>
          {o.site} <Icon name="external" size={14} />
        </a>
      </div>
      <div className={`small muted ${styles.rowNote}`}>
        {o.note}
        {o.email && (
          <>
            {' · '}
            <a href={`mailto:${o.email}`} className={styles.strong}>
              {o.email}
            </a>
          </>
        )}
      </div>
    </article>
  );
}

export function Disclaimer({ className }: { className: string }) {
  return <p className={`small muted ${className}`}>{DISCLAIMER()}</p>;
}

export function BackToProfile() {
  return (
    <Link to="/perfil" className={`link ${styles.small15}`}>
      {tr('Voltar ao perfil', 'Back to profile')} <Icon name="next" size={16} />
    </Link>
  );
}
