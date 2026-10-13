import { REPORT_REASONS } from '../../data/content';
import { tr } from '../../i18n';
import { ago, plural } from '../../lib/format';

/** Regras e textos da moderação (funções puras: testadas sem React) */

/** Justificação mínima para decidir uma denúncia, e para rejeitar uma organização */
export const NOTE_MIN = 10;
export const REJECT_NOTE_MIN = 5;
/** Quanto tempo fica o aviso de decisão tomada */
export const NOTICE_MS = 5000;

const DAY = 86_400_000;

/** "há 2 dias" a partir de uma data ISO */
export const sinceIso = (iso: string, now = Date.now()) => ago(Math.floor((now - new Date(iso).getTime()) / DAY));

export const reasonLabel = (id: string) =>
  REPORT_REASONS.find((r) => r.id === id)?.label ?? (id === 'ilegal' ? tr('Possível ilegalidade', 'Possibly illegal') : tr('Outro motivo', 'Other reason'));

/** Justificações frequentes (o texto chega a quem escreveu e a quem denunciou) */
export const removeTemplates = () => [
  tr('Identifica uma pessoa pelo nome ou por detalhes.', 'It identifies a person by name or by details.'),
  tr('Usa linguagem ofensiva ou insultos.', 'It uses offensive language or insults.'),
  tr('Contém dados privados (moradas, telefones, saúde).', 'It contains private data (addresses, phone numbers, health).'),
];
export const keepTemplates = () => [
  tr('Não viola as regras: é uma crítica ao trabalho, sem ataques pessoais.', 'It doesn’t break the rules: it criticises the work, without personal attacks.'),
  tr('Não há indícios de que seja falsa.', 'There is no sign that it is fake.'),
];
export const rejectTemplates = () => [
  tr('Não encontrámos esta organização.', 'We couldn’t find this organisation.'),
  tr('Parece criada para difamar.', 'It looks like it was created to defame.'),
  tr('É uma pessoa, não uma organização.', 'It is a person, not an organisation.'),
];

export type Decision = 'remove' | 'keep';

export const decisionNotice = (action: Decision) =>
  action === 'remove'
    ? tr('Avaliação removida. Avisámos quem escreveu e quem denunciou.', 'Review removed. We let the author and the reporters know.')
    : tr('Avaliação mantida. Avisámos quem denunciou.', 'Review kept. We let the reporters know.');

export const reportsText = (n: number) => plural(n, tr('denúncia', 'report'), tr('denúncias', 'reports'));

export const reviewersText = (n: number) =>
  n ? plural(n, tr('pessoa já avaliou', 'person has reviewed it'), tr('pessoas já avaliaram', 'people have reviewed it')) : tr('Ainda sem avaliações', 'No reviews yet');

/** "PME · Porto · Rua … · NIF …" */
export const orgDetails = (typeLabel: string, o: { city: string; address: string | null; nif: string | null }) =>
  `${typeLabel} · ${o.city}${o.address ? ` · ${o.address}` : ''}${o.nif ? ` · NIF ${o.nif}` : ''}`;
