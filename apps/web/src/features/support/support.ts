import { supportTips } from '../../data/content';
import { tr } from '../../i18n';
import { flagLabel } from '../../i18n/labels';
import type { SupportMessage } from '../../lib/store';

/** Textos do ecrã de apoio (funções puras: testadas sem React) */

/** A mensagem de apoio (gerada por um relato grave) e os avisos da moderação */
export function splitMessages(messages: SupportMessage[]) {
  return {
    support: messages.find((m) => (m.type ?? 'support') === 'support'),
    notices: messages.filter((m) => m.type === 'moderation'),
  };
}

/** Introdução: o que o relato pode configurar, ou o texto geral */
export function introText(msg: SupportMessage | undefined, desktop: boolean) {
  if (!msg) {
    return tr(
      'Se algo no teu trabalho pode ser ilegal — salários em atraso, assédio, discriminação — estas entidades ajudam, sem custos.',
      'If something at your work may be illegal — late pay, harassment, discrimination — these organisations can help, free of charge.',
    );
  }
  return tr(
    `O que descreveste pode configurar ${msg.kinds.map(flagLabel).join(' e ')}. Estas entidades ajudam${desktop ? '-te' : ''}, sem custos.`,
    `What you described may amount to ${msg.kinds.map(flagLabel).join(' and ')}. These organisations can help${desktop ? ' you' : ''}, free of charge.`,
  );
}

export const foundText = (msg: SupportMessage | undefined) => (msg?.found.length ? `${tr('Na tua avaliação: ', 'In your review: ')}${msg.found.map(flagLabel).join(', ')}.` : null);

/** Título de um aviso da moderação conforme a decisão */
export function noticeTitle(n: SupportMessage) {
  const org = n.orgName ?? n.details?.orgName ?? tr('uma organização', 'an organisation');
  if (n.details?.decision === 'removed') return tr(`A tua avaliação de ${org} foi removida.`, `Your review of ${org} was removed.`);
  if (n.details?.decision === 'upheld') return tr(`A tua denúncia sobre ${org} foi aceite: a avaliação foi removida.`, `Your report about ${org} was upheld: the review was removed.`);
  return tr(`Analisámos a tua denúncia sobre ${org}: a avaliação mantém-se.`, `We reviewed your report about ${org}: the review stays.`);
}

/** Conselhos (no computador há espaço para mais um) */
export const tips = (desktop: boolean) => [...supportTips(), ...(desktop ? [tr('Confirma horários e contactos no site de cada entidade.', 'Check opening hours and contact details on each organisation’s website.')] : [])];

export const DISCLAIMER = () =>
  tr(
    'A PeekJob não apresenta queixas por ti nem partilha esta mensagem com a organização — não é uma entidade de denúncia.',
    'PeekJob doesn’t file complaints for you or share this message with the organisation — we’re not a reporting body.',
  );
