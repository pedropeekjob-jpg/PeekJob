import { tipsFor } from '../../data/content';
import { getLang, tr } from '../../i18n';
import { flagLabel } from '../../i18n/labels';
import type { AppealState, SupportMessage } from '../../lib/store';

/** Textos do ecrã de apoio (funções puras: testadas sem React) */

/** A mensagem de apoio (gerada por um relato grave) e os avisos da moderação */
export function splitMessages(messages: SupportMessage[]) {
  return {
    support: messages.find((m) => (m.type ?? 'support') === 'support'),
    notices: messages.filter((m) => m.type === 'moderation'),
  };
}

/** Introdução: o que o relato pode configurar (da mensagem ou dos temas do endereço), ou o texto geral */
export function introText(msg: SupportMessage | undefined, desktop: boolean, kinds: readonly string[] = msg?.kinds ?? []) {
  if (!kinds.length) {
    return tr(
      'Se algo no teu trabalho pode ser ilegal — salários em atraso, assédio, discriminação — estas entidades ajudam, sem custos.',
      'If something at your work may be illegal — late pay, harassment, discrimination — these organisations can help, free of charge.',
    );
  }
  return tr(
    `O que descreveste pode configurar ${kinds.map(flagLabel).join(' e ')}. Estas entidades ajudam${desktop ? '-te' : ''}, sem custos.`,
    `What you described may amount to ${kinds.map(flagLabel).join(' and ')}. These organisations can help${desktop ? ' you' : ''}, free of charge.`,
  );
}

export const foundText = (msg: SupportMessage | undefined) => (msg?.found.length ? `${tr('Na tua avaliação: ', 'In your review: ')}${msg.found.map(flagLabel).join(', ')}.` : null);

/** Título de um aviso da moderação conforme a decisão */
export function noticeTitle(n: SupportMessage) {
  const org = n.orgName ?? n.details?.orgName ?? tr('uma organização', 'an organisation');
  if (n.details?.decision === 'appeal_confirmed') return tr(`Revimos a tua contestação sobre ${org}: a decisão mantém-se.`, `We reviewed your appeal about ${org}: the decision stands.`);
  if (n.details?.decision === 'appeal_reversed') return tr(`Revimos a tua contestação sobre ${org}: a decisão foi revertida.`, `We reviewed your appeal about ${org}: the decision was reversed.`);
  const [pt, en] = n.details?.kind === 'interview' ? ['entrevista', 'interview'] : ['avaliação', 'review'];
  if (n.details?.decision === 'removed') return tr(`A tua ${pt} de ${org} foi removida.`, `Your ${en} of ${org} was removed.`);
  if (n.details?.decision === 'upheld') return tr(`A tua denúncia sobre ${org} foi aceite: a ${pt} foi removida.`, `Your report about ${org} was upheld: the ${en} was removed.`);
  return tr(`Analisámos a tua denúncia sobre ${org}: a ${pt} mantém-se.`, `We reviewed your report about ${org}: the ${en} stays.`);
}

/** Conselhos para o que foi relatado, ou os gerais (no computador há espaço para mais um) */
export const tips = (desktop: boolean, kinds: readonly string[] = []) => [...tipsFor(kinds), ...(desktop ? [tr('Confirma horários e contactos no site de cada entidade.', 'Check opening hours and contact details on each organisation’s website.')] : [])];

/** Temas do relato: os da mensagem de apoio ou, sem sessão, os que vêm no endereço (?temas=a,b) */
export function supportKinds(msg: SupportMessage | undefined, param: string | null): string[] {
  if (msg?.kinds.length) return msg.kinds;
  return (param ?? '').split(',').map((k) => k.trim()).filter(Boolean);
}

/** Endereço do apoio com os temas do relato (para quem não tem sessão e não recebe a mensagem) */
export const supportHref = (kinds: readonly string[]) => (kinds.length ? `/apoio?${new URLSearchParams({ temas: kinds.join(',') })}` : '/apoio');

export const DISCLAIMER = () =>
  tr(
    'A PeekJob não trata nem resolve irregularidades: não apresenta queixas por ti nem partilha esta mensagem com a organização. Só te mostramos quem pode ajudar.',
    'PeekJob doesn’t handle or resolve irregularities: we don’t file complaints for you or share this message with the organisation. We just show you who can help.',
  );

/** Contestar: o que se mostra no aviso conforme o estado (a resposta chega como mensagem à parte) */
export function appealStatusText(a: AppealState | undefined): string | null {
  if (!a) return null;
  if (a.status === 'available') {
    const date = new Date(a.until).toLocaleDateString(getLang() === 'en' ? 'en-GB' : 'pt-PT', { timeZone: 'Europe/Lisbon' });
    return tr(`Podes pedir que a decisão seja revista até ${date}.`, `You can ask for this decision to be reviewed until ${date}.`);
  }
  if (a.status === 'open') return tr('Pedido de revisão em análise. Respondemos aqui.', 'Review request in progress. We’ll answer here.');
  if (a.status === 'expired') return tr('O prazo para contestar esta decisão terminou.', 'The deadline to appeal this decision has passed.');
  return null;
}

/** Depois de a decisão ser confirmada: os passos que restam (Regulamento dos Serviços Digitais, art. 21.º) */
export const OUT_OF_COURT = () =>
  tr(
    'Se continuares a discordar, podes recorrer a um organismo de resolução extrajudicial de litígios certificado (Regulamento dos Serviços Digitais, art. 21.º) ou aos tribunais.',
    'If you still disagree, you can turn to a certified out-of-court dispute settlement body (Digital Services Act, Art. 21) or to the courts.',
  );

export const APPEAL_MIN = 10;
