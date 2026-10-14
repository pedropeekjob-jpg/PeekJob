import { createHmac } from 'crypto';

/** Pseudónimo estável de uma pessoa (HMAC-SHA256). Nunca sai da API. */
export const userRef = (secret: string, userId: string) => createHmac('sha256', secret).update(`user:${userId}`).digest('hex');

/**
 * Pseudónimo de quem gere a página de uma organização: outro espaço do HMAC, para que as tabelas
 * das organizações (pedidos, respostas) não se cruzem com as avaliações da mesma pessoa.
 */
export const memberRef = (secret: string, userId: string) => createHmac('sha256', secret).update(`member:${userId}`).digest('hex');

export const privacySecret = () => {
  const s = process.env.PRIVACY_SECRET;
  if (!s && process.env.NODE_ENV === 'production') throw new Error('PRIVACY_SECRET em falta');
  return s ?? 'dev-only-secret';
};
