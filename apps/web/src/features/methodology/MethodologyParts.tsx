import { useState, type CSSProperties, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { analytics } from '../../analytics';
import { openConsent } from '../../components/ConsentBanner';
import { Dots, Ring } from '../../components/Data';
import { Icon } from '../../components/Icon';
import { SUPPORT } from '../../data/content';
import { tr } from '../../i18n';
import { fmt } from '../../lib/format';
import { BAYES_C, GLOBAL_MEAN, matchScores } from '../../lib/match';
import { useStore } from '../../lib/store';
import { useIsDesktop } from '../../lib/useMedia';
import { demoState, EXAMPLE_ORGS, MIN_RANK, MIN_SCORE, pctBreakdown, QUICK, realOf, RING_CIRC, SCENARIOS, weightsText, type ScenarioKey } from './methodology';
import styles from './Methodology.module.css';

const FORMULA = () => tr('nota = (C × m + Σ notas) ÷ (C + n)', 'score = (C × m + Σ scores) ÷ (C + n)');

/** Fórmula com a explicação curta (computador) */
export function FormulaDesktop() {
  return (
    <div className={styles.formula}>
      <div className={`mono ${styles.formulaText}`}>{FORMULA()}</div>
      <div className={`small muted ${styles.formulaNote}`}>
        {tr(<>m é a média do setor; C = {BAYES_C} puxa para o neutro; n são as avaliações reais</>, <>m is the sector average; C = {BAYES_C} pulls towards neutral; n is the number of real reviews</>)}
      </div>
    </div>
  );
}

/** Fórmula num cartão escuro, com cada termo numa linha (telemóvel) */
export function FormulaCard() {
  return (
    <div className={`card dark ${styles.formulaCard}`}>
      <div className={`mono ${styles.formulaCardText}`}>{FORMULA()}</div>
      <div className={`mono ${styles.formulaTerms}`}>
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
  );
}

const ideas = () => [
  { n: 1, purple: false, t: tr('Comparamos com quem é parecido', 'We compare like with like'), d: tr('Uma padaria de 12 pessoas compara-se com o seu setor e dimensão.', 'A 12-person bakery is compared with its own sector and size.') },
  { n: 2, purple: false, t: tr('A % para ti é só tua', 'Your % match is yours alone'), d: tr('Usa as tuas 3 prioridades. Não muda a nota pública.', 'It uses your 3 priorities. It doesn’t change the public score.') },
  { n: 3, purple: true, t: tr('Ilegalidades não são apagadas', 'Illegal practices aren’t erased'), d: tr('Mostramos apoio e onde pedir ajuda. Não fazemos denúncias.', 'We show support and where to get help. We don’t file reports.') },
];

/** As três ideias principais (telemóvel) */
export function Ideas() {
  return (
    <section aria-label={tr('Ideias principais', 'Key ideas')} className={styles.ideas}>
      {ideas().map((r) => (
        <div key={r.n} className={styles.idea}>
          <span className={`num ${styles.ideaNum}`} data-purple={r.purple || undefined}>
            {r.n}
          </span>
          <div className={styles.ideaText}>
            <div className={`num ${styles.ideaTitle}`}>{r.t}</div>
            <div className={`body ${styles.ideaBody}`}>{r.d}</div>
          </div>
        </div>
      ))}
    </section>
  );
}

/** Experimenta: a nota ajustada consoante o n.º de avaliações e se são boas ou más */
export function ScoreDemo({ desktop = false }: { desktop?: boolean }) {
  const [n, setN] = useState(3);
  const [scenario, setScenario] = useState<ScenarioKey>('boa');
  const real = realOf(scenario);
  const s = demoState(real, n);
  const size = desktop ? 168 : 140;

  return (
    <section aria-labelledby="t-demo" className={`card ${styles.demo}`}>
      <div className={`row wrap between ${styles.demoHead}`}>
        <h2 id="t-demo" className={`h2 ${styles.demoTitle}`}>
          {tr('Experimenta', 'Try it')}
        </h2>
        <div className="segmented" role="group" aria-label={tr('Tipo de avaliações', 'Type of reviews')}>
          {SCENARIOS.map((x) => (
            <button key={x.k} type="button" aria-pressed={scenario === x.k} onClick={() => setScenario(x.k)}>
              {x.label()}
            </button>
          ))}
        </div>
      </div>

      <div className={`row wrap ${styles.demoBody}`}>
        <div className={styles.dial} style={{ '--size': `${size}px` } as CSSProperties}>
          <svg width={size} height={size} viewBox="0 0 188 188" aria-hidden="true" className={styles.dialSvg}>
            <circle cx="94" cy="94" r="80" fill="none" stroke="var(--line)" strokeWidth="16" />
            <circle
              cx="94"
              cy="94"
              r="80"
              fill="none"
              strokeWidth="16"
              strokeLinecap="round"
              strokeDasharray={RING_CIRC}
              className={styles.dialValue}
              data-shown={s.shown || undefined}
              style={{ '--offset': s.offset } as CSSProperties}
            />
          </svg>
          <div
            role="img"
            aria-label={tr(
              `Nota ajustada ${fmt(s.adj)} de 5 com ${n} avaliações${s.shown ? '' : ', ainda não publicada'}`,
              `Adjusted score ${fmt(s.adj)} out of 5 with ${n} reviews${s.shown ? '' : ', not published yet'}`,
            )}
            className={styles.dialText}
          >
            <span className={`num ${styles.dialValueText}`} data-shown={s.shown || undefined}>
              {fmt(s.adj)}
            </span>
            <span className="small muted">{tr('nota ajustada', 'adjusted score')}</span>
          </div>
        </div>
        <div aria-live="polite" className={styles.demoInfo}>
          <span className={`pill ${styles.status}`} data-shown={s.shown || undefined}>
            {s.status}
          </span>
          <span className={`body ${styles.demoLine}`}>
            {tr(
              <>
                Com <strong className={styles.ink}>{n === 1 ? '1 avaliação' : `${n} avaliações`}</strong>, {s.share}% da nota já é real.
              </>,
              <>
                With <strong className={styles.ink}>{n === 1 ? '1 review' : `${n} reviews`}</strong>, {s.share}% of the score is already real.
              </>,
            )}
          </span>
          <span className="small muted">
            {tr('Neutro', 'Neutral')} {fmt(GLOBAL_MEAN)} → {tr('média real', 'real average')} {fmt(real)}
          </span>
        </div>
      </div>

      <div className={styles.slider}>
        <label htmlFor="nrev" className={`row between ${styles.sliderLabel}`}>
          <span>{tr('Número de avaliações', 'Number of reviews')}</span>
          <span className={`mono ${styles.sliderValue}`}>{n}</span>
        </label>
        <input id="nrev" type="range" min={0} max={60} step={1} value={n} onChange={(e) => setN(Number.parseInt(e.target.value, 10) || 0)} className={styles.range} />
        <div role="group" aria-label={tr('Atalhos', 'Shortcuts')} className={`row wrap ${styles.quick}`}>
          {QUICK.map((q) => (
            <button key={q} type="button" aria-pressed={n === q} onClick={() => setN(q)} className={`mono ${styles.quickButton}`}>
              {q}
            </button>
          ))}
        </div>
      </div>
    </section>
  );
}

/** Contas da "% para ti" com uma organização de exemplo */
function PctDemo() {
  const { prefs } = useStore();
  const desktop = useIsDesktop();
  const [orgId, setOrgId] = useState(EXAMPLE_ORGS[0]?.id);
  const org = EXAMPLE_ORGS.find((o) => o.id === orgId) ?? EXAMPLE_ORGS[0];
  if (!org) return null;
  const { rows, sum, wsum } = pctBreakdown(org.scores, prefs);
  const pct = matchScores(org.scores, prefs);

  return (
    <div className={styles.pct}>
      <p className={styles.p}>
        {tr(`As tuas ${prefs.length} prioridades valem ${weightsText(prefs.length)}. Só tu vês esta %.`, `Your ${prefs.length} priorities are weighted ${weightsText(prefs.length)}. Only you can see this %.`)}
      </p>
      <div role="group" aria-label={tr('Organização de exemplo', 'Example organisation')} className="chips">
        {EXAMPLE_ORGS.map((o) => (
          <button key={o.id} type="button" className={`chip ${styles.chip}`} aria-pressed={o.id === org.id} onClick={() => setOrgId(o.id)}>
            {o.name}
          </button>
        ))}
      </div>
      {prefs.length === 0 ? (
        <p className={styles.p}>{tr('Ainda não escolheste prioridades.', 'You haven’t chosen any priorities yet.')}</p>
      ) : (
        <div className="stack">
          {rows.map(({ k, c, v, w, rank }) => (
            <div
              key={k}
              role="img"
              aria-label={
                v == null
                  ? tr(`${c.label}: não se aplica, não conta`, `${c.label}: doesn’t apply, not counted`)
                  : tr(`${c.label}: ${fmt(v)} vezes peso ${w} dá ${fmt(v * w)}`, `${c.label}: ${fmt(v)} times weight ${w} gives ${fmt(v * w)}`)
              }
              className={styles.pctRow}
            >
              <span className={`num ${styles.rank}`} style={{ '--c': c.color } as CSSProperties}>
                {rank}
              </span>
              <span className={`ellipsis ${styles.pctName}`} data-respeito={k === 'respeito' || undefined}>
                {desktop ? c.label : c.short}
              </span>
              <Dots value={v} color={c.color} size={10} gap={3} />
              <span className={`mono ${styles.mono13}`}>
                {v == null ? '—' : fmt(v)} × {w}
              </span>
              <span className={`mono ${styles.pctTotal}`}>{v == null ? '—' : fmt(v * w)}</span>
            </div>
          ))}
        </div>
      )}
      <div className={`row wrap between ${styles.pctFoot}`}>
        <span className={`mono row wrap ${styles.pctSum}`}>
          {fmt(sum)} ÷ (5 × {wsum}) =<span className={`pill pill-match ${styles.pctPill}`}>{tr(`${pct}% para ti`, `${pct}% for you`)}</span>
        </span>
        <Link to="/preferencias" className={`link ${styles.small14}`}>
          {tr('Mudar prioridades', 'Change priorities')} <Icon name="next" size={16} />
        </Link>
      </div>
    </div>
  );
}

const rules = (): { t: string; d: ReactNode }[] => [
  {
    t: tr(`Mínimo de ${MIN_SCORE} avaliações`, `At least ${MIN_SCORE} reviews`),
    d: tr(
      `Com menos de ${MIN_SCORE}, a organização tem página mas não mostra nota. Com ${MIN_RANK}, entra no ranking.`,
      `With fewer than ${MIN_SCORE}, the organisation has a page but no score. With ${MIN_RANK}, it enters the ranking.`,
    ),
  },
  {
    t: tr('Compara-se com quem é parecido', 'Compared with similar places'),
    d: tr('Uma padaria de 12 pessoas é comparada com o mesmo setor e dimensão, não com multinacionais.', 'A 12-person bakery is compared with the same sector and size, not with multinationals.'),
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
    d: tr('As organizações podem responder, mas não pagam para subir no ranking nem para esconder avaliações.', 'Organisations can reply, but they can’t pay to rank higher or to hide reviews.'),
  },
  {
    t: tr('Moderação com critério', 'Moderation with judgement'),
    d: (
      <div className={styles.moderation}>
        <div>
          {tr(
            <>
              <span className={styles.stays}>Fica:</span> críticas duras, quando descrevem factos.
            </>,
            <>
              <span className={styles.stays}>Stays:</span> harsh criticism, when it describes facts.
            </>,
          )}
        </div>
        <div>
          {tr(
            <>
              <span className={styles.goes}>Sai:</span> nomes, insultos, ameaças e dados pessoais.
            </>,
            <>
              <span className={styles.goes}>Goes:</span> names, insults, threats and personal data.
            </>,
          )}
        </div>
      </div>
    ),
  },
];

function AccItem({ title, open, onToggle, id, children }: { title: ReactNode; open: boolean; onToggle: () => void; id: string; children: ReactNode }) {
  return (
    <div className={styles.accItem}>
      <h3 className={styles.accHeading}>
        <button type="button" aria-expanded={open} aria-controls={id} onClick={onToggle} className={`row between ${styles.accButton}`}>
          <span>{title}</span>
          <Icon name="plus" size={20} className={styles.accIcon} />
        </button>
      </h3>
      {open && (
        <div id={id} className={`fade-up body ${styles.accBody}`}>
          {children}
        </div>
      )}
    </div>
  );
}

/** As regras, num acordeão em que só uma está aberta */
export function Rules() {
  const [open, setOpen] = useState<string | null>(null);
  const toggle = (k: string) => () => setOpen((cur) => (cur === k ? null : k));
  return (
    <section aria-labelledby="t-regras" className="stack">
      <h2 id="t-regras" className={`h2 ${styles.rulesTitle}`}>
        {tr('As regras, sem letra pequena', 'The rules, no small print')}
      </h2>
      <AccItem title={tr('Como nasce a tua “% para ti”', 'How your “% match” is worked out')} open={open === 'pct'} onToggle={toggle('pct')} id="acc-pct">
        <PctDemo />
      </AccItem>
      {rules().map((r, i) => (
        <AccItem key={r.t} title={r.t} open={open === String(i)} onToggle={toggle(String(i))} id={`acc-${i}`}>
          {typeof r.d === 'string' ? <p className={`${styles.p} ${styles.ruleText}`}>{r.d}</p> : r.d}
        </AccItem>
      ))}
      <div className={styles.accEnd} />
    </section>
  );
}

/** Respeito e inclusão: o critério à parte e os contactos de apoio */
export function RespeitoSupport({ desktop = false }: { desktop?: boolean }) {
  return (
    <section aria-labelledby="t-resp" className={`card purple ${styles.resp}`}>
      <div className={`row ${styles.respHead}`}>
        <Ring
          value={4.8}
          size={desktop ? 72 : 60}
          color="var(--purple)"
          track="var(--purple-line)"
          inner="var(--purple-tint)"
          ariaLabel={tr('Exemplo: Respeito e inclusão 4,8 de 5', 'Example: Respect and inclusion 4.8 out of 5')}
          fontSize={desktop ? 22 : 19}
        />
        <h2 id="t-resp" className={`h2 ${styles.respTitle}`}>
          {tr('Respeito e inclusão tem lugar próprio.', 'Respect and inclusion has its own place.')}
        </h2>
      </div>
      <p className={`body ${styles.respText}`}>
        {tr(
          'Direitos, diversidade e ambiente sem assédio, sempre visível à parte. Possível ilegalidade? Quem escreveu recebe uma mensagem privada de apoio.',
          'Rights, diversity and a harassment-free workplace, always shown separately. Possibly illegal? Whoever wrote it gets a private support message.',
        )}
      </p>
      <div className="stack">
        {SUPPORT.map((s) => (
          <div key={s.short} className={styles.contact}>
            <span className={`num ${styles.contactShort}`}>{s.short}</span>
            <span className={styles.contactText}>
              <span className={styles.contactName}>
                {s.full}
                {s.phone && s.tel && (
                  <>
                    {' '}
                    ·{' '}
                    <a href={s.tel} className={styles.purpleLink}>
                      {s.phone}
                    </a>
                  </>
                )}
              </span>
              <span className={`small body ${styles.contactNote}`}>
                {s.note}
                {s.email && (
                  <>
                    {' '}
                    ·{' '}
                    <a href={`mailto:${s.email}`} className={styles.purpleLink}>
                      {s.email}
                    </a>
                  </>
                )}{' '}
                ·{' '}
                <a href={s.url} target="_blank" rel="noreferrer" className={`${styles.purpleLink} ${styles.site}`}>
                  {s.site} ↗
                </a>
              </span>
            </span>
          </div>
        ))}
        <div className={`small body ${styles.danger}`}>
          {tr(
            <>
              Em perigo imediato, liga <strong className={styles.ink}>112</strong>. A PeekJob não apresenta queixas por ti nem partilha a mensagem com a organização.
            </>,
            <>
              In immediate danger, call <strong className={styles.ink}>112</strong>. PeekJob doesn’t file complaints for you or share the message with the organisation.
            </>,
          )}
        </div>
      </div>
      <div className={`row wrap ${styles.respLinks}`}>
        <Link to="/apoio" className={`link ${styles.respLink}`}>
          {tr('Página de apoio', 'Support page')} <Icon name="next" size={16} />
        </Link>
        <Link to="/ranking" className={`link ${styles.respLink}`}>
          {tr('Ver o ranking', 'See the ranking')} <Icon name="next" size={16} />
        </Link>
      </div>
    </section>
  );
}

/** Privacidade e RGPD (âncora #privacidade, ligada do rodapé) */
export function Privacy() {
  const stats = analytics.configured();
  return (
    <section id="privacidade" aria-labelledby="t-priv" className={styles.privacy}>
      <div className={`row ${styles.privacyHead}`}>
        <Icon name="lock" size={22} />
        <h2 id="t-priv" className={`h2 ${styles.rulesTitle} ${styles.flush}`}>
          {tr('Privacidade e RGPD', 'Privacy and GDPR')}
        </h2>
      </div>
      <ul className={`body ${styles.privacyList}`}>
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
        {stats && (
          <li>
            {tr(
              'Estatísticas (Google Analytics) só com a tua autorização: medimos páginas e passos, nunca o que escreves, onde trabalhas, o teu email ou o NIF. Sem publicidade.',
              'Statistics (Google Analytics) only with your permission: we measure pages and steps, never what you write, where you work, your email or your NIF. No ads.',
            )}
          </li>
        )}
      </ul>
      {stats && (
        <button type="button" className={`link ${styles.consent}`} onClick={openConsent}>
          {tr('Gerir estatísticas', 'Manage statistics')} <Icon name="next" size={16} />
        </button>
      )}
      <Link to="/perfil/dados" className={`link ${styles.start} ${styles.small14}`}>
        {tr('Exportar ou apagar os meus dados', 'Export or delete my data')} <Icon name="next" size={16} />
      </Link>
    </section>
  );
}
