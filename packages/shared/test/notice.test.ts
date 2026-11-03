import { describe, expect, it } from 'vitest';
import { contentLocation, LEGAL_GROUNDS, NOTICE_MIN_EXPLANATION, noticeProblems, type IllegalNotice } from '../src/notice';

/** Notificação de conteúdo ilegal (Regulamento dos Serviços Digitais, art. 16.º, n.º 2) */
describe('noticeProblems', () => {
  const ok: IllegalNotice = {
    legalGround: 'difamacao',
    explanation: 'Acusa a empresa de um crime que nunca aconteceu, com factos falsos que prejudicam a nossa reputação.',
    contactName: 'Rita Sousa',
    contactEmail: 'rita@exemplo.pt',
    goodFaith: true,
  };

  it('uma notificação completa não tem problemas', () => {
    expect(noticeProblems(ok)).toEqual([]);
  });

  it('a) exige o fundamento legal e uma explicação concreta (não basta "não gosto")', () => {
    expect(noticeProblems({ ...ok, legalGround: undefined })).toEqual(['legalGround']);
    expect(noticeProblems({ ...ok, legalGround: 'nao-existe' })).toEqual(['legalGround']);
    expect(noticeProblems({ ...ok, explanation: 'Não gosto desta avaliação.' })).toEqual(['explanation']);
    expect(noticeProblems({ ...ok, explanation: ' '.repeat(80) })).toEqual(['explanation']);
    expect(noticeProblems({ ...ok, explanation: 'x'.repeat(NOTICE_MIN_EXPLANATION) })).toEqual([]);
  });

  it('c) exige o nome e o email de quem notifica', () => {
    expect(noticeProblems({ ...ok, contactName: '' })).toEqual(['contactName']);
    expect(noticeProblems({ ...ok, contactEmail: undefined })).toEqual(['contactEmail']);
    expect(noticeProblems({ ...ok, contactEmail: 'não-é-email' })).toEqual(['contactEmail']);
  });

  it('c) exceção: abuso sexual de crianças pode ser notificado sem identificação', () => {
    expect(noticeProblems({ ...ok, legalGround: 'abuso_criancas', contactName: '', contactEmail: '' })).toEqual([]);
  });

  it('d) exige a declaração de boa-fé', () => {
    expect(noticeProblems({ ...ok, goodFaith: false })).toEqual(['goodFaith']);
    expect(noticeProblems({ ...ok, goodFaith: undefined })).toEqual(['goodFaith']);
  });

  it('junta todos os problemas, pela ordem do formulário', () => {
    expect(noticeProblems({})).toEqual(['legalGround', 'explanation', 'contactName', 'contactEmail', 'goodFaith']);
  });
});

describe('LEGAL_GROUNDS', () => {
  it('cada fundamento tem texto em português e em inglês, e há sempre "outro"', () => {
    for (const g of LEGAL_GROUNDS) {
      expect(g.pt).toBeTruthy();
      expect(g.en).toBeTruthy();
    }
    expect(LEGAL_GROUNDS.map((g) => g.id)).toContain('outro');
    expect(new Set(LEGAL_GROUNDS.map((g) => g.id)).size).toBe(LEGAL_GROUNDS.length);
  });
});

describe('contentLocation', () => {
  it('b) endereço exato do conteúdo: a página onde se vê só aquela avaliação ou entrevista', () => {
    expect(contentLocation('https://peekjob.pt/', 'org-1', 'abc')).toBe('https://peekjob.pt/org/org-1/denunciar/abc');
    expect(contentLocation('http://localhost:5173', 'a b', 'c/d')).toBe('http://localhost:5173/org/a%20b/denunciar/c%2Fd');
  });
});
