import { useEffect, useMemo, useState, type CSSProperties } from 'react';
import { Link, useSearchParams } from 'react-router';
import type { ReportPeriod } from '@peekjob/shared';
import { myOrgs, periodicReport } from '../api/accounts';
import { ApiError, apiMode, errorText } from '../api/http';
import { Icon } from '../components/Icon';
import { Shell } from '../components/Layout';
import { PageLoading } from '../components/PageLoading';
import { CRITERION } from '../data/criteria';
import { scoreWord } from '../features/review/flow';
import { demoReport, howToImprove, periodLine, periodName, periodOf, periodParam, peersLine, signed, type ApiReport } from '../features/painel/report';
import styles from '../features/painel/Report.module.css';
import { tr } from '../i18n';
import { fmt } from '../lib/format';
import { useStore } from '../lib/store';

type State = { status: 'loading' } | { status: 'signin' } | { status: 'none' } | { status: 'pro' } | { status: 'error'; message: string } | { status: 'ready'; report: ApiReport };

/** Modo API: a página que a pessoa gere (a do endereço, ou a primeira) e o relatório dela; demonstração: a Padaria Ribeira */
function useReport(period: ReportPeriod, orgParam: string | null): State {
  const { user, remote } = useStore();
  const [state, setState] = useState<State>({ status: 'loading' });
  const demo = useMemo(() => (apiMode ? null : demoReport(period)), [period]);
  useEffect(() => {
    if (!apiMode || !remote.ready || !user) return;
    let alive = true;
    setState({ status: 'loading' });
    void (async () => {
      try {
        const mine = await myOrgs();
        const id = mine.orgs.find((o) => o.id === orgParam)?.id ?? mine.orgs[0]?.id;
        if (!id) return alive && setState({ status: 'none' });
        const report = await periodicReport(id, periodParam(period));
        if (alive) setState({ status: 'ready', report });
      } catch (e) {
        if (!alive) return;
        if (e instanceof ApiError && e.body?.code === 'PRO_REQUIRED') setState({ status: 'pro' });
        else setState({ status: 'error', message: errorText(e) });
      }
    })();
    return () => {
      alive = false;
    };
  }, [period, orgParam, user, remote.ready]);
  if (demo) return { status: 'ready', report: demo };
  if (!remote.ready) return { status: 'loading' };
  if (!user) return { status: 'signin' };
  return state;
}

/** Relatório semanal ou mensal das organizações com o plano Pro (21/10) */
export default function Relatorio() {
  const [params] = useSearchParams();
  const period = periodOf(params.get('periodo'));
  const org = params.get('org');
  const state = useReport(period, org);
  return (
    <Shell>
      <div className={`container ${styles.page}`}>
        <PeriodHead period={period} org={org} report={state.status === 'ready' ? state.report : null} />
        <Body state={state} />
      </div>
    </Shell>
  );
}

const fmtDate = (iso: string) => new Date(iso).toLocaleDateString(tr('pt-PT', 'en-GB'), { day: 'numeric', month: 'short' });

function PeriodHead({ period, org, report }: { period: ReportPeriod; org: string | null; report: ApiReport | null }) {
  const href = (p: ReportPeriod) => `/painel/relatorio?${new URLSearchParams({ periodo: periodParam(p), ...(org ? { org } : {}) })}`;
  return (
    <header className={styles.head}>
      <Link to="/painel" className={`row link ${styles.back}`}>
        <Icon name="back" size={16} /> {tr('Painel', 'Dashboard')}
      </Link>
      <h1 className={`h1 ${styles.title}`}>
        {period === 'week' ? tr('Relatório semanal', 'Weekly report') : tr('Relatório mensal', 'Monthly report')}
        {report && (
          <>
            {' '}
            <span className={styles.titleOrg}>· {report.org.name}</span>
          </>
        )}
      </h1>
      {report && (
        <p className="muted">
          {fmtDate(report.from)} – {fmtDate(report.to)}
        </p>
      )}
      <div className={`row wrap between ${styles.tools}`}>
        <nav aria-label={tr('Período', 'Period')} className={`row ${styles.periods}`}>
          {(['week', 'month'] as const).map((p) => (
            <Link key={p} to={href(p)} className={`chip ${styles.period}`} aria-current={p === period ? 'page' : undefined}>
              {p === 'week' ? tr('Semanal', 'Weekly') : tr('Mensal', 'Monthly')}
            </Link>
          ))}
        </nav>
        {report && (
          <button type="button" className={`btn btn-ghost ${styles.print}`} onClick={() => window.print()}>
            <Icon name="file" size={16} /> {tr('Imprimir ou guardar em PDF', 'Print or save as PDF')}
          </button>
        )}
      </div>
    </header>
  );
}

function Body({ state }: { state: State }) {
  if (state.status === 'loading') return <PageLoading />;
  if (state.status === 'error') return <div role="alert" className="card warn">{state.message}</div>;
  if (state.status === 'signin') {
    return (
      <p className="lead">
        <Link to={`/entrar?${new URLSearchParams({ next: '/painel/relatorio' })}`} className="link">
          {tr('Entra', 'Sign in')}
        </Link>{' '}
        {tr('para ver o relatório da tua organização.', 'to see your organisation’s report.')}
      </p>
    );
  }
  if (state.status === 'none') {
    return (
      <p className="lead">
        {tr('Ainda não geres nenhuma página.', 'You don’t manage any page yet.')}{' '}
        <Link to="/painel" className="link">
          {tr('Pedir para gerir', 'Ask to manage one')}
        </Link>
      </p>
    );
  }
  if (state.status === 'pro') {
    return (
      <div className={`card ${styles.upsell}`}>
        <h2 className="h2">{tr('Os relatórios fazem parte do plano Pro', 'Reports are part of the Pro plan')}</h2>
        <p>
          {tr(
            'Todas as semanas e todos os meses: os teus resultados, a comparação com organizações parecidas, os pontos fortes e o que melhorar, com passos concretos. Nunca muda a posição no ranking.',
            'Every week and every month: your results, how you compare with similar organisations, your strengths and what to improve, with concrete steps. It never changes your ranking.',
          )}
        </p>
        <Link to="/para-organizacoes" className="btn btn-primary">
          {tr('Ver planos', 'See plans')}
        </Link>
      </div>
    );
  }
  return <ReportView r={state.report} />;
}

function ReportView({ r }: { r: ApiReport }) {
  const res = r.results;
  const tiles = [
    { label: tr('Nota (todas as avaliações)', 'Score (all reviews)'), value: res.score == null ? '—' : fmt(res.score) },
    { label: periodName(r.period), value: String(res.inPeriod), sub: tr('avaliações novas', 'new reviews') },
    { label: tr('Recomendam', 'Would recommend'), value: res.recommendPct == null ? '—' : `${res.recommendPct}%` },
  ];
  return (
    <div className={styles.sections}>
      <section aria-labelledby="rel-res" className={styles.section}>
        <h2 id="rel-res" className={`h2 ${styles.h2}`}>
          {tr('Resultados', 'Results')}
        </h2>
        <ul className={`row wrap ${styles.tiles}`}>
          {tiles.map((t) => (
            <li key={t.label} className={styles.tile}>
              <span className={styles.tileLabel}>{t.label}</span>
              <span className={`num ${styles.tileValue}`}>{t.value}</span>
              {t.sub && <span className="small muted">{t.sub}</span>}
            </li>
          ))}
        </ul>
        <p className="body">{periodLine(r)}</p>
      </section>

      <section aria-labelledby="rel-cmp" className={styles.section}>
        <h2 id="rel-cmp" className={`h2 ${styles.h2}`}>
          {tr('Comparação com a concorrência', 'How you compare')}
        </h2>
        <p className="body">{peersLine(r)}</p>
        <div className={styles.tableWrap}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th scope="col">{tr('Critério', 'Criterion')}</th>
                <th scope="col">{tr('A tua nota', 'Your score')}</th>
                <th scope="col">{tr('Comparáveis', 'Comparable')}</th>
                <th scope="col">{tr('Diferença', 'Difference')}</th>
                <th scope="col">{periodName(r.period)}</th>
              </tr>
            </thead>
            <tbody>
              {r.criteria.map((c) => (
                <tr key={c.key}>
                  <th scope="row">{CRITERION[c.key].label}</th>
                  <td className="num">{fmt(c.value)}</td>
                  <td className="num">{c.peers == null ? '—' : fmt(c.peers)}</td>
                  <td className="num" data-dir={c.vsPeers == null ? undefined : c.vsPeers > 0 ? 'up' : c.vsPeers < 0 ? 'down' : 'flat'}>
                    {c.vsPeers == null ? '—' : <Diff n={c.vsPeers} />}
                  </td>
                  <td className="num">{c.delta == null ? '—' : <Diff n={c.delta} />}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <div className={styles.twoCols}>
        <section aria-labelledby="rel-fortes" className={styles.section}>
          <h2 id="rel-fortes" className={`h2 ${styles.h2}`}>
            {tr('Pontos fortes', 'Strengths')}
          </h2>
          {r.strengths.length ? (
            <ul className={styles.points}>
              {r.strengths.map((k) => {
                const c = r.criteria.find((x) => x.key === k)!;
                return (
                  <li key={k}>
                    <strong>{CRITERION[k].label}</strong> · {fmt(c.value)}
                    {c.vsPeers != null && c.vsPeers > 0 && <span className="muted"> ({tr(`${signed(c.vsPeers)} que as comparáveis`, `${signed(c.vsPeers)} above comparable`)})</span>}
                  </li>
                );
              })}
            </ul>
          ) : (
            <p className="body muted">{tr('Ainda nenhum critério se destaca.', 'No criterion stands out yet.')}</p>
          )}
        </section>

        <section aria-labelledby="rel-melhorar" className={styles.section}>
          <h2 id="rel-melhorar" className={`h2 ${styles.h2}`}>
            {tr('O que melhorar, e como', 'What to improve, and how')}
          </h2>
          {r.improve.length ? (
            <ol className={styles.points}>
              {r.improve.map((k) => {
                const c = r.criteria.find((x) => x.key === k)!;
                return (
                  <li key={k}>
                    <strong>{CRITERION[k].label}</strong> · {fmt(c.value)}
                    <p className={`body ${styles.how}`}>{howToImprove(k)}</p>
                  </li>
                );
              })}
            </ol>
          ) : (
            <p className="body muted">{tr('Nada abaixo de 4 nem abaixo das comparáveis. Continua assim.', 'Nothing below 4 or below comparable organisations. Keep it up.')}</p>
          )}
        </section>
      </div>

      <section aria-labelledby="rel-niveis" className={styles.section}>
        <h2 id="rel-niveis" className={`h2 ${styles.h2}`}>
          {tr('Níveis de satisfação', 'Satisfaction levels')}
        </h2>
        <Levels levels={r.levels} />
        <Drivers r={r} />
      </section>

      <p className={`small muted ${styles.foot}`}>
        {tr(
          'Só contas agregadas: nunca mostramos quem escreveu. Com menos de 3 avaliações num período, mostramos só o acumulado. O relatório nunca muda a posição no ranking.',
          'Aggregates only: we never show who wrote what. With fewer than 3 reviews in a period we only show the overall figures. The report never changes your ranking.',
        )}
      </p>
    </div>
  );
}

/** "+0,4 ▲" (a seta e o sinal dizem o sentido; a cor não é a única pista) */
function Diff({ n }: { n: number }) {
  return (
    <span className={styles.diff} data-dir={n > 0 ? 'up' : n < 0 ? 'down' : 'flat'}>
      {signed(n)} <span aria-hidden="true">{n > 0 ? '▲' : n < 0 ? '▼' : '·'}</span>
    </span>
  );
}

/** Quantas avaliações em cada nível (1 a 5): barras de uma só cor com o número escrito ao lado */
function Levels({ levels }: { levels: number[] }) {
  const max = Math.max(1, ...levels);
  const total = levels.reduce((a, b) => a + b, 0);
  return (
    <ul className={styles.levels} aria-label={tr('Avaliações por nível de satisfação', 'Reviews by satisfaction level')}>
      {[5, 4, 3, 2, 1].map((n) => {
        const v = levels[n - 1];
        return (
          <li key={n} className={styles.level} title={tr(`${v} de ${total} avaliações`, `${v} of ${total} reviews`)}>
            <span className={styles.levelName}>
              {n} · {scoreWord(n)}
            </span>
            <span className={styles.bar} aria-hidden="true">
              <span className={styles.barFill} style={{ '--w': `${(v / max) * 100}%` } as CSSProperties} />
            </span>
            <span className={`num ${styles.levelValue}`}>{v}</span>
          </li>
        );
      })}
    </ul>
  );
}

/** Relação entre a satisfação e recomendar: os critérios onde quem recomenda e quem não recomenda mais diferem */
function Drivers({ r }: { r: ApiReport }) {
  if (!r.drivers.length) {
    return <p className="body muted">{tr('Ainda há poucas respostas a “recomendavas?” para ligar os critérios à recomendação.', 'There are still too few answers to “would you recommend?” to link criteria to recommendation.')}</p>;
  }
  return (
    <div className={styles.drivers}>
      <h3 className={styles.h3}>{tr('O que mais pesa em recomendar', 'What drives recommendation')}</h3>
      <ul className={styles.points}>
        {r.drivers.map((d) => (
          <li key={d.key}>
            <strong>{CRITERION[d.key].label}</strong>:{' '}
            {tr(`quem recomenda dá ${fmt(d.recommenders)}, quem não recomenda dá ${fmt(d.others)}.`, `people who recommend give ${fmt(d.recommenders)}, others give ${fmt(d.others)}.`)}
          </li>
        ))}
      </ul>
      <p className="small muted">
        {tr('Melhorar estes critérios é o que mais deve aumentar quem vos recomenda.', 'Improving these is what should most increase how many people recommend you.')}
      </p>
    </div>
  );
}
