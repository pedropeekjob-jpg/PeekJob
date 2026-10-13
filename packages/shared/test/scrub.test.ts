import { describe, expect, it } from 'vitest';
import { scrubText } from '../src/scrub';
import { stripTrailingSlashes } from '../src/routes';

describe('scrubText', () => {
  it.each([
    ['email de ana.silva@empresa.pt falhou', 'email de [email] falhou'],
    ['a@b.co e x.y+z@sub.dominio.pt', '[email] e [email]'],
    ['NIF 500697256 inválido', 'NIF [nif] inválido'],
    ['token=abcdefghijklmnopqrstuvwxyz0123456789ABCD', 'token=[token]'],
    ['https://peekjob.pt/entrar?token=abc&x=1 depois', 'https://peekjob.pt/entrar depois'],
    ['at f (/app/dist/x.js:10:5)', 'at f (/app/dist/x.js:10:5)'],
  ])('%s', (i, o) => expect(scrubText(i)).toBe(o));

  it('texto enorme sem correspondências processa depressa (sem backtracking)', () => {
    const evil = 'a'.repeat(50_000) + '@' + 'b.'.repeat(20_000);
    const t = performance.now();
    scrubText(evil);
    expect(performance.now() - t).toBeLessThan(500);
  });
});

describe('stripTrailingSlashes', () => {
  it.each([
    ['/org/x/', '/org/x'],
    ['/org/x///', '/org/x'],
    ['/', ''],
    ['', ''],
    ['/sobre', '/sobre'],
  ])('%s → %s', (i, o) => expect(stripTrailingSlashes(i)).toBe(o));
});
