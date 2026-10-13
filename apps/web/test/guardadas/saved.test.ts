import { describe, expect, it } from 'vitest';
import { ORG_BY_ID, ORGS } from '../../src/data/orgs';
import { changeNote, orgCount, savedOrgs } from '../../src/features/saved/saved';

describe('guardadas: regras e textos', () => {
  it('mudança: respeito (curto no telemóvel), subida, descida, nova e sem mudanças', () => {
    const rede = ORG_BY_ID['rede-vizinha'];
    expect(changeNote(rede).kind).toBe('respeito');
    expect(changeNote(rede, true).text).toMatch(/^▲ Respeito subiu para/);
    expect(changeNote({ ...rede, scores: { ...rede.scores, respeito: null } }).kind).toBe('up');
    const base = ORGS[1];
    expect(changeNote({ ...base, weekDelta: 0.2 })).toMatchObject({ kind: 'up', text: '▲ 0,2 desde que guardaste' });
    expect(changeNote({ ...base, weekDelta: -0.4 })).toMatchObject({ kind: 'down', aria: 'Desceu 0,4 desde que guardaste' });
    expect(changeNote({ ...base, weekDelta: 0, trend: 'novo' })).toEqual({ kind: 'new', text: 'Nova no ranking' });
    expect(changeNote({ ...base, weekDelta: 0, trend: 1 }).kind).toBe('none');
  });

  it('lista pela ordem guardada, sem as que já não existem; contagem', () => {
    expect(savedOrgs(['oficina-sete', 'nao-existe', 'padaria-ribeira'], ORGS).map((o) => o.id)).toEqual(['oficina-sete', 'padaria-ribeira']);
    expect(orgCount(1)).toBe('1 organização');
    expect(orgCount(2)).toBe('2 organizações');
  });
});
