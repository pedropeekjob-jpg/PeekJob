import { Link } from 'react-router';
import { Icon } from '../components/Icon';
import { MobileHomeHeader, Shell } from '../components/Layout';
import { tr } from '../i18n';
import { useIsDesktop } from '../lib/useMedia';
import '../styles/info.css';

/** Sobre: porque existe a PeekJob e o que a guia */
export default function Sobre() {
  const desktop = useIsDesktop();
  const principles = [
    {
      icon: 'lock',
      t: tr('Anonimato a sério', 'Real anonymity'),
      d: tr(
        'A organização nunca sabe quem escreveu. Não guardamos o teu email junto das avaliações nem os documentos de verificação.',
        'The organisation never knows who wrote a review. We don’t store your email with your reviews, and we never keep verification documents.',
      ),
    },
    {
      icon: 'heart',
      t: tr('Respeito e direitos humanos', 'Respect and human rights'),
      d: tr(
        'Respeito, inclusão e diversidade têm um lugar próprio em cada avaliação, e não ficam escondidos numa média.',
        'Respect, inclusion and diversity have their own place in every review, rather than being hidden in an average.',
      ),
    },
    {
      icon: 'shield',
      t: tr('A nota não está à venda', 'Scores aren’t for sale'),
      d: tr(
        'A fórmula é pública e igual para todas. Nenhuma organização paga para subir ou esconder avaliações.',
        'The formula is public and the same for everyone. No organisation can pay to rank higher or hide reviews.',
      ),
    },
    {
      icon: 'help',
      t: tr('Apoio quando algo corre mal', 'Support when something goes wrong'),
      d: tr(
        'Se uma avaliação descreve uma possível ilegalidade, quem a escreveu recebe em privado os contactos da ACT, CITE e APAV.',
        'If a review describes something that may be illegal, its author privately receives the contacts for ACT, CITE and APAV.',
      ),
    },
  ];

  return (
    <Shell nav footer>
      {!desktop && <MobileHomeHeader />}
      <div className={desktop ? 'container info-page' : 'info-page page-x'}>
        <section className="info-hero zone zone-band">
          <span className="info-eyebrow">{tr('Sobre a PeekJob', 'About PeekJob')}</span>
          <h1 className="info-title">
            {tr('Damos voz a quem trabalha nas organizações pequenas.', 'We give a voice to people who work at small organisations.')}
          </h1>
          <p className="info-lead">
            {tr(
              'PME, associações, voluntariado e empresas em nome individual empregam muita gente e quase nunca aparecem nas plataformas de avaliação. A PeekJob existe para que quem procura trabalho saiba como é lá dentro, e para que quem lá trabalha possa contar, sem medo.',
              'Small businesses, associations, volunteer groups and sole traders employ a lot of people, yet they rarely appear on review platforms. PeekJob exists so that job seekers know what it’s like inside, and so that the people who work there can say so without fear.',
            )}
          </p>
        </section>

        <section aria-labelledby="t-princ" className="stack info-section">
          <h2 id="t-princ" className="info-h2">{tr('O que nos guia', 'What guides us')}</h2>
          <div className="info-grid">
            {principles.map((p) => (
              <div key={p.t} className="info-card">
                <span className="info-icon"><Icon name={p.icon} size={22} /></span>
                <h3>{p.t}</h3>
                <p>{p.d}</p>
              </div>
            ))}
          </div>
        </section>

        <section aria-labelledby="t-how" className="info-doors">
          <h2 id="t-how" className="sr-only">{tr('Começar', 'Get started')}</h2>
          <Link to="/explorar" className="info-door info-door-peek" data-ev="cta_click" data-ev-cta="explorar" data-ev-area="sobre">
            <span className="info-eyebrow">{tr('Espreitar', 'Peek inside')}</span>
            <strong>{tr('Explorar organizações', 'Explore organisations')}</strong>
            <Icon name="arrow" size={20} />
          </Link>
          <Link to="/avaliar" className="info-door info-door-job zone" data-ev="cta_click" data-ev-cta="avaliar" data-ev-area="sobre">
            <span className="info-eyebrow">{tr('Avalia', 'Review')}</span>
            <strong>{tr('Avaliar onde trabalho', 'Review where I work')}</strong>
            <Icon name="arrow" size={20} />
          </Link>
        </section>

        <p className="info-more">
          <Link to="/metodologia" className="link">{tr('Como calculamos as notas', 'How we calculate scores')} <Icon name="next" size={16} /></Link>
          <Link to="/para-organizacoes" className="link">{tr('Para organizações', 'For organisations')} <Icon name="next" size={16} /></Link>
        </p>
      </div>
    </Shell>
  );
}
