import type { CSSProperties } from 'react';
import { Empty } from '../../components/UI';
import type { Interview, Org } from '../../data/orgs';
import { tr } from '../../i18n';
import { whenLabel } from '../../i18n/labels';
import { plural } from '../../lib/format';
import { useToggle } from '../../lib/useToggle';
import { BigRing, MoreToggle } from '../../pages/OrgPage.parts';
import { interviewNumbers, interviewRings } from './org';
import { ReportLink } from './Reviews';
import styles from './Interviews.module.css';

/** Anéis do resumo: dificuldade, boa experiência, resposta/oferta (80 px no telemóvel, 88 px no computador) */
function InterviewRings({ org, compact = false }: { org: Org; compact?: boolean }) {
  const rings = interviewRings(org);
  const size = compact ? 80 : 88;
  return (
    <div className={styles.rings} style={{ '--cols': rings.length } as CSSProperties}>
      {rings.map((r) => (
        <div key={r.label} className={styles.ringItem}>
          <BigRing value={r.v} pct={r.pct} size={size} thickness={8} ariaLabel={`${r.label}: ${r.pct ? r.text : r.text + tr(' de 5', ' out of 5')}`}>
            <span className={compact ? styles.ringTextSm : styles.ringText}>{r.text}</span>
          </BigRing>
          <span className={`small body ${styles.ringLabel}`}>{r.label}</span>
        </div>
      ))}
    </div>
  );
}

function InterviewItem({ i, org, desktop }: { i: Interview; org: Org; desktop: boolean }) {
  const result = (
    <span className={styles.result} data-offer={i.offer}>
      {i.offer ? tr('Oferta recebida', 'Got an offer') : tr('Sem oferta', 'No offer')}
    </span>
  );
  if (desktop) {
    return (
      <article className={styles.itemDesktop}>
        <div className={`row wrap between ${styles.headDesktop}`}>
          <h3 className="h3">{i.role}</h3>
          {result}
        </div>
        <span className="small muted">
          {whenLabel(i.when)} · {i.positive ? tr('Boa experiência', 'Good experience') : tr('Experiência menos boa', 'Not so good')}
        </span>
        <p className={`body ${styles.bodyDesktop}`}>{i.body}</p>
        <div className={`row ${styles.foot}`}>
          <span className="small body">{i.steps}</span>
          <ReportLink org={org} itemId={i.id} />
        </div>
      </article>
    );
  }
  return (
    <article className={styles.item}>
      <div className={`row between ${styles.head}`}>
        <h3 className="h3">{i.role}</h3>
        {result}
      </div>
      <span className="small muted">
        {i.steps} · {whenLabel(i.when)}
      </span>
      <p className={`body ${styles.body}`}>{i.body}</p>
    </article>
  );
}

/** Entrevistas partilhadas: as duas primeiras e "ver todas" */
function InterviewList({ org, desktop }: { org: Org; desktop: boolean }) {
  const [all, toggleAll] = useToggle();
  if (!org.interviews.length) {
    return (
      <Empty
        title={tr('Ainda sem entrevistas partilhadas.', 'No interviews shared yet.')}
        body={tr('Fizeste uma entrevista aqui? Conta como correu, de forma anónima.', 'Had an interview here? Tell us how it went, anonymously.')}
      />
    );
  }
  const shown = all ? org.interviews : org.interviews.slice(0, 2);
  return (
    <div className={styles.list}>
      {shown.map((i) => (
        <InterviewItem key={i.id} i={i} org={org} desktop={desktop} />
      ))}
      {org.interviews.length > 2 && (
        <button type="button" className={`${desktop ? 'btn btn-ghost lift' : 'btn btn-ghost btn-block'} ${styles.more}`} aria-expanded={all} onClick={toggleAll}>
          {all ? tr('Mostrar menos', 'Show less') : tr(`Ver todas as ${org.interviews.length} entrevistas`, `See all ${org.interviews.length} interviews`)}
        </button>
      )}
    </div>
  );
}

export function MobileInterviews({ org }: { org: Org }) {
  const [more, toggleMore] = useToggle();
  const s = interviewNumbers(org);
  return (
    <>
      {s.n > 0 && (
        <section aria-label={tr('Resumo das entrevistas', 'Interview summary')} className={styles.summary}>
          <div className={`row ${styles.headline}`}>
            <BigRing value={s.positivePct} pct size={92} thickness={9} ariaLabel={tr(`${s.positivePct}% tiveram boa experiência`, `${s.positivePct}% had a good experience`)}>
              <span className={styles.headlineValue}>{s.positivePct}%</span>
            </BigRing>
            <div className={styles.headlineText}>
              <span className={`h2 ${styles.headlineTitle}`}>{tr('tiveram boa experiência', 'had a good experience')}</span>
              <span className="small muted">{plural(s.n, tr('entrevista partilhada', 'interview shared'), tr('entrevistas partilhadas', 'interviews shared'))}</span>
            </div>
          </div>
          {more && (
            <div id="int-more" className={`fade-up ${styles.moreNumbers}`}>
              <InterviewRings org={org} compact />
              {s.usualSteps && (
                <div className={styles.usual}>
                  <span className="small muted">{tr('Processo mais comum', 'Most common process')}</span>
                  <span className={styles.usualValue}>{s.usualSteps}</span>
                </div>
              )}
            </div>
          )}
          <MoreToggle open={more} onToggle={toggleMore} label={tr('Ver mais números', 'See more numbers')} openLabel={tr('Mostrar menos', 'Show less')} controls="int-more" />
        </section>
      )}
      <section aria-label={tr('Entrevistas partilhadas', 'Shared interviews')}>
        <InterviewList org={org} desktop={false} />
      </section>
    </>
  );
}

export function DesktopInterviews({ org }: { org: Org }) {
  const s = interviewNumbers(org);
  return (
    <>
      <section aria-labelledby="como-correram" className="stack">
        <h2 id="como-correram" className={`h2 ${styles.mainTitle}`}>
          {tr('Como correram', 'How they went')}
        </h2>
        <InterviewList org={org} desktop />
      </section>
      <aside aria-labelledby="em-resumo" className={styles.aside}>
        <h2 id="em-resumo" className={`h2 ${styles.asideTitle}`}>
          {tr('Em resumo', 'In short')}
        </h2>
        {s.n > 0 ? <InterviewRings org={org} /> : <span className="body">{tr('Ainda sem números.', 'No numbers yet.')}</span>}
        {s.usualSteps && (
          <div className={styles.block}>
            <span className="small muted">{tr('Processo mais comum', 'Most common process')}</span>
            <span className={styles.blockValue}>{s.usualSteps}</span>
          </div>
        )}
        {s.n > 0 && (
          <div className={styles.block}>
            <span className="small muted">{tr('Receberam oferta', 'Got an offer')}</span>
            <span className={`num ${styles.offer}`}>{s.offerPct}%</span>
          </div>
        )}
      </aside>
    </>
  );
}
