import type { Org } from '../../data/orgs';
import { tr } from '../../i18n';
import { fmt, plural } from '../../lib/format';

/** Regras e textos das guardadas (funções puras: testadas sem React) */

/**
 * Dados de exemplo do POC: organizações cuja mudança da semana vem do critério Respeito e inclusão
 * (em produção viria do histórico de notas por critério).
 */
export const RESPEITO_MOVES = new Set(['rede-vizinha']);

/** Quanto tempo fica o aviso de "Desfazer" */
export const UNDO_MS = 8000;

export type ChangeKind = 'respeito' | 'up' | 'down' | 'new' | 'none';

/** Mudança desde que guardaste, a partir de weekDelta (texto curto no telemóvel) */
export function changeNote(o: Org, short = false): { text: string; kind: ChangeKind; aria?: string } {
  const d = o.weekDelta;
  const r = o.scores.respeito;
  if (d > 0 && RESPEITO_MOVES.has(o.id) && r != null) {
    return {
      text: tr(`▲ ${short ? 'Respeito' : 'Respeito e inclusão'} subiu para ${fmt(r)}`, `▲ ${short ? 'Respect' : 'Respect and inclusion'} up to ${fmt(r)}`),
      kind: 'respeito',
      aria: tr(`Respeito e inclusão subiu para ${fmt(r)}`, `Respect and inclusion up to ${fmt(r)}`),
    };
  }
  if (d > 0) return { text: tr(`▲ ${fmt(d)} desde que guardaste`, `▲ ${fmt(d)} since you saved it`), kind: 'up', aria: tr(`Subiu ${fmt(d)} desde que guardaste`, `Up ${fmt(d)} since you saved it`) };
  if (d < 0) {
    const v = fmt(Math.abs(d));
    return { text: tr(`▼ ${v} desde que guardaste`, `▼ ${v} since you saved it`), kind: 'down', aria: tr(`Desceu ${v} desde que guardaste`, `Down ${v} since you saved it`) };
  }
  if (o.trend === 'novo') return { text: tr('Nova no ranking', 'New in the ranking'), kind: 'new' };
  return { text: tr('Sem mudanças desde que guardaste', 'No changes since you saved it'), kind: 'none' };
}

/** As organizações guardadas, pela ordem em que foram guardadas (ignora as que já não existem) */
export const savedOrgs = (saved: string[], orgs: Org[]) => saved.map((id) => orgs.find((o) => o.id === id)).filter((o): o is Org => !!o);

export const orgCount = (n: number) => plural(n, tr('organização', 'organisation'), tr('organizações', 'organisations'));
