import type { CSSProperties } from 'react';
import { Link } from 'react-router-dom';
import { Accordion } from '../../components/UI';
import { PLANS } from '../../data/content';
import type { Org } from '../../data/orgs';
import { tr } from '../../i18n';
import { fmt } from '../../lib/format';
import { FAQ, ringDegrees, STEPS, weekTrend } from './forOrgs';
import styles from './ForOrgs.module.css';

/** Anel decorativo com a nota de uma organização de exemplo e a variação da semana */
export function HeroRing({ org }: { org: Org }) {
  return (
    <div aria-hidden="true" className={styles.ring} style={{ '--deg': `${ringDegrees(org.score)}deg` } as CSSProperties}>
      <div className={`pulse ${styles.ringPulse}`} />
      <div className={styles.ringFill}>
        <div className={styles.ringInner}>
          <span className={`num ${styles.ringScore}`}>{fmt(org.score)}</span>
          <span className={styles.ringTrend} data-trend={org.weekDelta < 0 ? 'down' : 'up'}>
            {weekTrend(org.weekDelta)}
          </span>
        </div>
      </div>
    </div>
  );
}

export function HowItWorks() {
  return (
    <section aria-labelledby="cf" className={styles.how}>
      <h2 id="cf" className={`h2 ${styles.h2}`}>
        {tr('Como funciona', 'How it works')}
      </h2>
      <ol className={styles.steps}>
        {STEPS().map((s, i) => (
          <li key={s.t} className={`row ${styles.step}`}>
            <span aria-hidden="true" className={`num ${styles.stepNum}`}>
              {i + 1}
            </span>
            <span className={styles.stepText}>
              <span className={styles.stepTitle}>{s.t}</span>
              <span className={`small muted ${styles.stepBody}`}>{s.d}</span>
            </span>
          </li>
        ))}
      </ol>
    </section>
  );
}

export function Faq() {
  return (
    <section aria-labelledby="fq" className={styles.faq}>
      <div className={`row wrap between ${styles.faqHead}`}>
        <h2 id="fq" className={`h2 ${styles.h2}`}>
          {tr('Perguntas frequentes', 'Frequently asked questions')}
        </h2>
        <Link to="/metodologia" className="link small">
          {tr('Como calculamos', 'How we score')}
        </Link>
      </div>
      <Accordion items={FAQ().map((f) => ({ title: f.q, body: f.a }))} />
    </section>
  );
}

type Plan = (typeof PLANS)[number];

function PlanCard({ plan, index }: { plan: Plan; index: number }) {
  const pro = index > 0;
  const id = `plan-${index}`;
  return (
    <article aria-labelledby={id} className={`lift ${styles.plan}`} data-pro={pro || undefined}>
      <div className={`row wrap between ${styles.planHead}`}>
        <h3 id={id} className={`num ${styles.planName}`}>
          {plan.name}
        </h3>
        <span className={`row ${styles.price}`}>
          <span className={`num ${styles.priceValue}`}>{plan.price}</span>
          <span className="small muted">{plan.per}</span>
        </span>
      </div>
      <ul className={styles.points}>
        {plan.points.map((it) => (
          <li key={it} className={`row ${styles.point}`}>
            <span aria-hidden="true" className={styles.pointDot} />
            {it}
          </li>
        ))}
      </ul>
      <Link to="/painel" className={`btn btn-block ${pro ? 'btn-primary' : 'btn-dark'} ${styles.planCta}`}>
        {pro ? tr('Experimentar Pro', 'Try Pro') : tr('Começar grátis', 'Start for free')}
      </Link>
    </article>
  );
}

export function Plans() {
  return (
    <section aria-labelledby="pl" className={styles.plans}>
      <div className={styles.plansHead}>
        <h2 id="pl" className={`h2 ${styles.h2}`}>
          {tr('Planos', 'Plans')}
        </h2>
        <span className={`body ${styles.promise}`}>{tr('Nunca vendemos posição no ranking nem apagamos avaliações.', 'We never sell ranking positions or delete reviews.')}</span>
      </div>
      <div className={`row wrap ${styles.planList}`}>
        {PLANS.map((p, i) => (
          <PlanCard key={p.name} plan={p} index={i} />
        ))}
      </div>
    </section>
  );
}
