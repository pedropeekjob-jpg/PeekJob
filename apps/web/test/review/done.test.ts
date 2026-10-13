import { describe, expect, it } from 'vitest';
import { ORG_BY_ID } from '../../src/data/orgs';
import { privateMessagesText, publishedReview, reviewsCountText, totalAfterPublishing, unreadAfterPublishing } from '../../src/features/review/done';

const review = { id: 'a', orgId: 'x', scores: {}, avg: 4, recommend: true, tags: [], text: '', when: 'agora', flagged: false };
const msg = (read: boolean) => ({ id: String(read), orgId: 'x', kinds: [], found: [], when: 'agora', read });

describe('publicado: regras e textos', () => {
  it('encontra a avaliação acabada de publicar', () => {
    expect(publishedReview([review], 'a')).toBe(review);
    expect(publishedReview([review], null)).toBeUndefined();
    expect(publishedReview([review], 'b')).toBeUndefined();
  });

  it('total: o servidor já conta (API); na demonstração soma-se', () => {
    const org = ORG_BY_ID['padaria-ribeira'];
    expect(totalAfterPublishing(org, false)).toBe(24);
    expect(totalAfterPublishing(org, true)).toBe(23);
    expect(totalAfterPublishing(undefined, false)).toBe(1);
    expect(totalAfterPublishing(undefined, true)).toBe(1);
  });

  it('mensagens por ler (pelo menos 1) e textos', () => {
    expect(unreadAfterPublishing([])).toBe(1);
    expect(unreadAfterPublishing([msg(false), msg(true)])).toBe(1);
    expect(privateMessagesText(2)).toBe('2 mensagens privadas');
    expect(reviewsCountText(1)).toBe('1 avaliação');
  });
});
