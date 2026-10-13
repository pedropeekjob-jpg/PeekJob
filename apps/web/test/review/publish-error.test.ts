import { describe, expect, it } from 'vitest';
import { publishErrorMessage } from '../../src/features/review/useReviewDraft';

describe('publishErrorMessage: o que a pessoa vê quando a publicação falha', () => {
  const fail = (status: number, body: Record<string, unknown> | null = null, message = 'Erro da API') => ({ ok: false as const, status, body, message });

  it('422 com sugestão: explica e oferece a versão sugerida', () => {
    expect(publishErrorMessage(fail(422, { suggestion: 'A chefia grita.' }))).toEqual({
      message: 'Tira nomes de pessoas e insultos. Descreve a situação.',
      suggestion: 'A chefia grita.',
    });
  });
  it('409: já avaliou', () => expect(publishErrorMessage(fail(409)).message).toBe('Já avaliaste esta organização.'));
  it('401: tem de entrar', () => expect(publishErrorMessage(fail(401)).message).toBe('Entra para publicar.'));
  it('outros: a mensagem da API', () => expect(publishErrorMessage(fail(500, null, 'Sem ligação ao servidor.'))).toEqual({ message: 'Sem ligação ao servidor.' }));
});
