import { describe, expect, it } from 'vitest';
import { DISCLAIMER, foundText, introText, noticeTitle, splitMessages, tips } from '../../src/features/support/support';
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

  it('conselhos: mais um no computador; aviso legal', () => {
    expect(tips(true)).toHaveLength(tips(false).length + 1);
    expect(tips(true).at(-1)).toMatch(/^Confirma horários/);
    expect(DISCLAIMER()).toMatch(/não é uma entidade de denúncia\.$/);
  });
});
