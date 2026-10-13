import { tr } from '../../i18n';

/** Textos do ecrã "os teus dados" (funções puras: testadas sem React) */

/** O que guardamos sobre quem tem conta */
export const KEPT = () => [
  tr('O teu email não é guardado: só um código derivado dele, que não permite recuperá-lo.', 'We don’t store your email: only a one-way code derived from it.'),
  tr('As tuas avaliações, ligadas a ti por um pseudónimo que nunca sai do servidor.', 'Your reviews, linked to you by a pseudonym that never leaves our server.'),
  tr('As verificações: só o “sim” (sem o email de trabalho nem o documento).', 'Verifications: only the “yes” (never the work email or the document).'),
  tr('As tuas mensagens privadas e as denúncias que fizeste.', 'Your private messages and the reports you made.'),
];

/** O que aconteceu às avaliações depois de apagar a conta */
export const deletedText = (keepReviews: boolean) =>
  keepReviews
    ? tr('As tuas avaliações continuam publicadas, mas já não estão ligadas a ti.', 'Your reviews stay published, but they are no longer linked to you.')
    : tr('Apagámos também as tuas avaliações, verificações e mensagens.', 'We also deleted your reviews, verifications and messages.');

export type Busy = 'export' | 'delete' | null;

export const downloadLabel = (busy: Busy) => (busy === 'export' ? tr('A preparar…', 'Preparing…') : tr('Descarregar', 'Download'));
export const deleteLabel = (busy: Busy) => (busy === 'delete' ? tr('A apagar…', 'Deleting…') : tr('Apagar definitivamente', 'Delete permanently'));
