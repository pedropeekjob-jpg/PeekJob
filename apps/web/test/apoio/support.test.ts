import { describe, expect, it } from 'vitest';
import { DISCLAIMER, foundText, introText, noticeTitle, splitMessages, supportHref, supportKinds, tips } from '../../src/features/support/support';
import type { SupportMessage } from '../../src/lib/store';

const msg = (over: Partial<SupportMessage> = {}): SupportMessage => ({
  id: 'm1',
  orgId: 'o1',
  kinds: ['assédio'],
  found: [],
  when: 'hoje',
  read: false,
  ...over,
});

describe('apoio: regras e textos', () => {
  it('separa a mensagem de apoio (tipo omisso conta como apoio) dos avisos da moderação', () => {
    const notice = msg({ id: 'n1', type: 'moderation' });
    const legacy = msg({ id: 'm0' });
    const { support, notices } = splitMessages([notice, legacy, msg({ id: 'm2', type: 'support' })]);
    expect(support?.id).toBe('m0');
    expect(notices).toEqual([notice]);
    expect(splitMessages([])).toEqual({ support: undefined, notices: [] });
  });

  it('introdução geral sem mensagem; com mensagem junta os tipos e trata por tu no computador', () => {
    expect(introText(undefined, true)).toMatch(/^Se algo no teu trabalho pode ser ilegal/);
    const m = msg({ kinds: ['assédio', 'discriminação'] });
    expect(introText(m, false)).toBe('O que descreveste pode configurar assédio e discriminação. Estas entidades ajudam, sem custos.');
    expect(introText(m, true)).toContain('Estas entidades ajudam-te, sem custos.');
  });

  it('o que se encontrou na avaliação, ou nada', () => {
    expect(foundText(undefined)).toBeNull();
    expect(foundText(msg())).toBeNull();
    expect(foundText(msg({ found: ['assédio', 'insultos'] }))).toBe('Na tua avaliação: assédio, insultos.');
  });

  it('título do aviso conforme a decisão e o nome disponível', () => {
    const d = (decision: 'removed' | 'upheld' | 'rejected', orgName?: string) => ({ decision, note: '', orgName });
    expect(noticeTitle(msg({ orgName: 'Padaria', details: d('removed') }))).toBe('A tua avaliação de Padaria foi removida.');
    expect(noticeTitle(msg({ details: d('upheld', 'Loja') }))).toBe('A tua denúncia sobre Loja foi aceite: a avaliação foi removida.');
    expect(noticeTitle(msg({ details: d('rejected') }))).toBe('Analisámos a tua denúncia sobre uma organização: a avaliação mantém-se.');
    expect(noticeTitle(msg({ details: null }))).toMatch(/a avaliação mantém-se\.$/);
  });

  it('título do aviso sobre uma entrevista', () => {
    const d = (decision: 'removed' | 'upheld' | 'rejected') => ({ decision, note: '', orgName: 'Loja', kind: 'interview' as const });
    expect(noticeTitle(msg({ details: d('removed') }))).toBe('A tua entrevista de Loja foi removida.');
    expect(noticeTitle(msg({ details: d('upheld') }))).toBe('A tua denúncia sobre Loja foi aceite: a entrevista foi removida.');
    expect(noticeTitle(msg({ details: d('rejected') }))).toBe('Analisámos a tua denúncia sobre Loja: a entrevista mantém-se.');
  });

  it('conselhos: mais um no computador; aviso legal', () => {
    expect(tips(true)).toHaveLength(tips(false).length + 1);
    expect(tips(true).at(-1)).toMatch(/^Confirma horários/);
    expect(DISCLAIMER()).toMatch(/Só te mostramos quem pode ajudar\.$/);
  });

  it('conselhos para o que foi relatado primeiro, sem repetir, e o do sindicato no fim', () => {
    const salary = tips(false, ['incumprimento salarial']);
    expect(salary[0]).toMatch(/^Guarda os recibos e os extratos/);
    expect(salary.at(-1)).toBe('Fala com o sindicato do teu setor, se existir.');
    const two = tips(false, ['assédio moral', 'discriminação']);
    expect(two).toHaveLength(7);
    expect(new Set(two).size).toBe(two.length);
    // tema desconhecido: os conselhos gerais
    expect(tips(false, ['outra coisa'])).toEqual(tips(false));
  });

  it('temas: os da mensagem, ou os do endereço; ligação com os temas', () => {
    expect(supportKinds(msg({ kinds: ['assédio sexual'] }), 'discriminação')).toEqual(['assédio sexual']);
    expect(supportKinds(undefined, 'incumprimento salarial, assédio moral')).toEqual(['incumprimento salarial', 'assédio moral']);
    expect(supportKinds(undefined, null)).toEqual([]);
    expect(supportHref([])).toBe('/apoio');
    expect(supportHref(['assédio moral'])).toBe('/apoio?temas=ass%C3%A9dio+moral');
    expect(introText(undefined, false, ['assédio moral'])).toMatch(/^O que descreveste pode configurar assédio moral/);
  });
});
