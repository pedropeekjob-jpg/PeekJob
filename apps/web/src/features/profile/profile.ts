import { CRITERION, type CriterionKey } from '../../data/criteria';
import type { Org } from '../../data/orgs';
import { tr } from '../../i18n';
import { whenLabel } from '../../i18n/labels';
import type { Draft, SupportMessage } from '../../lib/store';

/** Regras e textos da página da conta (funções puras: testadas sem React) */

export const unreadCount = (messages: SupportMessage[]) => messages.filter((m) => !m.read).length;

export const unreadLabel = (n: number) => `${n} ${n === 1 ? tr('mensagem nova', 'new message') : tr('mensagens novas', 'new messages')}`;

/** Nome de uma organização pelo id, com reserva quando não está carregada */
export const orgNameOf = (orgs: Org[], id: string) => orgs.find((o) => o.id === id)?.name ?? tr('Organização', 'Organisation');

/** "Ambiente e mais 2", ou "Escolher" sem prioridades */
export function prefsSummary(prefs: CriterionKey[]) {
  if (!prefs.length) return tr('Escolher', 'Choose');
  const more = prefs.length > 1 ? tr(` e mais ${prefs.length - 1}`, ` and ${prefs.length - 1} more`) : '';
  return `${CRITERION[prefs[0]].label}${more}`;
}

/** Verificação: a organização onde a pessoa está verificada, ou como se verifica */
export const verificationValue = (draft: Pick<Draft, 'verified' | 'orgId'>, orgs: Org[]) =>
  draft.verified && draft.orgId ? orgNameOf(orgs, draft.orgId) : tr('Email ou recibo', 'Email or payslip');

export const lastMessageWhen = (messages: SupportMessage[]) => (messages[0]?.when ? whenLabel(messages[0].when) : undefined);

export interface SettingLink {
  label: string;
  value?: string;
  to: string;
}

/** Definições (a moderação só para quem modera; "exportar ou apagar" só no computador) */
export function settingsLinks({ verification, desktop, moderator }: { verification: string; desktop: boolean; moderator: boolean }): SettingLink[] {
  return [
    { label: tr('Verificação', 'Verification'), value: verification, to: '/avaliar/verificar' },
    { label: tr('Como calculamos', 'How we score'), to: '/metodologia' },
    { label: tr('Privacidade e dados', 'Privacy and data'), value: desktop ? tr('Exportar ou apagar', 'Export or delete') : undefined, to: '/perfil/dados' },
    { label: tr('Gerir a minha organização', 'Manage my organisation'), to: '/painel' },
    ...(moderator ? [{ label: tr('Moderação', 'Moderation'), value: tr('Denúncias e organizações novas', 'Reports and new organisations'), to: '/moderacao' }] : []),
  ];
}
