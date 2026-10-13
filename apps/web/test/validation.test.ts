import { describe, expect, it } from 'vitest';
import { isEmailLike } from '../src/lib/validation';

describe('isEmailLike', () => {
  it.each(['ana@gmail.com', ' ana.silva+trabalho@empresa.co.pt ', 'a@b.pt'])('aceita %s', (e) => expect(isEmailLike(e)).toBe(true));
  it.each(['', 'ana', 'ana@', '@gmail.com', 'ana@gmail', 'ana@gmail.', 'ana@.pt', 'a b@c.pt', 'a@b@c.pt'])('recusa "%s"', (e) => expect(isEmailLike(e)).toBe(false));
});
