import { Link } from 'react-router-dom';
import { Shell } from '../components/Layout';
import { Accordion } from '../components/UI';
import { PLANS } from '../data/content';
import { ORG_BY_ID } from '../data/orgs';
import { fmt, signed } from '../lib/format';
import { useIsDesktop } from '../lib/useMedia';

const STEPS = [
  { t: 'Reivindica a tua página', d: 'Email do domínio, documento da associação ou NIF.' },
  { t: 'Responde em público', d: 'A resposta fica por baixo de cada avaliação.' },
  { t: 'Vê o pulso da semana', d: 'O que subiu, o que desceu e as tags.' },
];

const FAQ = [
  {
    q: 'Sabem quem escreveu cada avaliação?',
    a: 'Não. Nem nós sabemos: o email de quem avalia nunca fica ligado ao que escreve. Pedimos-te que respondas ao conteúdo, sem tentar identificar ninguém.',
  },
  {
    q: 'Posso pedir para remover uma avaliação?',
    a: 'Só se violar as regras da comunidade (por exemplo, dados pessoais, insultos ou ameaças). Uma avaliação negativa não é motivo de remoção — a resposta pública é o caminho.',
  },
  {
    q: 'Pagar o Pro melhora a nossa posição?',
    a: 'Nunca. O ranking depende só das avaliações. O Pro dá-te ferramentas, não pontos: a nota só mexe quando quem trabalha contigo muda de opinião.',
  },
  {
    q: 'Como se ganha o selo de Respeito e inclusão?',
    a: 'Por mérito: só com nota de Respeito acima de 4,5 e avaliações suficientes. Não se compra.',
  },
  {
    q: 'Somos uma associação de voluntariado. Faz sentido?',
    a: 'Sim. A PeekJob foi pensada para casas pequenas: associações, voluntariado, PME e quem trabalha em nome individual.',
  },
];

/** Exemplo do anel: a página demonstrativa (Padaria Ribeira) */
const EXAMPLE = ORG_BY_ID['padaria-ribeira'];

export default function ParaOrganizacoes() {
  const desktop = useIsDesktop();

  const heroRing = (
    <div aria-hidden="true" style={{ position: 'relative', width: desktop ? 280 : 200, maxWidth: '100%', aspectRatio: '1' }}>
      <div className="pulse" style={{ position: 'absolute', inset: '8%', borderRadius: '50%', border: '3px solid var(--teal)' }} />
      <div
        style={{
          position: 'absolute',
          inset: '8%',
          borderRadius: '50%',
          background: `conic-gradient(var(--teal) ${Math.round((EXAMPLE.score / 5) * 360)}deg, var(--line) 0)`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <div
          style={{ width: '78%', height: '78%', borderRadius: '50%', background: 'var(--ground)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 4 }}
        >
          <span className="num" style={{ fontSize: desktop ? 64 : 48, lineHeight: 1 }}>
            {fmt(EXAMPLE.score)}
          </span>
          <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--up)' }}>▲ {signed(EXAMPLE.weekDelta).replace('+', '')} esta semana</span>
        </div>
      </div>
    </div>
  );

  return (
    <Shell nav>
      <div className={desktop ? 'container' : 'page'} style={desktop ? { paddingTop: 32, paddingBottom: 80 } : { gap: 40 }}>
        {/* Hero */}
        <section aria-labelledby="po-h" className="row wrap" style={{ gap: desktop ? 48 : 24, alignItems: 'center' }}>
          <div className="stack" style={{ flex: desktop ? '1.3 1 480px' : '1 1 100%', minWidth: 0, gap: desktop ? 20 : 16 }}>
            <span className="label">Para organizações</span>
            <h1 id="po-h" className="h1" style={{ fontSize: desktop ? 56 : 38, lineHeight: 1 }}>
              A tua equipa já fala de ti. Responde.
            </h1>
            <p className="lead" style={{ fontSize: 16 }}>
              Para PME, associações, voluntariado e nome individual.
            </p>
            <div className="row wrap" style={{ gap: 12, paddingTop: 8 }}>
              <Link to="/painel" className={'btn btn-primary lift' + (desktop ? '' : ' btn-block')} style={{ height: 56, padding: '0 28px' }}>
                Reivindicar a minha página
              </Link>
              <Link to="/metodologia" className={'btn btn-dark lift' + (desktop ? '' : ' btn-block')} style={{ height: 56, padding: '0 24px' }}>
                Como calculamos
              </Link>
            </div>
          </div>
          <div className="row" style={{ flex: desktop ? '1 1 320px' : '1 1 100%', minWidth: 0, justifyContent: 'center' }}>
            {heroRing}
          </div>
        </section>

        {/* Como funciona + FAQ */}
        <div className="row wrap" style={{ paddingTop: desktop ? 56 : 0, gap: desktop ? '40px 64px' : 40, alignItems: 'flex-start' }}>
          <section aria-labelledby="cf" className="stack" style={{ flex: '1 1 340px', minWidth: 0, gap: 24 }}>
            <h2 id="cf" className="h2" style={{ fontSize: 24 }}>
              Como funciona
            </h2>
            <ol className="stack" style={{ margin: 0, padding: 0, listStyle: 'none', gap: 22 }}>
              {STEPS.map((s, i) => (
                <li key={s.t} className="row" style={{ gap: 14, alignItems: 'flex-start' }}>
                  <span
                    aria-hidden="true"
                    className="num"
                    style={{ flex: 'none', width: 40, height: 40, borderRadius: 20, border: '4px solid var(--teal)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 16 }}
                  >
                    {i + 1}
                  </span>
                  <span className="stack" style={{ gap: 4 }}>
                    <span style={{ fontSize: 16, fontWeight: 600 }}>{s.t}</span>
                    <span className="small muted" style={{ lineHeight: 1.45 }}>
                      {s.d}
                    </span>
                  </span>
                </li>
              ))}
            </ol>
          </section>
          <section aria-labelledby="fq" className="stack" style={{ flex: desktop ? '1.5 1 480px' : '1 1 100%', minWidth: 0, gap: 8 }}>
            <div className="row wrap between" style={{ alignItems: 'baseline', gap: 8 }}>
              <h2 id="fq" className="h2" style={{ fontSize: 24 }}>
                Perguntas frequentes
              </h2>
              <Link to="/metodologia" className="link small">
                Como calculamos
              </Link>
            </div>
            <Accordion items={FAQ.map((f) => ({ title: f.q, body: f.a }))} />
          </section>
        </div>

        {/* Planos */}
        <section aria-labelledby="pl" className="stack" style={{ paddingTop: desktop ? 56 : 0, gap: 24 }}>
          <div className="stack" style={{ gap: 6 }}>
            <h2 id="pl" className="h2" style={{ fontSize: 24 }}>
              Planos
            </h2>
            <span className="body" style={{ fontSize: 15, fontWeight: 600 }}>
              Nunca vendemos posição no ranking nem apagamos avaliações.
            </span>
          </div>
          <div className="row wrap" style={{ gap: 20, alignItems: 'stretch' }}>
            {PLANS.map((p, i) => {
              const pro = i > 0;
              return (
                <article
                  key={p.name}
                  className="lift stack"
                  aria-labelledby={`plan-${i}`}
                  style={{ flex: '1 1 320px', minWidth: 0, background: 'var(--surface)', border: `2px solid ${pro ? 'var(--teal)' : 'var(--line)'}`, borderRadius: 28, padding: desktop ? 28 : 22, gap: 18 }}
                >
                  <div className="row wrap between" style={{ alignItems: 'baseline', gap: 12 }}>
                    <h3 id={`plan-${i}`} className="num" style={{ margin: 0, fontSize: 24 }}>
                      {p.name}
                    </h3>
                    <span className="row" style={{ alignItems: 'baseline', gap: 6 }}>
                      <span className="num" style={{ fontSize: 32, lineHeight: 1 }}>
                        {p.price}
                      </span>
                      <span className="small muted">{p.per}</span>
                    </span>
                  </div>
                  <ul className="stack" style={{ margin: 0, padding: 0, listStyle: 'none', gap: 10 }}>
                    {p.points.map((it) => (
                      <li key={it} className="row" style={{ gap: 12, fontSize: 15, lineHeight: 1.4 }}>
                        <span aria-hidden="true" style={{ flex: 'none', width: 14, height: 14, borderRadius: 7, border: `3px solid ${pro ? 'var(--teal)' : 'var(--grey)'}` }} />
                        {it}
                      </li>
                    ))}
                  </ul>
                  <Link to="/painel" className={'btn btn-block ' + (pro ? 'btn-primary' : 'btn-dark')} style={{ marginTop: 'auto', borderRadius: 16 }}>
                    {pro ? 'Experimentar Pro' : 'Começar grátis'}
                  </Link>
                </article>
              );
            })}
          </div>
        </section>
      </div>
    </Shell>
  );
}
