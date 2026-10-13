import { useEffect, useState, type ReactNode } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Shell } from '../components/Layout';
import { Dots, Ring } from '../components/Data';
import { TopBar } from '../components/UI';
import { Icon } from '../components/Icon';
import { CRITERION, PREF_WEIGHTS } from '../data/criteria';
import { ORG_BY_ID } from '../data/orgs';
import { SUPPORT } from '../data/content';
import { BAYES_C, GLOBAL_MEAN, adjusted, matchScores } from '../lib/match';
import { fmt } from '../lib/format';
import { useStore } from '../lib/store';
import { useIsDesktop } from '../lib/useMedia';
import { analytics } from '../analytics';
import { openConsent } from '../components/ConsentBanner';
import { tr } from '../i18n';

/** Organizações de exemplo para a demonstração da "% para ti" */
const EXAMPLE_ORGS = ['padaria-ribeira', 'maos-dadas', 'norte-logistica'].map((id) => ORG_BY_ID[id]).filter(Boolean);
/** Cenários da demonstração da nota ajustada */
const SCENARIOS = [
  { k: 'boa', get label() { return tr('Boas · 4,6', 'Good · 4.6'); }, real: 4.6 },
  { k: 'ma', get label() { return tr('Más · 2,4', 'Bad · 2.4'); }, real: 2.4 },
] as const;
const QUICK = [0, 3, 5, 10, 25, 50];
/** Mínimos públicos */
const MIN_SCORE = 3;
const MIN_RANK = 5;

const IDEAS = () => [
  {
    n: 1, c: 'var(--teal)',
    t: tr('Comparamos com quem é parecido', 'We compare like with like'),
    d: tr('Uma padaria de 12 pessoas compara-se com o seu setor e dimensão.', 'A 12-person bakery is compared with its own sector and size.'),
  },
  {
    n: 2, c: 'var(--teal)',
    t: tr('A % para ti é só tua', 'Your % match is yours alone'),
    d: tr('Usa as tuas 3 prioridades. Não muda a nota pública.', 'It uses your 3 priorities. It doesn’t change the public score.'),
  },
  {
    n: 3, c: 'var(--purple)',
    t: tr('Ilegalidades não são apagadas', 'Illegal practices aren’t erased'),
    d: tr('Mostramos apoio e onde pedir ajuda. Não fazemos denúncias.', 'We show support and where to get help. We don’t file reports.'),
  },
];

const RULES = (): { t: string; d: ReactNode }[] => [
  {
    t: tr(`Mínimo de ${MIN_SCORE} avaliações`, `At least ${MIN_SCORE} reviews`),
    d: tr(
      `Com menos de ${MIN_SCORE}, a organização tem página mas não mostra nota. Com ${MIN_RANK}, entra no ranking.`,
      `With fewer than ${MIN_SCORE}, the organisation has a page but no score. With ${MIN_RANK}, it enters the ranking.`,
    ),
  },
  {
    t: tr('Compara-se com quem é parecido', 'Compared with similar places'),
    d: tr(
      'Uma padaria de 12 pessoas é comparada com o mesmo setor e dimensão, não com multinacionais.',
      'A 12-person bakery is compared with the same sector and size, not with multinationals.',
    ),
  },
  {
    t: tr('Verificação anónima', 'Anonymous verification'),
    d: tr(
      'Confirmas por email profissional, contrato ou NIF. O ficheiro é apagado logo a seguir e a organização nunca sabe quem és.',
      'You confirm with a work email, contract or NIF (Portuguese tax number). The file is deleted straight away and the organisation never knows who you are.',
    ),
  },
  {
    t: tr('Ninguém paga para subir', 'Nobody pays to rank higher'),
    d: tr(
      'As organizações podem responder, mas não pagam para subir no ranking nem para esconder avaliações.',
      'Organisations can reply, but they can’t pay to rank higher or to hide reviews.',
    ),
  },
  {
    t: tr('Moderação com critério', 'Moderation with judgement'),
    d: (
      <div className="stack" style={{ gap: 8 }}>
        <div>
          {tr(
            <><span style={{ fontWeight: 600, color: 'var(--teal-dark)' }}>Fica:</span> críticas duras, quando descrevem factos.</>,
            <><span style={{ fontWeight: 600, color: 'var(--teal-dark)' }}>Stays:</span> harsh criticism, when it describes facts.</>,
          )}
        </div>
        <div>
          {tr(
            <><span style={{ fontWeight: 600, color: 'var(--down)' }}>Sai:</span> nomes, insultos, ameaças e dados pessoais.</>,
            <><span style={{ fontWeight: 600, color: 'var(--down)' }}>Goes:</span> names, insults, threats and personal data.</>,
          )}
        </div>
      </div>
    ),
  },
];

export default function Metodologia() {
  const desktop = useIsDesktop();
  const { hash } = useLocation();

  // Âncora #privacidade (ligação do rodapé): espera pelo scroll-to-top da mudança de ecrã
  useEffect(() => {
    if (!hash) return;
    const id = hash.slice(1);
    const t = window.setTimeout(() => document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 60);
    return () => window.clearTimeout(t);
  }, [hash]);

  if (desktop) {
    return (
      <Shell>
        <div className="container" style={{ paddingBottom: 64 }}>
          <div className="row wrap" style={{ gap: '48px 64px', alignItems: 'center', paddingTop: 32 }}>
            <div className="stack" style={{ flex: '1 1 400px', minWidth: 0, gap: 18 }}>
              <h1 className="h1" style={{ fontSize: 'clamp(40px, 4.2vw, 56px)', lineHeight: 1 }}>
                {tr('A nota não está à venda.', 'The score is not for sale.')}
              </h1>
              <p className="lead" style={{ fontSize: 16 }}>
                {tr('A fórmula é pública e igual para todas.', 'The formula is public and the same for everyone.')}
              </p>
              <div className="stack" style={{ gap: 8, paddingTop: 18, marginTop: 8, borderTop: '1px solid var(--line)' }}>
                <div className="mono" style={{ fontSize: 18, lineHeight: 1.5 }}>
                  {tr('nota = (C × m + Σ notas) ÷ (C + n)', 'score = (C × m + Σ scores) ÷ (C + n)')}
                </div>
                <div className="small muted" style={{ lineHeight: 1.5 }}>
                  {tr(
                    <>m é a média do setor; C = {BAYES_C} puxa para o neutro; n são as avaliações reais</>,
                    <>m is the sector average; C = {BAYES_C} pulls towards neutral; n is the number of real reviews</>,
                  )}
                </div>
              </div>
            </div>
            <div style={{ flex: '1.2 1 520px', minWidth: 0 }}>
              <Demo desktop />
            </div>
          </div>

          <div className="row wrap" style={{ gap: '48px 64px', alignItems: 'flex-start', paddingTop: 64 }}>
            <div className="stack" style={{ flex: '1.2 1 520px', minWidth: 0, gap: 40 }}>
              <Rules desktop />
              <Privacy desktop />
            </div>
            <div style={{ flex: '1 1 400px', minWidth: 0 }}>
              <Respeito desktop />
            </div>
          </div>
        </div>
      </Shell>
    );
  }

  return (
    <Shell>
      <div className="page no-nav">
        <TopBar back="/ranking" />
        <div className="stack" style={{ gap: 10 }}>
          <h1 className="h1" style={{ fontSize: 36, lineHeight: 1 }}>
            {tr('A nota não está à venda.', 'The score is not for sale.')}
          </h1>
          <p className="body" style={{ margin: 0, fontSize: 15 }}>
            {tr('Fórmula pública. Ninguém paga para subir ou esconder avaliações.', 'Public formula. Nobody pays to rank higher or hide reviews.')}
          </p>
        </div>

        <section aria-label={tr('Ideias principais', 'Key ideas')} className="stack" style={{ gap: 16 }}>
          {IDEAS().map((r) => (
            <div key={r.n} style={{ display: 'grid', gridTemplateColumns: '32px minmax(0, 1fr)', gap: 14, alignItems: 'start' }}>
              <span className="num" style={{ width: 32, height: 32, borderRadius: 16, border: `3px solid ${r.c}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, fontWeight: 700 }}>
                {r.n}
              </span>
              <div className="stack" style={{ gap: 3, paddingTop: 4 }}>
                <div className="num" style={{ fontSize: 20, lineHeight: 1.15 }}>
                  {r.t}
                </div>
                <div className="body" style={{ fontSize: 15, lineHeight: 1.45 }}>
                  {r.d}
                </div>
              </div>
            </div>
          ))}
        </section>

        <div className="card dark stack" style={{ gap: 8, borderRadius: 20, padding: 16 }}>
          <div className="mono" style={{ fontSize: 14, lineHeight: 1.5 }}>
            {tr('nota = (C × m + Σ notas) ÷ (C + n)', 'score = (C × m + Σ scores) ÷ (C + n)')}
          </div>
          <div className="mono" style={{ fontSize: 12, lineHeight: 1.8, color: 'var(--grey)' }}>
            {tr(
              <>
                m = média do setor e dimensão
                <br />C = {BAYES_C} avaliações de referência
                <br />n = avaliações da organização
              </>,
              <>
                m = sector and size average
                <br />C = {BAYES_C} reference reviews
                <br />n = the organisation’s reviews
              </>,
            )}
          </div>
        </div>

        <Demo />
        <Rules />
        <Respeito />
        <Privacy />

        <Link to="/ranking" className="btn btn-dark btn-block" style={{ height: 56 }}>
          {tr('Voltar ao ranking', 'Back to the ranking')}
        </Link>
      </div>
    </Shell>
  );
}

/* ---------------- Demo da nota ajustada ---------------- */

function Demo({ desktop = false }: { desktop?: boolean }) {
  const [n, setN] = useState(3);
  const [sc, setSc] = useState<'boa' | 'ma'>('boa');
  const real = SCENARIOS.find((s) => s.k === sc)!.real;
  const adj = adjusted(real, n);
  const shown = n >= MIN_SCORE;
  const share = Math.round((n / (n + BAYES_C)) * 100);
  const status =
    n < MIN_SCORE
      ? tr(`Ainda sem nota · faltam ${MIN_SCORE - n}`, `No score yet · ${MIN_SCORE - n} to go`)
      : n < MIN_RANK
        ? tr('Nota visível · fora do ranking', 'Score visible · not ranked')
        : tr('Nota visível · no ranking', 'Score visible · ranked');
  const size = desktop ? 168 : 140;
  const circ = 2 * Math.PI * 80;

  return (
    <section aria-labelledby="t-demo" className="card stack" style={{ padding: desktop ? 32 : 20, gap: 22, borderRadius: 'var(--r-xl)' }}>
      <div className="row wrap between" style={{ gap: 12 }}>
        <h2 id="t-demo" className="h2" style={{ fontSize: 24, lineHeight: 1.1 }}>
          {tr('Experimenta', 'Try it')}
        </h2>
        <div className="segmented" role="group" aria-label={tr('Tipo de avaliações', 'Type of reviews')}>
          {SCENARIOS.map((s) => (
            <button key={s.k} type="button" aria-pressed={sc === s.k} onClick={() => setSc(s.k)}>
              {s.label}
            </button>
          ))}
        </div>
      </div>

      <div className="row wrap" style={{ gap: desktop ? 28 : 20 }}>
        <div style={{ position: 'relative', flex: 'none', width: size, height: size }}>
          <svg width={size} height={size} viewBox="0 0 188 188" aria-hidden="true" style={{ transform: 'rotate(-90deg)' }}>
            <circle cx="94" cy="94" r="80" fill="none" stroke="var(--line)" strokeWidth="16" />
            <circle
              cx="94"
              cy="94"
              r="80"
              fill="none"
              strokeWidth="16"
              strokeLinecap="round"
              style={{
                stroke: shown ? 'var(--teal)' : 'var(--grey)',
                strokeDasharray: circ,
                strokeDashoffset: circ * (1 - adj / 5),
                transition: 'stroke-dashoffset .5s cubic-bezier(.2,.8,.2,1), stroke .3s',
              }}
            />
          </svg>
          <div
            role="img"
            aria-label={tr(
              `Nota ajustada ${fmt(adj)} de 5 com ${n} avaliações${shown ? '' : ', ainda não publicada'}`,
              `Adjusted score ${fmt(adj)} out of 5 with ${n} reviews${shown ? '' : ', not published yet'}`,
            )}
            className="stack"
            style={{ position: 'absolute', inset: 0, alignItems: 'center', justifyContent: 'center', gap: 2 }}
          >
            <span className="num" style={{ fontSize: desktop ? 46 : 38, lineHeight: 1, color: shown ? 'var(--ink)' : 'var(--muted)' }}>
              {fmt(adj)}
            </span>
            <span className="small muted">{tr('nota ajustada', 'adjusted score')}</span>
          </div>
        </div>
        <div aria-live="polite" className="stack" style={{ flex: '1 1 200px', minWidth: 0, gap: 10 }}>
          <span className="pill" style={{ alignSelf: 'flex-start', fontSize: 13, padding: '6px 12px', background: shown ? 'var(--teal-tint)' : 'var(--soft)', color: shown ? 'var(--teal-dark)' : 'var(--body)' }}>
            {status}
          </span>
          <span className="body" style={{ fontSize: 15, lineHeight: 1.5 }}>
            {tr(
              <>Com <strong style={{ color: 'var(--ink)' }}>{n === 1 ? '1 avaliação' : `${n} avaliações`}</strong>, {share}% da nota já é real.</>,
              <>With <strong style={{ color: 'var(--ink)' }}>{n === 1 ? '1 review' : `${n} reviews`}</strong>, {share}% of the score is already real.</>,
            )}
          </span>
          <span className="small muted">
            {tr('Neutro', 'Neutral')} {fmt(GLOBAL_MEAN)} → {tr('média real', 'real average')} {fmt(real)}
          </span>
        </div>
      </div>

      <div className="stack" style={{ gap: 8 }}>
        <label htmlFor="nrev" className="row between" style={{ fontSize: 14, fontWeight: 600 }}>
          <span>{tr('Número de avaliações', 'Number of reviews')}</span>
          <span className="mono" style={{ color: 'var(--teal-dark)' }}>
            {n}
          </span>
        </label>
        <input
          id="nrev"
          type="range"
          min={0}
          max={60}
          step={1}
          value={n}
          onChange={(e) => setN(Number.parseInt(e.target.value, 10) || 0)}
          style={{ width: '100%', height: 44, accentColor: 'var(--teal)', margin: 0 }}
        />
        <div role="group" aria-label={tr('Atalhos', 'Shortcuts')} className="row wrap" style={{ gap: desktop ? 8 : 6 }}>
          {QUICK.map((q) => (
            <button
              key={q}
              type="button"
              aria-pressed={n === q}
              onClick={() => setN(q)}
              className="mono"
              style={{
                minWidth: desktop ? 52 : 44, height: 44, padding: desktop ? '0 12px' : '0 8px', borderRadius: 14, fontSize: 14,
                border: `1px solid ${n === q ? 'var(--teal)' : 'var(--field)'}`, background: n === q ? 'var(--teal-tint)' : 'var(--surface)',
              }}
            >
              {q}
            </button>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ---------------- Regras (acordeão) ---------------- */

function AccItem({ title, open, onToggle, id, children, desktop }: { title: ReactNode; open: boolean; onToggle: () => void; id: string; children: ReactNode; desktop: boolean }) {
  return (
    <div style={{ borderTop: '1px solid var(--line)' }}>
      <h3 style={{ margin: 0 }}>
        <button
          type="button"
          aria-expanded={open}
          aria-controls={id}
          onClick={onToggle}
          className="row between"
          style={{
            width: '100%', gap: 16, minHeight: desktop ? 60 : 54, padding: '8px 4px', border: 0, background: 'transparent', textAlign: 'left',
            fontFamily: desktop ? 'var(--font-display)' : undefined, fontWeight: 600, fontSize: desktop ? 18 : 16,
          }}
        >
          <span>{title}</span>
          <Icon name="plus" size={20} style={{ flex: 'none', color: 'var(--muted)', transform: open ? 'rotate(45deg)' : undefined, transition: 'transform .2s' }} />
        </button>
      </h3>
      {open && (
        <div id={id} className="fade-up body" style={{ padding: '0 4px 20px', fontSize: 15, lineHeight: 1.5 }}>
          {children}
        </div>
      )}
    </div>
  );
}

function Rules({ desktop = false }: { desktop?: boolean }) {
  const [open, setOpen] = useState<string | null>(null);
  const tog = (k: string) => () => setOpen(open === k ? null : k);
  return (
    <section aria-labelledby="t-regras" className="stack">
      <h2 id="t-regras" className="h2" style={{ fontSize: desktop ? 24 : 22, marginBottom: 12 }}>
        {tr('As regras, sem letra pequena', 'The rules, no small print')}
      </h2>
      <AccItem title={tr('Como nasce a tua “% para ti”', 'How your “% match” is worked out')} open={open === 'pct'} onToggle={tog('pct')} id="acc-pct" desktop={desktop}>
        <PctDemo />
      </AccItem>
      {RULES().map((r, i) => (
        <AccItem key={r.t} title={r.t} open={open === String(i)} onToggle={tog(String(i))} id={`acc-${i}`} desktop={desktop}>
          {typeof r.d === 'string' ? <p style={{ margin: 0, maxWidth: 560 }}>{r.d}</p> : r.d}
        </AccItem>
      ))}
      <div style={{ borderTop: '1px solid var(--line)' }} />
    </section>
  );
}

function PctDemo() {
  const { prefs } = useStore();
  const desktop = useIsDesktop();
  const [orgId, setOrgId] = useState(EXAMPLE_ORGS[0]?.id);
  const org = EXAMPLE_ORGS.find((o) => o.id === orgId) ?? EXAMPLE_ORGS[0];
  if (!org) return null;
  let sum = 0;
  let wsum = 0;
  const rows = prefs.map((k, i) => {
    const c = CRITERION[k];
    const v = org.scores[k];
    const w = PREF_WEIGHTS[i] ?? 1;
    if (v != null) {
      sum += v * w;
      wsum += w;
    }
    return { k, c, v, w, rank: i + 1 };
  });
  const pct = matchScores(org.scores, prefs);
  const weightsText = PREF_WEIGHTS.slice(0, prefs.length).join(', ').replace(/, (\d)$/, tr(' e $1', ' and $1'));

  return (
    <div className="stack" style={{ gap: 14 }}>
      <p style={{ margin: 0 }}>
        {tr(
          `As tuas ${prefs.length} prioridades valem ${weightsText}. Só tu vês esta %.`,
          `Your ${prefs.length} priorities are weighted ${weightsText}. Only you can see this %.`,
        )}
      </p>
      <div role="group" aria-label={tr('Organização de exemplo', 'Example organisation')} className="chips">
        {EXAMPLE_ORGS.map((o) => (
          <button key={o.id} type="button" className="chip" aria-pressed={o.id === org.id} onClick={() => setOrgId(o.id)} style={{ height: 44 }}>
            {o.name}
          </button>
        ))}
      </div>
      {prefs.length === 0 ? (
        <p style={{ margin: 0 }}>{tr('Ainda não escolheste prioridades.', 'You haven’t chosen any priorities yet.')}</p>
      ) : (
        <div className="stack">
          {rows.map(({ k, c, v, w, rank }) => {
            const r = k === 'respeito';
            return (
              <div
                key={k}
                role="img"
                aria-label={
                  v == null
                    ? tr(`${c.label}: não se aplica, não conta`, `${c.label}: doesn’t apply, not counted`)
                    : tr(`${c.label}: ${fmt(v)} vezes peso ${w} dá ${fmt(v * w)}`, `${c.label}: ${fmt(v)} times weight ${w} gives ${fmt(v * w)}`)
                }
                style={{ display: 'grid', gridTemplateColumns: '28px minmax(0, 1fr) auto auto 40px', alignItems: 'center', gap: 10, padding: '10px 0', borderTop: '1px solid var(--line)' }}
              >
                <span className="num" style={{ width: 26, height: 26, borderRadius: 13, border: `3px solid ${c.color}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 700, color: 'var(--ink)' }}>
                  {rank}
                </span>
                <span className="ellipsis" style={{ fontSize: 15, fontWeight: 600, color: r ? 'var(--purple-text)' : 'var(--ink)' }}>
                  {desktop ? c.label : c.short}
                </span>
                <Dots value={v} color={c.color} size={10} gap={3} />
                <span className="mono" style={{ fontSize: 13 }}>
                  {v == null ? '—' : fmt(v)} × {w}
                </span>
                <span className="mono" style={{ fontSize: 13, fontWeight: 500, textAlign: 'right', color: 'var(--ink)' }}>
                  {v == null ? '—' : fmt(v * w)}
                </span>
              </div>
            );
          })}
        </div>
      )}
      <div className="row wrap between" style={{ gap: 12, paddingTop: 12, borderTop: '1px solid var(--line)' }}>
        <span className="mono row wrap" style={{ fontSize: 13, gap: 6 }}>
          {fmt(sum)} ÷ (5 × {wsum}) =
          <span className="pill pill-match" style={{ fontFamily: 'var(--font-body)', fontSize: 14, padding: '5px 12px' }}>
            {tr(`${pct}% para ti`, `${pct}% for you`)}
          </span>
        </span>
        <Link to="/preferencias" className="link" style={{ fontSize: 14 }}>
          {tr('Mudar prioridades', 'Change priorities')} <Icon name="next" size={16} />
        </Link>
      </div>
    </div>
  );
}

/* ---------------- Respeito e red flags ---------------- */

function Respeito({ desktop = false }: { desktop?: boolean }) {
  return (
    <section aria-labelledby="t-resp" className="card purple stack" style={{ gap: 18, padding: desktop ? 32 : 20, borderRadius: 'var(--r-xl)' }}>
      <div className="row" style={{ gap: 18 }}>
        <Ring value={4.8} size={desktop ? 72 : 60} color="var(--purple)" track="var(--purple-line)" inner="var(--purple-tint)" ariaLabel={tr('Exemplo: Respeito e inclusão 4,8 de 5', 'Example: Respect and inclusion 4.8 out of 5')} fontSize={desktop ? 22 : 19} />
        <h2 id="t-resp" className="h2" style={{ fontSize: desktop ? 24 : 21, lineHeight: 1.1, color: 'var(--purple-text)' }}>
          {tr('Respeito e inclusão tem lugar próprio.', 'Respect and inclusion has its own place.')}
        </h2>
      </div>
      <p className="body" style={{ margin: 0, fontSize: 15, lineHeight: 1.5 }}>
        {tr(
          'Direitos, diversidade e ambiente sem assédio, sempre visível à parte. Possível ilegalidade? Quem escreveu recebe uma mensagem privada de apoio.',
          'Rights, diversity and a harassment-free workplace, always shown separately. Possibly illegal? Whoever wrote it gets a private support message.',
        )}
      </p>
      <div className="stack">
        {SUPPORT.map((s) => (
          <div key={s.short} style={{ display: 'grid', gridTemplateColumns: '56px minmax(0, 1fr)', gap: 12, alignItems: 'baseline', padding: '12px 0', borderTop: '1px solid var(--purple-line)' }}>
            <span className="num" style={{ fontSize: 18, color: 'var(--purple-text)' }}>
              {s.short}
            </span>
            <span className="stack" style={{ gap: 2 }}>
              <span style={{ fontSize: 14, fontWeight: 600 }}>
                {s.full}
                {s.phone && s.tel && (
                  <>
                    {' '}
                    ·{' '}
                    <a href={s.tel} style={{ color: 'var(--purple-text)' }}>
                      {s.phone}
                    </a>
                  </>
                )}
              </span>
              <span className="small body" style={{ lineHeight: 1.45 }}>
                {s.note}
                {s.email && (
                  <>
                    {' '}
                    ·{' '}
                    <a href={`mailto:${s.email}`} style={{ color: 'var(--purple-text)' }}>
                      {s.email}
                    </a>
                  </>
                )}{' '}
                ·{' '}
                <a href={s.url} target="_blank" rel="noreferrer" style={{ fontWeight: 500, color: 'var(--purple-text)' }}>
                  {s.site} ↗
                </a>
              </span>
            </span>
          </div>
        ))}
        <div className="small body" style={{ paddingTop: 12, borderTop: '1px solid var(--purple-line)', lineHeight: 1.5 }}>
          {tr(
            <>Em perigo imediato, liga <strong style={{ color: 'var(--ink)' }}>112</strong>. A PeekJob não apresenta queixas por ti nem partilha a mensagem com a organização.</>,
            <>In immediate danger, call <strong style={{ color: 'var(--ink)' }}>112</strong>. PeekJob doesn’t file complaints for you or share the message with the organisation.</>,
          )}
        </div>
      </div>
      <div className="row wrap" style={{ gap: '4px 24px' }}>
        <Link to="/apoio" className="link" style={{ fontSize: 14, color: 'var(--purple-text)' }}>
          {tr('Página de apoio', 'Support page')} <Icon name="next" size={16} />
        </Link>
        <Link to="/ranking" className="link" style={{ fontSize: 14, color: 'var(--purple-text)' }}>
          {tr('Ver o ranking', 'See the ranking')} <Icon name="next" size={16} />
        </Link>
      </div>
    </section>
  );
}

/* ---------------- Privacidade (âncora do rodapé) ---------------- */

function Privacy({ desktop = false }: { desktop?: boolean }) {
  return (
    <section id="privacidade" aria-labelledby="t-priv" className="stack" style={{ gap: 12, scrollMarginTop: 24 }}>
      <div className="row" style={{ gap: 10 }}>
        <Icon name="lock" size={22} />
        <h2 id="t-priv" className="h2" style={{ fontSize: desktop ? 24 : 22 }}>
          {tr('Privacidade e RGPD', 'Privacy and GDPR')}
        </h2>
      </div>
      <ul className="body" style={{ margin: 0, paddingLeft: 20, fontSize: 15, lineHeight: 1.55, display: 'flex', flexDirection: 'column', gap: 6 }}>
        <li>{tr('Guardamos só o necessário, de acordo com o RGPD.', 'We keep only what’s necessary, in line with the GDPR.')}</li>
        <li>{tr('As avaliações são anónimas: a organização nunca sabe quem escreveu.', 'Reviews are anonymous: the organisation never knows who wrote them.')}</li>
        <li>{tr('Os comprovativos de verificação são apagados logo a seguir.', 'Verification documents are deleted straight away.')}</li>
        <li>{tr('Podes exportar ou apagar os teus dados quando quiseres.', 'You can export or delete your data whenever you like.')}</li>
        <li>
          {tr(
            'Se pedires “Reescrever com IA”, o texto do comentário é enviado à Anthropic (fornecedora do modelo) só para gerar a proposta. Não o guardamos nem o associamos a ti, e a Anthropic não o usa para treinar modelos.',
            'If you use “Rewrite with AI”, your comment text is sent to Anthropic (the model provider) only to generate the suggestion. We don’t store it or link it to you, and Anthropic doesn’t use it to train models.',
          )}
        </li>
        <li>
          {tr(
            'A lista de organizações vem também do OpenStreetMap (© contribuidores do OpenStreetMap, licença ODbL) e do registo europeu VIES.',
            'The list of organisations also comes from OpenStreetMap (© OpenStreetMap contributors, ODbL licence) and the European VIES register.',
          )}
        </li>
        {analytics.configured() && (
          <li>
            {tr(
              'Estatísticas (Google Analytics) só com a tua autorização: medimos páginas e passos, nunca o que escreves, onde trabalhas, o teu email ou o NIF. Sem publicidade.',
              'Statistics (Google Analytics) only with your permission: we measure pages and steps, never what you write, where you work, your email or your NIF. No ads.',
            )}
          </li>
        )}
      </ul>
      {analytics.configured() && (
        <button type="button" className="link" onClick={openConsent} style={{ alignSelf: 'flex-start', fontSize: 14, background: 'none', border: 0, padding: 0 }}>
          {tr('Gerir estatísticas', 'Manage statistics')} <Icon name="next" size={16} />
        </button>
      )}
      <Link to="/perfil/dados" className="link" style={{ alignSelf: 'flex-start', fontSize: 14 }}>
        {tr('Exportar ou apagar os meus dados', 'Export or delete my data')} <Icon name="next" size={16} />
      </Link>
    </section>
  );
}
