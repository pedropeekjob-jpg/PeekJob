import { tr } from '../../i18n';
import { fmt } from '../../lib/format';

/** Conteúdo e regras da página para organizações (funções puras: testadas sem React) */

export const STEPS = () => [
  {
    t: tr('Reivindica a tua página', 'Claim your page'),
    d: tr('Email do domínio, documento da associação ou NIF.', 'Domain email, association document or NIF (Portuguese tax number).'),
  },
  { t: tr('Responde em público', 'Reply in public'), d: tr('A resposta fica por baixo de cada avaliação.', 'Your reply sits under each review.') },
  { t: tr('Vê o pulso da semana', 'See the weekly pulse'), d: tr('O que subiu, o que desceu e as tags.', 'What went up, what went down, and the tags.') },
];

export const FAQ = () => [
  {
    q: tr('Sabem quem escreveu cada avaliação?', 'Do you know who wrote each review?'),
    a: tr(
      'Não. Nem nós sabemos: o email de quem avalia nunca fica ligado ao que escreve. Pedimos-te que respondas ao conteúdo, sem tentar identificar ninguém.',
      'No. Not even we know: a reviewer’s email is never linked to what they write. Please reply to the content and don’t try to identify anyone.',
    ),
  },
  {
    q: tr('Posso pedir para remover uma avaliação?', 'Can I ask for a review to be removed?'),
    a: tr(
      'Só se violar as regras da comunidade (por exemplo, dados pessoais, insultos ou ameaças). Uma avaliação negativa não é motivo de remoção — a resposta pública é o caminho.',
      'Only if it breaks the community rules (for example, personal data, insults or threats). A negative review is no reason for removal — a public reply is the way.',
    ),
  },
  {
    q: tr('Pagar o Pro melhora a nossa posição?', 'Does paying for Pro improve our position?'),
    a: tr(
      'Nunca. O ranking depende só das avaliações. O Pro dá-te ferramentas, não pontos: a nota só mexe quando quem trabalha contigo muda de opinião.',
      'Never. The ranking depends only on reviews. Pro gives you tools, not points: your score only moves when the people who work with you change their minds.',
    ),
  },
  {
    q: tr('Como se ganha o selo de Respeito e inclusão?', 'How do you earn the Respect and inclusion badge?'),
    a: tr(
      'Por mérito: só com nota de Respeito acima de 4,5 e avaliações suficientes. Não se compra.',
      'On merit: only with a Respect score above 4.5 and enough reviews. It can’t be bought.',
    ),
  },
  {
    q: tr('Somos uma associação de voluntariado. Faz sentido?', 'We’re a volunteering association. Does this make sense for us?'),
    a: tr(
      'Sim. A PeekJob foi pensada para casas pequenas: associações, voluntariado, PME e quem trabalha em nome individual.',
      'Yes. PeekJob was designed for small places: associations, volunteering, SMEs and sole traders.',
    ),
  },
];

/** Graus do anel para uma nota de 0 a 5 */
export const ringDegrees = (score: number) => Math.round((score / 5) * 360);

/** Variação da semana com seta (▲ sobe, ▼ desce, = igual) */
export function weekTrend(delta: number) {
  const arrow = delta > 0 ? '▲' : delta < 0 ? '▼' : '=';
  return `${arrow} ${fmt(Math.abs(delta))} ${tr('esta semana', 'this week')}`;
}
