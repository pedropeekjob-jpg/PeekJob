import { describe, expect, it } from 'vitest';
import { ORGS } from '../../src/data/orgs';
import { lastMessageWhen, orgNameOf, prefsSummary, settingsLinks, unreadCount, unreadLabel, verificationValue } from '../../src/features/profile/profile';

const msg = (read: boolean, when = 'há 2 dias') => ({ id: String(Math.random()), orgId: 'x', kinds: [], found: [], when, read });

describe('conta: regras e textos', () => {
  it('mensagens por ler e etiqueta (singular/plural)', () => {
    expect(unreadCount([msg(false), msg(true), msg(false)])).toBe(2);
    expect(unreadLabel(1)).toBe('1 mensagem nova');
    expect(unreadLabel(3)).toBe('3 mensagens novas');
    expect(lastMessageWhen([])).toBeUndefined();
    expect(lastMessageWhen([msg(true, 'há 1 mês')])).toBe('há 1 mês');
  });

  it('prioridades resumidas', () => {
    expect(prefsSummary([])).toBe('Escolher');
    expect(prefsSummary(['salario'])).toBe('Salário justo');
    expect(prefsSummary(['salario', 'ambiente', 'equilibrio'])).toBe('Salário justo e mais 2');
  });

  it('nome da organização e verificação', () => {
    expect(orgNameOf(ORGS, 'padaria-ribeira')).toBe('Padaria Ribeira');
    expect(orgNameOf(ORGS, 'nao-existe')).toBe('Organização');
    expect(verificationValue({ verified: 'email', orgId: 'padaria-ribeira' }, ORGS)).toBe('Padaria Ribeira');
    expect(verificationValue({ verified: null, orgId: 'padaria-ribeira' }, ORGS)).toBe('Email ou recibo');
  });

  it('definições: moderação só para quem modera; exportar/apagar só no computador', () => {
    const base = settingsLinks({ verification: 'v', desktop: false, moderator: false });
    expect(base.map((s) => s.to)).toEqual(['/avaliar/verificar', '/metodologia', '/perfil/dados', '/painel']);
    expect(base[2].value).toBeUndefined();
    const all = settingsLinks({ verification: 'v', desktop: true, moderator: true });
    expect(all.at(-1)!.to).toBe('/moderacao');
    expect(all[2].value).toBe('Exportar ou apagar');
  });
});
