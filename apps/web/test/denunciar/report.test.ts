import { describe, expect, it } from 'vitest';
import { ORG_BY_ID } from '../../src/data/orgs';
import { decisionChannel, demoReference, findTarget, reportErrorText } from '../../src/features/report/report';

describe('denúncia: regras e textos', () => {
  it('referência da demonstração: estável para o mesmo momento e entre PJ-D-1000 e PJ-D-9999', () => {
    expect(demoReference('a/b/c', 123456)).toBe(demoReference('a/b/c', 123456));
    expect(demoReference('a/b/c', 123456)).not.toBe(demoReference('a/b/d', 123456));
    expect(demoReference('x', 1)).toMatch(/^PJ-D-\d{4}$/);
  });

  it('encontra a avaliação ou a entrevista; null se não existe', () => {
    const org = ORG_BY_ID['padaria-ribeira'];
    expect(findTarget(org, 'r1')).toMatchObject({ kind: 'avaliação', title: 'Equipa que se ajuda e chefia que ouve.' });
    expect(findTarget(org, 'i1')).toMatchObject({ kind: 'entrevista', meta: expect.stringMatching(/^Entrevista · Balcão · /) });
    expect(findTarget(org, 'zzz')).toBeNull();
    expect(findTarget(undefined, 'r1')).toBeNull();
    expect(findTarget(org, undefined)).toBeNull();
  });

  it('erros do servidor e como se sabe a decisão', () => {
    expect(reportErrorText(409, 'x')).toMatch(/^Já denunciaste/);
    expect(reportErrorText(400, 'x')).toMatch(/^Verifica o email/);
    expect(reportErrorText(500, 'Falhou.')).toBe('Falhou.');
    expect(decisionChannel(false, '')).toBe('Vês a decisão nas tuas mensagens.');
    expect(decisionChannel(true, ' a@b.pt ')).toBe('Recebes a decisão por email.');
    expect(decisionChannel(true, '  ')).toBe('');
  });
});
